import asyncio
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_cargos
from app.models.domain import ProvaResultado, AlunoMateria, Usuario
from app.schemas.schemas import LancarNota, ProvaOut, RelatorioPosProvaOut
from app.services.provas_pdf import gerar_pdf_pos_prova
from app.services.provas_planilha import processar_planilha_pos_prova

router = APIRouter()
relatorio_deps = Depends(require_cargos("ADM", "DIRETOR", "PROFESSOR", "ASSISTENTE"))


@router.get("/", response_model=List[ProvaOut])
def listar_provas(
    aluno_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = db.query(ProvaResultado)
    if aluno_id is not None:
        query = query.filter(ProvaResultado.aluno_id == aluno_id)
    return query.order_by(ProvaResultado.data_realizacao.desc()).all()


@router.post("/lancar", response_model=ProvaOut)
def lancar_nota(
    dados: LancarNota,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_cargos("ADM", "DIRETOR", "PROFESSOR")),
):
    vinculo = db.query(AlunoMateria).filter(
        AlunoMateria.aluno_id == dados.aluno_id,
        AlunoMateria.materia_id == dados.materia_id,
    ).first()

    if not vinculo:
        raise HTTPException(status_code=400, detail="Aluno não possui esta matéria vinculada na grade.")

    total_tentativas = db.query(ProvaResultado).filter(
        ProvaResultado.aluno_id == dados.aluno_id,
        ProvaResultado.materia_id == dados.materia_id,
    ).count()

    nova_prova = ProvaResultado(
        aluno_id=dados.aluno_id,
        materia_id=dados.materia_id,
        nota=dados.nota,
        tentativa=total_tentativas + 1,
    )
    db.add(nova_prova)
    db.commit()
    db.refresh(nova_prova)
    return nova_prova


async def _salvar_upload_xlsx(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido (.xlsx).")
    if Path(file.filename).suffix.lower() != ".xlsx":
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido (.xlsx).")

    fd, path = tempfile.mkstemp(prefix="microapp_provas_", suffix=".xlsx")
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


@router.post("/upload", response_model=RelatorioPosProvaOut)
async def upload_planilha_pos_prova(
    file: UploadFile = File(...),
    _: Usuario = relatorio_deps,
):
    """Extrai Pós prova de um Histórico de Contratos. Não persiste e não exige aluno cadastrado."""
    temp_path = await _salvar_upload_xlsx(file)
    try:
        return await asyncio.to_thread(processar_planilha_pos_prova, temp_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/exportar-pdf")
async def exportar_pdf_pos_prova(
    dados: RelatorioPosProvaOut,
    _: Usuario = relatorio_deps,
):
    """Gera o PDF a partir do JSON já extraído. Não relê planilha e não persiste."""
    pdf = await asyncio.to_thread(gerar_pdf_pos_prova, dados.model_dump())
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="relatorio-pos-prova.pdf"',
        },
    )
