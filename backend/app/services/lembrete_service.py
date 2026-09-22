from datetime import datetime
from sqlalchemy.orm import Session
import pandas as pd

from app.services.telefones import candidatos_envio, obter_telefone_envio
from app.services.whatsapp_service import (
    aguardar_entre_envios,
    carregar_imagem_base64,
    deve_checar_conexao,
    enviar_lembrete,
    whatsapp_esta_conectado,
)
from app.services.historico_service import registrar_envio_whatsapp
from app.services.disparo_jobs import deve_parar, finalizar_job
from app.services.config_service import (
    TEMPLATE_LEMBRETE_PADRAO,
    obter_template_lembrete,
    renderizar_mensagem_lembrete,
)
from app.services.planilha_io import (
    celula_texto,
    exigir_coluna_nome_aluno,
    ler_planilha_excel,
    nome_da_linha,
)

TURNOS_VALIDOS = {"MANHA", "TARDE", "NOITE", "TODOS"}

MAPA_TURNO = {
    "manha": "MANHA",
    "manhã": "MANHA",
    "matutino": "MANHA",
    "morning": "MANHA",
    "tarde": "TARDE",
    "vespertino": "TARDE",
    "afternoon": "TARDE",
    "noite": "NOITE",
    "noturno": "NOITE",
    "night": "NOITE",
}

ROTULO_TURNO = {
    "MANHA": "Manhã",
    "TARDE": "Tarde",
    "NOITE": "Noite",
}


def normalizar_turno(valor) -> str | None:
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return None
    texto = str(valor).strip().lower()
    return MAPA_TURNO.get(texto)


def validar_turno(turno: str) -> str:
    chave = (turno or "TODOS").strip().upper()
    if chave not in TURNOS_VALIDOS:
        raise ValueError("Turno inválido. Use MANHA, TARDE, NOITE ou TODOS.")
    return chave


def montar_candidatos_lembrete(
    caminho_arquivo: str,
    turno: str = "TODOS",
    template: str = TEMPLATE_LEMBRETE_PADRAO,
) -> list[dict]:
    turno_filtro = validar_turno(turno)
    df = ler_planilha_excel(caminho_arquivo)
    colunas_nome = exigir_coluna_nome_aluno(df)

    if "Status Contrato" in df.columns:
        df = df[df["Status Contrato"] == "Ativo"]

    candidatos = []

    for _, row in df.iterrows():
        nome = nome_da_linha(row, colunas_nome)
        if not nome:
            continue
        turno_bruto = row.get("Turno")
        turno_norm = normalizar_turno(turno_bruto)

        if turno_filtro != "TODOS" and turno_norm != turno_filtro:
            continue

        tel_aluno = celula_texto(row.get("Telefone Aluno"))
        tel_resp = celula_texto(row.get("Telefone Responsável"))
        canais = candidatos_envio(tel_aluno, tel_resp)
        contato = obter_telefone_envio(tel_aluno, tel_resp)
        turno_label = ROTULO_TURNO.get(
            turno_norm,
            celula_texto(turno_bruto) or "—",
        )

        candidatos.append({
            "nome": nome,
            "turno": turno_norm,
            "turno_label": turno_label,
            "numero": contato["numero"],
            "canal": contato["canal"] if contato["numero"] else None,
            "usou_fallback": contato["usou_fallback"],
            "canais": canais,
            "tel_aluno": tel_aluno,
            "tel_resp": tel_resp,
            "valido": bool(canais),
            "motivo_invalido": None if canais else "Sem telefone válido cadastrado",
            "mensagem": (
                renderizar_mensagem_lembrete(template, nome, turno_label) if canais else None
            ),
        })

    return candidatos


