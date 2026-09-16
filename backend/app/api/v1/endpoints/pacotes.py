import asyncio
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_cargos
from app.core.validacao_arquivo import calcular_sha256, validar_magic_number_xlsx
from app.models.domain import Usuario
from app.schemas.schemas import RelatorioPacotesOut
from app.services.auditoria import registrar_log
from app.services.pacotes_calculo import processar_planilha_pacotes

router = APIRouter()
pacotes_deps = Depends(require_cargos("ADM", "DIRETOR", "PROFESSOR", "ASSISTENTE"))

EXTENSOES_PLANILHA = {".xls", ".xlsx"}


def _validar_planilha(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido (.xls ou .xlsx).")
    sufixo = Path(file.filename).suffix.lower()
    if sufixo not in EXTENSOES_PLANILHA:
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido (.xls ou .xlsx).")
    return sufixo


async def _salvar_upload_seguro(file: UploadFile) -> str:
    sufixo = _validar_planilha(file)
    fd, path = tempfile.mkstemp(prefix="microapp_pacotes_", suffix=sufixo)
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

    if sufixo == ".xlsx":
        try:
            validar_magic_number_xlsx(path)
        except ValueError as exc:
            os.remove(path)
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    return path


@router.post("/upload", response_model=RelatorioPacotesOut)
async def upload_planilha_pacotes(
    file: UploadFile = File(...),
    usuario: Usuario = pacotes_deps,
    db: Session = Depends(get_db),
):
    """Calcula previsto vs realizado por aluno. Não persiste e não exige aluno cadastrado."""
    temp_path = await _salvar_upload_seguro(file)
    hash_arquivo = calcular_sha256(temp_path)
    try:
        relatorio = await asyncio.to_thread(processar_planilha_pacotes, temp_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    registrar_log(
        db,
        usuario=usuario,
        acao="UPLOAD",
        entidade="pacote",
        entidade_id=None,
        descricao=f'Processou planilha de gestão de pacotes "{file.filename}"',
        valor_novo={"nome_arquivo": file.filename, "sha256": hash_arquivo},
    )
    return relatorio
