import asyncio
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import get_current_user
from app.models.domain import Usuario
from app.services.config_service import obter_template_lembrete, obter_template_mensagem
from app.services.historico_service import registrar_envio_whatsapp
from app.services.lembrete_service import (
    TURNOS_VALIDOS,
    preview_lembretes_excel,
    processar_lembretes_excel,
)
from app.services.reposicao_service import (
    preview_disparos_faltas_excel,
    processar_disparos_faltas_excel,
)
from app.services.telefones import limpar_telefone
from app.services.whatsapp_service import (
    conectar_whatsapp,
    disparar_mensagem_real,
    exigir_whatsapp_conectado,
    obter_estado_conexao,
    whatsapp_esta_conectado,
)

router = APIRouter()

EXTENSOES_PLANILHA = {".xls", ".xlsx"}


class EnviarDiretoBody(BaseModel):
    numero: str = Field(..., min_length=8, description="Número com DDI/DDD, ex: 5511999999999")
    texto: str = Field(..., min_length=1, description="Mensagem a ser enviada")


def _validar_planilha(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido.")
    sufixo = Path(file.filename).suffix.lower()
    if sufixo not in EXTENSOES_PLANILHA:
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido (.xls ou .xlsx).")
    return sufixo


async def _salvar_upload_seguro(file: UploadFile) -> str:
    sufixo = _validar_planilha(file)
    fd, path = tempfile.mkstemp(prefix="microapp_", suffix=sufixo)
    os.close(fd)
    try:
        with open(path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                buffer.write(chunk)
    except Exception:
        if os.path.exists(path):
            os.remove(path)
        raise
    return path


def _job_disparar_faltas(caminho: str) -> None:
    db = SessionLocal()
    try:
        processar_disparos_faltas_excel(caminho, db)
    finally:
        db.close()
        if os.path.exists(caminho):
            os.remove(caminho)


def _job_disparar_lembretes(caminho: str, turno: str) -> None:
    db = SessionLocal()
    try:
        processar_lembretes_excel(caminho, db, turno)
    finally:
        db.close()
        if os.path.exists(caminho):
            os.remove(caminho)


@router.get("/status")
def status_whatsapp(_: Usuario = Depends(get_current_user)):
    estado = obter_estado_conexao()
    conectado = whatsapp_esta_conectado()
    return {
        "state": "open" if conectado else estado,
        "instance": {"state": "open" if conectado else estado},
        "conectado": conectado,
    }


@router.get("/conectar")
def conectar(forcar: bool = False, _: Usuario = Depends(get_current_user)):
    """Consulta/cria a instância hub_escola e retorna o QR Code (base64) para conexão."""
    return conectar_whatsapp(forcar_novo=forcar)


@router.post("/enviar-direto")
def enviar_direto(body: EnviarDiretoBody, _: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dispara uma mensagem individual via Evolution API."""
    exigir_whatsapp_conectado()
    numero = limpar_telefone(body.numero)
    if not numero:
        raise HTTPException(status_code=400, detail="Número de telefone inválido.")

    enviado = disparar_mensagem_real(numero, body.texto)
    registrar_envio_whatsapp(
        db,
        numero=numero,
        canal="PESSOAL",
        usou_fallback=False,
        texto=body.texto,
        status_final="SUCESSO" if enviado else "FALHA_AMBOS",
    )
    if not enviado:
        raise HTTPException(
            status_code=502,
            detail="Falha ao enviar mensagem pela Evolution API. Verifique a conexão e tente novamente.",
        )
    return {
        "sucesso": True,
        "numero": numero,
        "mensagem": "Mensagem enviada com sucesso.",
    }


@router.post("/preview-planilha")
async def preview_planilha(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Lê a planilha e devolve a lista de quem receberia mensagem, sem disparar nada."""
    temp_path = await _salvar_upload_seguro(file)
    try:
        template = obter_template_mensagem(db)
        resultado = await asyncio.to_thread(preview_disparos_faltas_excel, temp_path, template)
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
    _: Usuario = Depends(get_current_user),
):
    """Prévia dos alunos do turno selecionado que receberiam o lembrete."""
    turno_norm = (turno or "TODOS").strip().upper()
    if turno_norm not in TURNOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Turno inválido. Use MANHA, TARDE, NOITE ou TODOS.")

    temp_path = await _salvar_upload_seguro(file)
    try:
        template = obter_template_lembrete(db)
        resultado = await asyncio.to_thread(preview_lembretes_excel, temp_path, turno_norm, template)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {
        "nome_arquivo": file.filename,
        **resultado,
    }


@router.post("/disparar-lembretes", status_code=202)
async def disparar_lembretes(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    turno: str = Form("TODOS"),
    _: Usuario = Depends(get_current_user),
):
    exigir_whatsapp_conectado()

    turno_norm = (turno or "TODOS").strip().upper()
    if turno_norm not in TURNOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Turno inválido. Use MANHA, TARDE, NOITE ou TODOS.")

    temp_path = await _salvar_upload_seguro(file)
    background_tasks.add_task(_job_disparar_lembretes, temp_path, turno_norm)

    return {
        "mensagem": f"Lembretes do turno {turno_norm} iniciados em segundo plano. O histórico será gravado no banco.",
        "status": "PROCESSANDO",
        "nome_arquivo": file.filename,
        "turno": turno_norm,
    }


@router.post("/upload-planilha", status_code=202)
async def upload_planilha(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    _: Usuario = Depends(get_current_user),
):
    exigir_whatsapp_conectado()
    temp_path = await _salvar_upload_seguro(file)
    background_tasks.add_task(_job_disparar_faltas, temp_path)
    return {
        "mensagem": "Disparo de reposição iniciado em segundo plano. O histórico será gravado no banco.",
        "status": "PROCESSANDO",
        "nome_arquivo": file.filename,
    }


@router.post("/disparar-reposicoes", status_code=202)
async def disparar_reposicoes(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    _: Usuario = Depends(get_current_user),
):
    exigir_whatsapp_conectado()
    temp_path = await _salvar_upload_seguro(file)
    background_tasks.add_task(_job_disparar_faltas, temp_path)
    return {
        "mensagem": "Disparo de reposição iniciado em segundo plano. O histórico será gravado no banco.",
        "status": "PROCESSANDO",
        "nome_arquivo": file.filename,
    }
