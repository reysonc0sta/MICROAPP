from unittest.mock import MagicMock, patch

from app.services.reposicao_service import MIN_FALTAS_DISPARO, montar_candidatos_disparo, processar_disparos_faltas_excel


def test_minimo_de_faltas_para_disparo():
    assert MIN_FALTAS_DISPARO == 2


def test_montar_candidatos_filtra_faltas_contrato_e_telefone(planilha_faltas):
    candidatos = montar_candidatos_disparo(planilha_faltas)

    nomes = [c["nome"] for c in candidatos]
    assert "Ana Silva" in nomes
    assert "Bruno Costa" not in nomes
    assert "Carla Dias" not in nomes

    ana = next(c for c in candidatos if c["nome"] == "Ana Silva")
    assert ana["faltas"] == 3
    assert ana["valido"] is True
    assert ana["numero"] == "5511987654321"
    assert ana["mensagem"]


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
