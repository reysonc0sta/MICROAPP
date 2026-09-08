from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import Aluno, Usuario
from app.schemas.schemas import AlunoCreate, AlunoOut

router = APIRouter()


@router.post("/", response_model=AlunoOut)
def criar_aluno(
    dados: AlunoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    novo_aluno = Aluno(**dados.model_dump())
    db.add(novo_aluno)
    db.commit()
    db.refresh(novo_aluno)
    return novo_aluno


@router.get("/", response_model=List[AlunoOut])
def listar_alunos(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return db.query(Aluno).all()
