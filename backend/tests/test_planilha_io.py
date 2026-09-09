import pandas as pd
import pytest

from app.services.planilha_io import (
    COLUNAS_OBRIGATORIAS_FALTAS,
    celula_int,
    celula_texto,
    ler_planilha_excel,
    validar_colunas,
)


def test_celula_texto_limpa_e_trata_nan():
    assert celula_texto("  Ana  ") == "Ana"
    assert celula_texto(None) is None
    assert celula_texto(float("nan")) is None
    assert celula_texto("nan") is None


def test_celula_int_converte_e_usa_default():
    assert celula_int("3") == 3
    assert celula_int(4.0) == 4
    assert celula_int(None) == 0
    assert celula_int("abc", default=7) == 7


def test_validar_colunas_falta_obrigatoria():
    df = pd.DataFrame({"Nome Aluno": ["Ana"]})
    with pytest.raises(ValueError, match="Faltas"):
        validar_colunas(df, COLUNAS_OBRIGATORIAS_FALTAS)


def test_ler_planilha_excel_xlsx(planilha_faltas):
    df = ler_planilha_excel(planilha_faltas)
    assert "Nome Aluno" in df.columns
    assert "Faltas" in df.columns
    validar_colunas(df, COLUNAS_OBRIGATORIAS_FALTAS)