def preview_lembretes_excel(
    caminho_arquivo: str,
    turno: str = "TODOS",
    template: str = TEMPLATE_LEMBRETE_PADRAO,
) -> dict:
    candidatos = montar_candidatos_lembrete(caminho_arquivo, turno, template)
    validos = [c for c in candidatos if c["valido"]]
    invalidos = [c for c in candidatos if not c["valido"]]

    return {
        "turno": validar_turno(turno),
        "total_linhas": len(candidatos),
        "total_validos": len(validos),
        "total_invalidos": len(invalidos),
        "candidatos": candidatos,
    }


def processar_lembretes_excel(
    caminho_arquivo: str,
    db: Session,
    turno: str = "TODOS",
    instance_name: str | None = None,
    caminho_imagem: str | None = None,
    imagem_mimetype: str | None = None,
    imagem_nome: str | None = None,
    job_id: str | None = None,
) -> dict:
    if not instance_name:
        raise ValueError("Instância WhatsApp do usuário não informada.")

    template = obter_template_lembrete(db)
    candidatos = montar_candidatos_lembrete(caminho_arquivo, turno, template)
    resultados_envio = []
    total_sucesso = 0
    total_falha = 0
    cancelado = False
    desconectado = False
    processados = 0

    media_base64 = None
    if caminho_imagem:
        media_base64 = carregar_imagem_base64(caminho_imagem)
        if not media_base64:
            raise ValueError("Não foi possível ler a imagem anexada ao lembrete.")

    try:
        for candidato in candidatos:
            if deve_parar(job_id):
                cancelado = True
                break

            if not candidato["valido"]:
                continue

            if deve_checar_conexao(processados) and not whatsapp_esta_conectado(instance_name):
                desconectado = True
                break

            if processados > 0:
                aguardar_entre_envios(processados)

            canais = candidato.get("canais") or candidatos_envio(
                candidato.get("tel_aluno"), candidato.get("tel_resp")
            )
            enviado = False
            canal_usado = None
            numero_usado = None
            usou_fallback = False

            for canal in canais:
                if enviar_lembrete(
                    canal["numero"],
                    candidato["mensagem"],
                    instance_name,
                    caminho_imagem=caminho_imagem,
                    mimetype=imagem_mimetype,
                    file_name=imagem_nome,
                    media_base64=media_base64,
                ):
                    enviado = True
                    canal_usado = canal["canal"]
                    numero_usado = canal["numero"]
                    usou_fallback = canal["usou_fallback"]
                    break
                canal_usado = canal["canal"]
                numero_usado = canal["numero"]
                usou_fallback = canal["usou_fallback"]

            processados += 1
            status = "SUCESSO" if enviado else "FALHA_AMBOS"
            if enviado:
                total_sucesso += 1
            else:
                total_falha += 1
                # Falha em sequência pode indicar sessão caída — confirma antes de seguir.
                if not whatsapp_esta_conectado(instance_name):
                    desconectado = True
                    # Ainda registra este resultado abaixo, depois encerra.

            texto_historico = candidato["mensagem"]
            if caminho_imagem:
                texto_historico = f"[imagem] {texto_historico}"

            registrar_envio_whatsapp(
                db,
                numero=numero_usado or "",
                canal=canal_usado or "PESSOAL",
                usou_fallback=usou_fallback,
                texto=texto_historico,
                status_final=status,
                nome_destino=candidato["nome"],
            )

            resultados_envio.append({
                "nome": candidato["nome"],
                "turno": candidato["turno_label"],
                "numero": numero_usado,
                "canal": canal_usado,
                "usou_fallback": usou_fallback,
                "status": status,
                "com_imagem": bool(caminho_imagem),
                "horario_envio": datetime.now(),
            })

            if desconectado:
                break
    finally:
        if desconectado:
            finalizar_job(job_id, status="DESCONECTADO")
        else:
            finalizar_job(job_id, cancelado=cancelado)

    return {
        "turno": validar_turno(turno),
        "total_disparados": len(resultados_envio),
        "total_sucesso": total_sucesso,
        "total_falha": total_falha,
        "com_imagem": bool(caminho_imagem),
        "cancelado": cancelado,
        "desconectado": desconectado,
        "detalhes": resultados_envio,
    }
