from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import shutil
import os
from app.core.database import get_db
from app.services.config_service import obter_template_mensagem
from app.services.reposicao_service import (
    preview_disparos_faltas_excel,
    processar_disparos_faltas_excel,
)
from app.services.whatsapp_service import (
    conectar_whatsapp,
    exigir_whatsapp_conectado,
    obter_estado_conexao,
    whatsapp_esta_conectado,
)

router = APIRouter()


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
    return conectar_whatsapp(forcar_novo=forcar)


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