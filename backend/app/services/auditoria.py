import json
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.domain import LogAuditoria, Usuario

TZ_SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def agora_sao_paulo() -> datetime:
    return datetime.now(TZ_SAO_PAULO).replace(tzinfo=None)


def snapshot_usuario(usuario: Usuario) -> str:
    nome = (usuario.nome or "").strip() or "Usuário"
    email = (usuario.email or "").strip()
    texto = f"{nome} ({email})" if email else nome
    return texto[:255]


def _serializar_valor(valor) -> str | None:
    if valor is None:
        return None
    if isinstance(valor, str):
        return valor
    return json.dumps(valor, ensure_ascii=False, default=str)


def registrar_log(
    db: Session,
    usuario: Usuario,
    acao: str,
    entidade: str | None,
    entidade_id: int | None,
    descricao: str,
    valor_anterior=None,
    valor_novo=None,
) -> LogAuditoria:
    log = LogAuditoria(
        usuario_id=usuario.id if usuario else None,
        usuario_nome=snapshot_usuario(usuario) if usuario else "Sistema",
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        descricao=descricao,
        valor_anterior=_serializar_valor(valor_anterior),
        valor_novo=_serializar_valor(valor_novo),
        data_hora=agora_sao_paulo(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
