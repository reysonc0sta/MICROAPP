import os

os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("EVOLUTION_API_KEY", "test-evolution-key")
# Sem pausas reais nos testes unitários.
os.environ.setdefault("WHATSAPP_DELAY_ENTRE_MS", "0")
os.environ.setdefault("WHATSAPP_DELAY_JITTER_MS", "0")
os.environ.setdefault("WHATSAPP_PAUSA_LOTE_A_CADA", "0")
os.environ.setdefault("WHATSAPP_PAUSA_LOTE_MS", "0")
os.environ.setdefault("WHATSAPP_CHECK_CONEXAO_A_CADA", "0")

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
            "Nome Aluno": ["Ana Silva", "Bruno Costa", "Carla Dias", "", "Diego Lima"],
            "Faltas": [3, 1, 4, 5, 5],
            "Reposição": [0, 0, 0, 0, 4],
            "Status Contrato": ["Ativo", "Ativo", "Inativo", "Ativo", "Ativo"],
            "Telefone Aluno": ["11987654321", "11911112222", "11933334444", "11900000000", "11977778888"],
            "Telefone Responsável": ["1133334444", None, "11955556666", None, None],
        }
    ).to_excel(caminho, index=False)
    return str(caminho)
