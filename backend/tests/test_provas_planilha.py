import pandas as pd
import pytest

from app.services.provas_planilha import processar_planilha_pos_prova


def _gravar_planilha(tmp_path, linhas, nome="historico.xlsx"):
    caminho = tmp_path / nome
    pd.DataFrame(linhas).to_excel(caminho, index=False, header=False)
    return str(caminho)


CABECALHO = ["Aluno", "Ocorrência", "Descrição", "Status"]


@pytest.fixture
def planilha_pos_prova(tmp_path):
    return _gravar_planilha(
        tmp_path,
        [
            ["Histórico de Contratos", None, None, None],
            [None, None, None, None],
            CABECALHO,
            [
                "  Maria Silva  ",
                "Pós prova",
                "Módulo: Power BiProva: 10,0Aluno realizou a prova corretamente. Parabéns!",
                "Ativo",
            ],
            ["Maria Silva", "Matrícula", "não deve entrar", "Ativo"],
            [
                "Maria Silva",
                "pós prova",
                "Windows 11nota: 9,0book: pendenteAPROVADO",
                "Ativo",
            ],
            [
                "João",
                "  PÓS  prova ",
                "Google ADSNota: 10,0APROVADAobs: Exímia de aluna, fez uma prova perfeita!",
                "Ativo",
            ],
            [
                "Ana",
                "Pós prova",
                "Módulo: Excel avançado IProva:7,0Módulo: Excel Avançado IIProva: 7,5Aluna teve dificuldades...",
                "Ativo",
            ],
        ],
    )


def test_detecta_cabecalho_na_linha_3(planilha_pos_prova):
    resultado = processar_planilha_pos_prova(planilha_pos_prova)
    assert resultado["total_alunos"] == 3
    assert resultado["total_ocorrencias"] == 4
    assert [a["nome"] for a in resultado["alunos"]] == ["Maria Silva", "João", "Ana"]


def test_agrupa_por_nome_trim_e_mantem_primeira_ocorrencia(planilha_pos_prova):
    maria = processar_planilha_pos_prova(planilha_pos_prova)["alunos"][0]
    assert maria["nome"] == "Maria Silva"
    assert [p["materia"] for p in maria["provas"]] == ["Power Bi", "Windows 11"]
    assert [p["nota_exibicao"] for p in maria["provas"]] == ["10,0", "9,0"]


def test_filtra_apenas_pos_prova(planilha_pos_prova):
    resultado = processar_planilha_pos_prova(planilha_pos_prova)
    materias = [p["materia"] for a in resultado["alunos"] for p in a["provas"]]
    assert "não deve entrar" not in materias


def test_duas_provas_na_mesma_descricao(planilha_pos_prova):
    ana = processar_planilha_pos_prova(planilha_pos_prova)["alunos"][2]
    assert ana["nome"] == "Ana"
    assert [(p["materia"], p["nota_exibicao"]) for p in ana["provas"]] == [
        ("Excel avançado I", "7,0"),
        ("Excel Avançado II", "7,5"),
    ]


def test_nao_agrupa_mesmo_nome_com_caixa_diferente(tmp_path):
    caminho = _gravar_planilha(
        tmp_path,
        [
            CABECALHO,
            ["Maria Silva", "Pós prova", "Windows 11nota: 9,0", None],
            ["maria silva", "Pós prova", "Google ADSNota: 10,0", None],
        ],
    )
    resultado = processar_planilha_pos_prova(caminho)
    assert resultado["total_alunos"] == 2
    assert [a["nome"] for a in resultado["alunos"]] == ["Maria Silva", "maria silva"]


def test_falha_sem_colunas_obrigatorias(tmp_path):
    caminho = _gravar_planilha(
        tmp_path,
        [
            ["Histórico de Contratos", None],
            ["Nome", "Obs"],
            ["Ana", "texto"],
        ],
    )
    with pytest.raises(ValueError, match="Ocorrência"):
        processar_planilha_pos_prova(caminho)


def test_falha_sem_linha_pos_prova(tmp_path):
    caminho = _gravar_planilha(
        tmp_path,
        [
            CABECALHO,
            ["Ana", "Matrícula", "Módulo: Power BiProva: 10,0", None],
        ],
    )
    with pytest.raises(ValueError, match="Pós prova"):
        processar_planilha_pos_prova(caminho)
