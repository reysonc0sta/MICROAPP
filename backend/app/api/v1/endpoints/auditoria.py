from datetime import date, datetime, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_cargos
from app.models.domain import LogAuditoria, Usuario
from app.schemas.schemas import PaginatedAuditoria

router = APIRouter()
admin_deps = Depends(require_cargos("ADM"))


@router.get("/", response_model=PaginatedAuditoria)
def listar_auditoria(
    db: Session = Depends(get_db),
    _: Usuario = admin_deps,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    usuario_id: int | None = Query(None),
    entidade: str | None = Query(None),
    acao: str | None = Query(None),
    data_inicio: date | None = Query(None),
    data_fim: date | None = Query(None),
):
    query = db.query(LogAuditoria)

    if usuario_id is not None:
        query = query.filter(LogAuditoria.usuario_id == usuario_id)
    if entidade:
        query = query.filter(LogAuditoria.entidade == entidade.strip())
    if acao:
        query = query.filter(LogAuditoria.acao == acao.strip().upper())
    if data_inicio is not None:
        query = query.filter(LogAuditoria.data_hora >= datetime.combine(data_inicio, time.min))
    if data_fim is not None:
        query = query.filter(LogAuditoria.data_hora <= datetime.combine(data_fim, time.max))

    total = query.count()
    items = (
        query.order_by(LogAuditoria.data_hora.desc(), LogAuditoria.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}
