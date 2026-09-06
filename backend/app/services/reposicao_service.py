import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.services.telefones import obter_telefone_envio
from app.services.whatsapp_service import disparar_mensagem_real
from app.services.config_service import (
    TEMPLATE_PADRAO,
    obter_template_mensagem,
    renderizar_mensagem,
)


def montar_candidatos_disparo(caminho_arquivo: str, template: str = TEMPLATE_PADRAO) -> list[dict]:
    """
    Lê a planilha de controle e monta a lista de candidatos ao disparo,
    sem enviar nenhuma mensagem. Usado tanto pelo preview quanto pelo
    disparo real, para garantir que os dois mostrem exatamente a mesma coisa.
    """
    df = pd.read_excel(caminho_arquivo)
    df = df.dropna(subset=['Nome Aluno'])

    if 'Status Contrato' in df.columns:
        df = df[df['Status Contrato'] == 'Ativo']

    com_faltas = df[df['Faltas'] > 0]

    candidatos = []

    for _, row in com_faltas.iterrows():
        nome = str(row['Nome Aluno']).strip()
        faltas = int(row['Faltas'])
        tel_aluno = row.get('Telefone Aluno')
        tel_resp = row.get('Telefone Responsável')

        contato = obter_telefone_envio(tel_aluno, tel_resp)

        candidatos.append({
            "nome": nome,
            "faltas": faltas,
            "numero": contato["numero"],
            "canal": contato["canal"] if contato["numero"] else None,
            "usou_fallback": contato["usou_fallback"],
            "valido": bool(contato["numero"]),
            "motivo_invalido": None if contato["numero"] else "Sem telefone válido cadastrado",
            "mensagem": renderizar_mensagem(template, nome, faltas) if contato["numero"] else None,
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


def processar_disparos_faltas_excel(caminho_arquivo: str, db: Session):
    """
    Lê a planilha de controle, filtra contratos ativos com faltas > 0,
    e envia o alerta de reposição (com o template configurado) para cada
    candidato com telefone válido.
    """
    template = obter_template_mensagem(db)
    candidatos = montar_candidatos_disparo(caminho_arquivo, template)
    resultados_envio = []

    for candidato in candidatos:
        if not candidato["valido"]:
            continue

        enviado = disparar_mensagem_real(candidato["numero"], candidato["mensagem"])
        resultados_envio.append({
            "nome": candidato["nome"],
            "numero": candidato["numero"],
            "canal": candidato["canal"],
            "status": "ENVIADO" if enviado else "FALHA",
            "respondido": False,
            "horario_envio": datetime.now()
        })

    return {
        "total_disparados": len(resultados_envio),
        "detalhes": resultados_envio
    }