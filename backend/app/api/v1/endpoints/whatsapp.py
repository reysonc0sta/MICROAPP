from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
import shutil
import os
from app.core.database import get_db
from app.services.config_service import obter_template_mensagem, obter_template_lembrete
from app.services.reposicao_service import (
    preview_disparos_faltas_excel,
    processar_disparos_faltas_excel,
)
from app.services.lembrete_service import (
    preview_lembretes_excel,
    processar_lembretes_excel,
    TURNOS_VALIDOS,
)
from pydantic import BaseModel, Field
from app.services.whatsapp_service import (
    conectar_whatsapp,
    disparar_mensagem_real,
    exigir_whatsapp_conectado,
    obter_estado_conexao,
    whatsapp_esta_conectado,
)

router = APIRouter()


class EnviarDiretoBody(BaseModel):
    numero: str = Field(..., min_length=8, description="Número com DDI/DDD, ex: 5511999999999")
    texto: str = Field(..., min_length=1, description="Mensagem a ser enviada")


@router.get("/status")
def status_whatsapp():
    estado = obter_estado_conexao()
    conectado = whatsapp_esta_conectado()
    return {
        "state": "open" if conectado else estado,
        "instance": {"state": "open" if conectado else estado},
        "conectado": conectado,
    }


@router.get("/conectar")
def conectar(forcar: bool = False):
    """Consulta/cria a instância hub_escola e retorna o QR Code (base64) para conexão."""
    return conectar_whatsapp(forcar_novo=forcar)


@router.post("/enviar-direto")
def enviar_direto(body: EnviarDiretoBody):
    """Dispara uma mensagem individual via Evolution API."""
    exigir_whatsapp_conectado()
    enviado = disparar_mensagem_real(body.numero, body.texto)
    if not enviado:
        raise HTTPException(
            status_code=502,
            detail="Falha ao enviar mensagem pela Evolution API. Verifique a conexão e tente novamente.",
        )
    return {
        "sucesso": True,
        "numero": body.numero,
        "mensagem": "Mensagem enviada com sucesso.",
    }


@router.post("/preview-planilha")
async def preview_planilha(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Lê a planilha e devolve a lista de quem receberia mensagem, sem disparar nada."""
    if not file.filename or not file.filename.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido.")

    temp_path = f"temp_preview_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        template = obter_template_mensagem(db)
        resultado = preview_disparos_faltas_excel(temp_path, template)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {
        "nome_arquivo": file.filename,
        **resultado,
    }


@router.post("/preview-lembretes")
async def preview_lembretes(
    file: UploadFile = File(...),
    turno: str = Form("TODOS"),
    db: Session = Depends(get_db),
):
    """Prévia dos alunos do turno selecionado que receberiam o lembrete."""
    if not file.filename or not file.filename.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido.")

    turno_norm = (turno or "TODOS").strip().upper()
    if turno_norm not in TURNOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Turno inválido. Use MANHA, TARDE, NOITE ou TODOS.")

    temp_path = f"temp_preview_lembrete_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        template = obter_template_lembrete(db)
        resultado = preview_lembretes_excel(temp_path, turno_norm, template)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {
        "nome_arquivo": file.filename,
        **resultado,
    }


@router.post("/disparar-lembretes")
async def disparar_lembretes(
    file: UploadFile = File(...),
    turno: str = Form("TODOS"),
    db: Session = Depends(get_db),
):
    exigir_whatsapp_conectado()

    if not file.filename or not file.filename.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido.")

    turno_norm = (turno or "TODOS").strip().upper()
    if turno_norm not in TURNOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Turno inválido. Use MANHA, TARDE, NOITE ou TODOS.")

    temp_path = f"temp_lembrete_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        resultado = processar_lembretes_excel(temp_path, db, turno_norm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {
        "mensagem": f"Lembretes do turno {turno_norm} disparados com sucesso!",
        "nome_arquivo": file.filename,
        "total_registros_identificados": resultado.get("total_disparados", 0),
        "dados": resultado,
    }


@router.post("/upload-planilha")
async def upload_planilha(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    exigir_whatsapp_conectado()
    return _processar_planilha(file, db)


@router.post("/disparar-reposicoes")
async def disparar_reposicoes(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    exigir_whatsapp_conectado()
    return _processar_planilha(file, db)


def _processar_planilha(file: UploadFile, db: Session):
    if not file.filename or not file.filename.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido.")

    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        resultado = processar_disparos_faltas_excel(temp_path, db)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {
        "mensagem": "Automação de reposição de faltas executada com sucesso!",
        "nome_arquivo": file.filename,
        "total_registros_identificados": resultado.get("total_disparados", 0),
        "dados": resultado,
    }
