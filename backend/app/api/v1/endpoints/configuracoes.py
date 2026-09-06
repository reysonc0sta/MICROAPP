from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.services.config_service import (
    obter_configuracao,
    atualizar_template_mensagem,
    renderizar_mensagem,
    PLACEHOLDERS_SUPORTADOS,
)

router = APIRouter()


class TemplateMensagemIn(BaseModel):
    template: str = Field(..., min_length=1, max_length=2000)


class TemplateMensagemOut(BaseModel):
    template: str
    placeholders_suportados: list[str]
    exemplo_renderizado: str

    class Config:
        from_attributes = True


def _montar_saida(template: str) -> TemplateMensagemOut:
    exemplo = renderizar_mensagem(template, "João da Silva", 3)
    return TemplateMensagemOut(
        template=template,
        placeholders_suportados=PLACEHOLDERS_SUPORTADOS,
        exemplo_renderizado=exemplo,
    )


@router.get("/mensagem", response_model=TemplateMensagemOut)
def obter_mensagem(db: Session = Depends(get_db)):
    config = obter_configuracao(db)
    return _montar_saida(config.template)


@router.put("/mensagem", response_model=TemplateMensagemOut)
def atualizar_mensagem(dados: TemplateMensagemIn, db: Session = Depends(get_db)):
    if "{nome}" not in dados.template:
        raise HTTPException(
            status_code=400,
            detail="O template precisa conter o placeholder {nome}.",
        )

    try:
        renderizar_mensagem(dados.template, "João da Silva", 3)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Template inválido. Use apenas os placeholders {nome} e {faltas}.",
        )

    config = atualizar_template_mensagem(db, dados.template)
    return _montar_saida(config.template)