from unittest.mock import MagicMock, patch

from app.services.reposicao_service import (
    MIN_FALTAS_DISPARO,
    calcular_faltas_reais,
    montar_candidatos_disparo,
    processar_disparos_faltas_excel,
)


def test_minimo_de_faltas_para_disparo():
    assert MIN_FALTAS_DISPARO == 2


def test_calcular_faltas_reais():
    assert calcular_faltas_reais(5, 2) == 3
    assert calcular_faltas_reais(3, 3) == 0
    assert calcular_faltas_reais(2, 4) == 0
    assert calcular_faltas_reais(4, 0) == 4


def test_montar_candidatos_filtra_faltas_contrato_e_telefone(planilha_faltas):
    candidatos = montar_candidatos_disparo(planilha_faltas)

    nomes = [c["nome"] for c in candidatos]
    assert "Ana Silva" in nomes
    assert "Bruno Costa" not in nomes
    assert "Carla Dias" not in nomes
    assert "Diego Lima" not in nomes

    ana = next(c for c in candidatos if c["nome"] == "Ana Silva")
    assert ana["faltas"] == 3
    assert ana["faltas_planilha"] == 3
    assert ana["reposicao"] == 0
    assert ana["valido"] is True
    assert ana["numero"] == "5511987654321"
    assert ana["mensagem"]


def test_montar_candidatos_usa_faltas_menos_reposicao(tmp_path):
    import pandas as pd

    caminho = tmp_path / "faltas_reposicao.xlsx"
    pd.DataFrame(
        {
            "Nome Aluno": ["Eva Souza", "Fabio Nunes"],
            "Faltas": [5, 4],
            "Reposição": [2, 3],
            "Status Contrato": ["Ativo", "Ativo"],
            "Telefone Aluno": ["11987654321", "11911112222"],
        }
    ).to_excel(caminho, index=False)

    candidatos = montar_candidatos_disparo(str(caminho))
    nomes = [c["nome"] for c in candidatos]
    assert "Eva Souza" in nomes
    assert "Fabio Nunes" not in nomes

    eva = next(c for c in candidatos if c["nome"] == "Eva Souza")
    assert eva["faltas_planilha"] == 5
    assert eva["reposicao"] == 2
    assert eva["faltas"] == 3
    assert "3 falta" in eva["mensagem"]


def test_processar_disparos_grava_historico_sem_banco_real(planilha_faltas, db_mock):
    with (
        patch("app.services.reposicao_service.obter_template_mensagem", return_value="Olá, {nome}! {faltas} falta(s)."),
        patch("app.services.reposicao_service.disparar_mensagem_real", return_value=True) as disparar,
        patch("app.services.reposicao_service.registrar_envio_whatsapp") as registrar,
    ):
        resultado = processar_disparos_faltas_excel(planilha_faltas, db_mock, "user_1")

    assert resultado["total_disparados"] == 1
    assert resultado["total_sucesso"] == 1
    assert resultado["detalhes"][0]["status"] == "SUCESSO"
    disparar.assert_called()
    registrar.assert_called()
    assert registrar.call_args.kwargs["nome_destino"] == "Ana Silva"
    assert registrar.call_args.kwargs["status_final"] == "SUCESSO"
