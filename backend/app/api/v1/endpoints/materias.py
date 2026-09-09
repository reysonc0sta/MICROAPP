from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_cargos
from app.models.domain import Materia, AlunoMateria, ProvaResultado, Usuario
from app.schemas.schemas import MateriaCreate, MateriaUpdate, MateriaOut

router = APIRouter()
admin_deps = Depends(require_cargos("ADM", "DIRETOR"))


def _obter_materia_ou_404(db: Session, materia_id: int) -> Materia:
    materia = db.query(Materia).filter(Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Matéria não encontrada.")
    return materia


def _nome_normalizado(nome: str) -> str:
    valor = (nome or "").strip()
    if len(valor) < 2:
        raise HTTPException(status_code=400, detail="O nome da matéria deve ter no mínimo 2 caracteres.")
    return valor


@router.get("/", response_model=List[MateriaOut])
def listar_materias(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return db.query(Materia).order_by(Materia.nome.asc()).all()


@router.get("/{materia_id}", response_model=MateriaOut)
def obter_materia(
    materia_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return _obter_materia_ou_404(db, materia_id)


@router.post("/", response_model=MateriaOut, status_code=status.HTTP_201_CREATED)
def criar_materia(
    dados: MateriaCreate,
    db: Session = Depends(get_db),
    _: Usuario = admin_deps,
):
    nova = Materia(nome=_nome_normalizado(dados.nome))
    db.add(nova)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Já existe uma matéria com este nome.") from exc
    db.refresh(nova)
    return nova


@router.patch("/{materia_id}", response_model=MateriaOut)
def atualizar_materia(
    materia_id: int,
    dados: MateriaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = admin_deps,
):
    materia = _obter_materia_ou_404(db, materia_id)
    payload = dados.model_dump(exclude_unset=True)
    if "nome" not in payload:
        return materia

    materia.nome = _nome_normalizado(payload["nome"])
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Já existe uma matéria com este nome.") from exc
    db.refresh(materia)
    return materia


@router.delete("/{materia_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_materia(
    materia_id: int,
    db: Session = Depends(get_db),
    _: Usuario = admin_deps,
):
    materia = _obter_materia_ou_404(db, materia_id)

    vinculos = db.query(AlunoMateria).filter(AlunoMateria.materia_id == materia_id).count()
    provas = db.query(ProvaResultado).filter(ProvaResultado.materia_id == materia_id).count()
    if vinculos or provas:
        raise HTTPException(
            status_code=409,
            detail="Não é possível excluir: a matéria está vinculada a alunos ou provas.",
        )

    db.delete(materia)
    db.commit()
    return None
