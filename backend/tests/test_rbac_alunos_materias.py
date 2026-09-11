"""RBAC de Alunos, Matérias e lançamento de nota — funções de endpoint + papéis."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import alunos as alunos_ep
from app.api.v1.endpoints import materias as materias_ep
from app.api.v1.endpoints import provas as provas_ep
from app.core.security import require_cargos
from app.schemas.schemas import AlunoCreate, LancarNota, MateriaCreate, MateriaUpdate, MateriaVinculo


def usuario(cargo: str, ativo: bool = True):
    return SimpleNamespace(id=1, cargo=cargo, ativo=ativo, email=f"{cargo.lower()}@escola.com")


CARGOS = ("ADM", "DIRETOR", "PROFESSOR", "ASSISTENTE", "ANALISTA")


def assert_permitido(cargos_ok, cargo):
    dep = require_cargos(*cargos_ok)
    assert dep(usuario(cargo)) is not None


def assert_negado(cargos_ok, cargo):
    dep = require_cargos(*cargos_ok)
    with pytest.raises(HTTPException) as exc:
        dep(usuario(cargo))
    assert exc.value.status_code == 403


@pytest.mark.parametrize("cargo", ["ADM", "DIRETOR", "PROFESSOR", "ASSISTENTE"])
def test_criar_aluno_permitido(cargo):
    assert_permitido(("ADM", "DIRETOR", "PROFESSOR", "ASSISTENTE"), cargo)


def test_criar_aluno_negado_analista():
    assert_negado(("ADM", "DIRETOR", "PROFESSOR", "ASSISTENTE"), "ANALISTA")


@pytest.mark.parametrize("cargo", ["ADM", "DIRETOR", "PROFESSOR"])
def test_vincular_materia_e_lancar_nota_permitido(cargo):
    assert_permitido(("ADM", "DIRETOR", "PROFESSOR"), cargo)


@pytest.mark.parametrize("cargo", ["ASSISTENTE", "ANALISTA"])
def test_vincular_materia_e_lancar_nota_negado(cargo):
    assert_negado(("ADM", "DIRETOR", "PROFESSOR"), cargo)


@pytest.mark.parametrize("cargo", ["ADM", "DIRETOR"])
def test_crud_materias_permitido(cargo):
    assert_permitido(("ADM", "DIRETOR"), cargo)


@pytest.mark.parametrize("cargo", ["PROFESSOR", "ASSISTENTE", "ANALISTA"])
def test_crud_materias_negado(cargo):
    assert_negado(("ADM", "DIRETOR"), cargo)


def test_criar_aluno_persiste():
    db = MagicMock()
    dados = AlunoCreate(nome="Ana", turno="MATUTINO")
    criado = alunos_ep.criar_aluno(dados, db=db, _=usuario("PROFESSOR"))
    db.add.assert_called_once()
    db.commit.assert_called_once()
    db.refresh.assert_called_once()
    assert criado is db.add.call_args[0][0]


def test_vincular_materia_aluno_inexistente():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    with pytest.raises(HTTPException) as exc:
        alunos_ep.vincular_materia(1, MateriaVinculo(materia_id=2), db=db, _=usuario("PROFESSOR"))
    assert exc.value.status_code == 404


def test_lancar_nota_exige_vinculo_na_grade():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    with pytest.raises(HTTPException) as exc:
        provas_ep.lancar_nota(
            LancarNota(aluno_id=1, materia_id=2, nota=8.5),
            db=db,
            _=usuario("PROFESSOR"),
        )
    assert exc.value.status_code == 400
    assert "grade" in exc.value.detail.lower()


def test_lancar_nota_incrementa_tentativa():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = object()
    db.query.return_value.filter.return_value.count.return_value = 1

    prova = provas_ep.lancar_nota(
        LancarNota(aluno_id=1, materia_id=2, nota=7),
        db=db,
        _=usuario("ADM"),
    )
    db.add.assert_called_once()
    db.commit.assert_called_once()
    assert prova.tentativa == 2
    assert prova.nota == 7


def test_criar_materia_normaliza_nome():
    db = MagicMock()
    materia = materias_ep.criar_materia(MateriaCreate(nome="  História  "), db=db, _=usuario("DIRETOR"))
    db.add.assert_called_once()
    assert materia.nome == "História"


def test_criar_materia_nome_curto():
    with pytest.raises(HTTPException) as exc:
        materias_ep._nome_normalizado("A")
    assert exc.value.status_code == 400


def test_atualizar_materia():
    db = MagicMock()
    existente = SimpleNamespace(id=3, nome="Física")
    db.query.return_value.filter.return_value.first.return_value = existente
    atualizada = materias_ep.atualizar_materia(
        3, MateriaUpdate(nome="Física II"), db=db, _=usuario("ADM")
    )
    assert atualizada.nome == "Física II"
    db.commit.assert_called_once()


def test_excluir_materia_bloqueada_quando_vinculada():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(id=3, nome="Química")
    counts = iter([2, 0])
    db.query.return_value.filter.return_value.count.side_effect = lambda: next(counts)
    with pytest.raises(HTTPException) as exc:
        materias_ep.excluir_materia(3, db=db, _=usuario("ADM"))
    assert exc.value.status_code == 409
