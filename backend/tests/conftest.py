import os

os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("EVOLUTION_API_KEY", "test-evolution-key")

import pytest
from unittest.mock import MagicMock


@pytest.fixture
def db_mock():
    return MagicMock()


@pytest.fixture
def planilha_faltas(tmp_path):
    import pandas as pd

    caminho = tmp_path / "faltas.xlsx"
    pd.DataFrame(
        {
            "Nome Aluno": ["Ana Silva", "Bruno Costa", "Carla Dias", ""],
            "Faltas": [3, 1, 4, 5],
            "Status Contrato": ["Ativo", "Ativo", "Inativo", "Ativo"],
            "Telefone Aluno": ["11987654321", "11911112222", "11933334444", "11900000000"],
            "Telefone Responsável": ["1133334444", None, "11955556666", None],
        }
    ).to_excel(caminho, index=False)
    return str(caminho)
