from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_cargos
from app.models.domain import ProvaResultado, AlunoMateria, Usuario
from app.schemas.schemas import LancarNota

router = APIRouter()


@router.post("/lancar")
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

    return {
        "mensagem": "Nota registrada com sucesso",
        "tentativa": nova_prova.tentativa,
        "nota": nova_prova.nota,
    }
