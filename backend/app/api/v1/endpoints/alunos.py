from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_cargos
from app.models.domain import Aluno, AlunoMateria, Materia, Usuario
from app.schemas.schemas import AlunoCreate, AlunoOut, MateriaOut, MateriaVinculo, PaginatedAlunos

router = APIRouter()
grade_deps = Depends(require_cargos("ADM", "DIRETOR", "PROFESSOR"))
leitura_deps = Depends(require_cargos("ADM", "DIRETOR", "PROFESSOR", "ASSISTENTE", "ANALISTA"))
cadastro_deps = Depends(require_cargos("ADM", "DIRETOR", "PROFESSOR", "ASSISTENTE"))


def _obter_aluno_ou_404(db: Session, aluno_id: int) -> Aluno:
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    return aluno


@router.post("/", response_model=AlunoOut)
def criar_aluno(
    dados: AlunoCreate,
    db: Session = Depends(get_db),
    _: Usuario = cadastro_deps,
):
    novo_aluno = Aluno(**dados.model_dump())
    db.add(novo_aluno)
    db.commit()
    db.refresh(novo_aluno)
    return novo_aluno


@router.get("/", response_model=PaginatedAlunos)
def listar_alunos(
    db: Session = Depends(get_db),
    _: Usuario = leitura_deps,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = db.query(Aluno)
    total = query.count()
    items = query.order_by(Aluno.nome.asc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{aluno_id}", response_model=AlunoOut)
def obter_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return _obter_aluno_ou_404(db, aluno_id)


@router.get("/{aluno_id}/materias", response_model=List[MateriaOut])
def listar_grade_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    _obter_aluno_ou_404(db, aluno_id)
    return (
        db.query(Materia)
        .join(AlunoMateria, AlunoMateria.materia_id == Materia.id)
        .filter(AlunoMateria.aluno_id == aluno_id)
        .order_by(Materia.nome.asc())
        .all()
    )


@router.post("/{aluno_id}/materias", response_model=MateriaOut)
def vincular_materia(
    aluno_id: int,
    dados: MateriaVinculo,
    db: Session = Depends(get_db),
    _: Usuario = grade_deps,
):
    _obter_aluno_ou_404(db, aluno_id)
    materia = db.query(Materia).filter(Materia.id == dados.materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Matéria não encontrada.")

    existente = (
        db.query(AlunoMateria)
        .filter(AlunoMateria.aluno_id == aluno_id, AlunoMateria.materia_id == dados.materia_id)
        .first()
    )
    if existente:
        raise HTTPException(status_code=400, detail="Esta matéria já está na grade do aluno.")

    db.add(AlunoMateria(aluno_id=aluno_id, materia_id=dados.materia_id))
    db.commit()
    return materia
