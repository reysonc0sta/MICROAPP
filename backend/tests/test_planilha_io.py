import pandas as pd
import pytest

from app.services.planilha_io import (
    COLUNAS_OBRIGATORIAS_FALTAS,
    NOMES_COLUNA_REPOSICAO,
    celula_int,
    celula_texto,
    colunas_nome_aluno,
    encontrar_coluna,
    exigir_coluna_faltas,
    exigir_coluna_nome_aluno,
    ler_planilha_excel,
    nome_da_linha,
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


def test_encontrar_coluna_reposicao():
    df = pd.DataFrame({"Nome Aluno": ["Ana"], "Reposição": [1]})
    assert encontrar_coluna(df, NOMES_COLUNA_REPOSICAO) == "Reposição"
    df2 = pd.DataFrame({"Nome Aluno": ["Ana"]})
    assert encontrar_coluna(df2, NOMES_COLUNA_REPOSICAO) is None


def test_colunas_nome_aluno_aceita_aluno_ou_nome_aluno():
    so_aluno = pd.DataFrame({"Aluno": ["Ana"], "Turno": ["Manhã"]})
    assert colunas_nome_aluno(so_aluno) == ["Aluno"]

    so_nome = pd.DataFrame({"Nome Aluno": ["Bruno"]})
    assert colunas_nome_aluno(so_nome) == ["Nome Aluno"]

    ambas = pd.DataFrame({"Nome Aluno": ["Carla"], "Aluno": ["Carla Dias"]})
    assert colunas_nome_aluno(ambas) == ["Nome Aluno", "Aluno"]

    vazia = pd.DataFrame({"Turno": ["Tarde"]})
    assert colunas_nome_aluno(vazia) == []
    with pytest.raises(ValueError, match="Nome Aluno"):
        exigir_coluna_nome_aluno(vazia)


def test_nome_da_linha_prefere_nome_aluno_e_usa_aluno_se_vazio():
    ambas = pd.DataFrame({"Nome Aluno": [None, "Eva"], "Aluno": ["Diego", "Ignorado"]})
    colunas = colunas_nome_aluno(ambas)
    assert nome_da_linha(ambas.iloc[0], colunas) == "Diego"
    assert nome_da_linha(ambas.iloc[1], colunas) == "Eva"


def test_exigir_faltas_e_aluno_sem_nome_aluno():
    df = pd.DataFrame({"Aluno": ["Ana"], "Faltas": [3]})
    assert exigir_coluna_nome_aluno(df) == ["Aluno"]
    assert exigir_coluna_faltas(df) == "Faltas"
    validar_colunas(df, COLUNAS_OBRIGATORIAS_FALTAS)


def test_validar_colunas_falta_obrigatoria():
    df = pd.DataFrame({"Nome Aluno": ["Ana"]})
    with pytest.raises(ValueError, match="Faltas"):
        validar_colunas(df, COLUNAS_OBRIGATORIAS_FALTAS)


def test_ler_planilha_excel_xlsx(planilha_faltas):
    df = ler_planilha_excel(planilha_faltas)
    assert "Nome Aluno" in df.columns
    assert "Faltas" in df.columns
    validar_colunas(df, COLUNAS_OBRIGATORIAS_FALTAS)
