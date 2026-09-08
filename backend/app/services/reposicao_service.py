from datetime import datetime
from sqlalchemy.orm import Session

from app.services.telefones import candidatos_envio, obter_telefone_envio
from app.services.whatsapp_service import disparar_mensagem_real
from app.services.historico_service import registrar_envio_whatsapp
from app.services.config_service import (
    TEMPLATE_PADRAO,
    obter_template_mensagem,
    renderizar_mensagem,
)
from app.services.planilha_io import (
    COLUNAS_OBRIGATORIAS_FALTAS,
    celula_int,
    celula_texto,
    ler_planilha_excel,
    validar_colunas,
)

MIN_FALTAS_DISPARO = 2


def montar_candidatos_disparo(caminho_arquivo: str, template: str = TEMPLATE_PADRAO) -> list[dict]:
    """
    Lê a planilha de controle e monta a lista de candidatos ao disparo,
    sem enviar nenhuma mensagem. Usado tanto pelo preview quanto pelo
    disparo real, para garantir que os dois mostrem exatamente a mesma coisa.
    """
    df = ler_planilha_excel(caminho_arquivo)
    validar_colunas(df, COLUNAS_OBRIGATORIAS_FALTAS)
    df = df.dropna(subset=["Nome Aluno"])

    if "Status Contrato" in df.columns:
        df = df[df["Status Contrato"] == "Ativo"]

    com_faltas = df[df["Faltas"] >= MIN_FALTAS_DISPARO]
    candidatos = []

    for _, row in com_faltas.iterrows():
        nome = celula_texto(row["Nome Aluno"])
        if not nome:
            continue
        faltas = celula_int(row["Faltas"])
        if faltas < MIN_FALTAS_DISPARO:
            continue
        tel_aluno = celula_texto(row.get("Telefone Aluno"))
        tel_resp = celula_texto(row.get("Telefone Responsável"))
        canais = candidatos_envio(tel_aluno, tel_resp)
        contato = obter_telefone_envio(tel_aluno, tel_resp)

        candidatos.append({
            "nome": nome,
            "faltas": faltas,
            "numero": contato["numero"],
            "canal": contato["canal"] if contato["numero"] else None,
            "usou_fallback": contato["usou_fallback"],
            "canais": canais,
            "tel_aluno": tel_aluno,
            "tel_resp": tel_resp,
            "valido": bool(canais),
            "motivo_invalido": None if canais else "Sem telefone válido cadastrado",
            "mensagem": renderizar_mensagem(template, nome, faltas) if canais else None,
        })

    return candidatos


def preview_disparos_faltas_excel(caminho_arquivo: str, template: str = TEMPLATE_PADRAO) -> dict:
    """Monta o preview da planilha, sem disparar nenhuma mensagem."""
    candidatos = montar_candidatos_disparo(caminho_arquivo, template)
    validos = [c for c in candidatos if c["valido"]]
    invalidos = [c for c in candidatos if not c["valido"]]

    return {
        "total_linhas": len(candidatos),
        "total_validos": len(validos),
        "total_invalidos": len(invalidos),
        "candidatos": candidatos,
    }


def processar_disparos_faltas_excel(
    caminho_arquivo: str,
    db: Session,
    instance_name: str,
) -> dict:
    """
    Lê a planilha, envia alertas com fallback pessoal→comercial e grava histórico.
    """
    template = obter_template_mensagem(db)
    candidatos = montar_candidatos_disparo(caminho_arquivo, template)
    resultados_envio = []
    total_sucesso = 0
    total_falha = 0

    for candidato in candidatos:
        if not candidato["valido"]:
            continue

        canais = candidato.get("canais") or candidatos_envio(
            candidato.get("tel_aluno"), candidato.get("tel_resp")
        )
        enviado = False
        canal_usado = None
        numero_usado = None
        usou_fallback = False

        for canal in canais:
            if disparar_mensagem_real(canal["numero"], candidato["mensagem"], instance_name):
                enviado = True
                canal_usado = canal["canal"]
                numero_usado = canal["numero"]
                usou_fallback = canal["usou_fallback"]
                break
            canal_usado = canal["canal"]
            numero_usado = canal["numero"]
            usou_fallback = canal["usou_fallback"]

        status = "SUCESSO" if enviado else "FALHA_AMBOS"
        if enviado:
            total_sucesso += 1
        else:
            total_falha += 1

        registrar_envio_whatsapp(
            db,
            numero=numero_usado or "",
            canal=canal_usado or "PESSOAL",
            usou_fallback=usou_fallback,
            texto=candidato["mensagem"],
            status_final=status,
            nome_destino=candidato["nome"],
        )

        resultados_envio.append({
            "nome": candidato["nome"],
            "numero": numero_usado,
            "canal": canal_usado,
            "usou_fallback": usou_fallback,
            "status": status,
            "respondido": False,
            "horario_envio": datetime.now(),
        })

    return {
        "total_disparados": len(resultados_envio),
        "total_sucesso": total_sucesso,
        "total_falha": total_falha,
        "detalhes": resultados_envio,
    }
