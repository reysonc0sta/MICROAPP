from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.domain import Aluno
from app.schemas.schemas import AlunoCreate, AlunoOut

router = APIRouter()

@router.post("/", response_model=AlunoOut)
def criar_aluno(dados: AlunoCreate, db: Session = Depends(get_db)):
    novo_aluno = Aluno(**dados.model_dump())
    db.add(novo_aluno)
    db.commit()
    db.refresh(novo_aluno)
    return novo_aluno

@router.get("/", response_model=List[AlunoOut])
def listar_alunos(db: Session = Depends(get_db)):
    return db.query(Aluno).all()