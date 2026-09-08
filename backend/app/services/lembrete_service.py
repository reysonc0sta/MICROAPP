from datetime import datetime
from sqlalchemy.orm import Session
import pandas as pd
from app.services.telefones import obter_telefone_envio
from app.services.whatsapp_service import disparar_mensagem_real
from app.services.config_service import (
    TEMPLATE_LEMBRETE_PADRAO,
    obter_template_lembrete,
    renderizar_mensagem_lembrete,
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
    """
    Lê a mesma planilha do Hub Escola e monta candidatos ao lembrete.
    Diferente das faltas: inclui todos os contratos ativos (não filtra por faltas),
    e permite filtrar por turno.
    """
    turno_filtro = validar_turno(turno)
    df = pd.read_excel(caminho_arquivo)
    df = df.dropna(subset=["Nome Aluno"])

    if "Status Contrato" in df.columns:
        df = df[df["Status Contrato"] == "Ativo"]

    candidatos = []

    for _, row in df.iterrows():
        nome = str(row["Nome Aluno"]).strip()
        turno_bruto = row.get("Turno")
        turno_norm = normalizar_turno(turno_bruto)

        if turno_filtro != "TODOS":
            if turno_norm != turno_filtro:
                continue

        tel_aluno = row.get("Telefone Aluno")
        tel_resp = row.get("Telefone Responsável")
        contato = obter_telefone_envio(tel_aluno, tel_resp)
        turno_label = ROTULO_TURNO.get(turno_norm, str(turno_bruto).strip() if turno_bruto is not None and not pd.isna(turno_bruto) else "—")

        candidatos.append({
            "nome": nome,
            "turno": turno_norm,
            "turno_label": turno_label,
            "numero": contato["numero"],
            "canal": contato["canal"] if contato["numero"] else None,
            "usou_fallback": contato["usou_fallback"],
            "valido": bool(contato["numero"]),
            "motivo_invalido": None if contato["numero"] else "Sem telefone válido cadastrado",
            "mensagem": (
                renderizar_mensagem_lembrete(template, nome, turno_label)
                if contato["numero"]
                else None
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


def processar_lembretes_excel(caminho_arquivo: str, db: Session, turno: str = "TODOS") -> dict:
    template = obter_template_lembrete(db)
    candidatos = montar_candidatos_lembrete(caminho_arquivo, turno, template)
    resultados_envio = []

    for candidato in candidatos:
        if not candidato["valido"]:
            continue

        enviado = disparar_mensagem_real(candidato["numero"], candidato["mensagem"])
        resultados_envio.append({
            "nome": candidato["nome"],
            "turno": candidato["turno_label"],
            "numero": candidato["numero"],
            "canal": candidato["canal"],
            "status": "ENVIADO" if enviado else "FALHA",
            "horario_envio": datetime.now(),
        })

    return {
        "turno": validar_turno(turno),
        "total_disparados": len(resultados_envio),
        "detalhes": resultados_envio,
    }
