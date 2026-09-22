from unittest.mock import patch

from app.services.disparo_jobs import cancelar_job, criar_job, deve_parar, finalizar_job, obter_job
from app.services.whatsapp_service import aguardar_entre_envios, deve_checar_conexao


def test_criar_e_cancelar_job():
    job_id = criar_job(7, "lembretes")
    assert deve_parar(job_id) is False

    job = cancelar_job(job_id, 7)
    assert job.status == "CANCELADO"
    assert deve_parar(job_id) is True


def test_cancelar_job_outro_usuario_nega():
    job_id = criar_job(1, "faltas")
    try:
        cancelar_job(job_id, 99)
        assert False, "deveria negar"
    except PermissionError:
        pass


def test_finalizar_job_respeita_cancelamento():
    job_id = criar_job(3, "lembretes")
    cancelar_job(job_id, 3)
    finalizar_job(job_id, cancelado=False)
    assert obter_job(job_id).status == "CANCELADO"


def test_finalizar_job_desconectado():
    job_id = criar_job(4, "lembretes")
    finalizar_job(job_id, status="DESCONECTADO")
    assert obter_job(job_id).status == "DESCONECTADO"


def test_aguardar_entre_envios_respeita_delay_e_lote():
    with (
        patch("app.services.whatsapp_service.settings") as cfg,
        patch("app.services.whatsapp_service.time.sleep") as sleep,
        patch("app.services.whatsapp_service.random.randint", return_value=500),
    ):
        cfg.WHATSAPP_DELAY_ENTRE_MS = 1000
        cfg.WHATSAPP_DELAY_JITTER_MS = 500
        cfg.WHATSAPP_PAUSA_LOTE_A_CADA = 2
        cfg.WHATSAPP_PAUSA_LOTE_MS = 3000

        aguardar_entre_envios(0)
        sleep.assert_not_called()

        aguardar_entre_envios(1)
        sleep.assert_called_once_with(1.5)

        sleep.reset_mock()
        aguardar_entre_envios(2)
        assert sleep.call_count == 2
        assert sleep.call_args_list[0].args[0] == 1.5
        assert sleep.call_args_list[1].args[0] == 3.0


def test_deve_checar_conexao():
    with patch("app.services.whatsapp_service.settings") as cfg:
        cfg.WHATSAPP_CHECK_CONEXAO_A_CADA = 0
        assert deve_checar_conexao(0) is False

        cfg.WHATSAPP_CHECK_CONEXAO_A_CADA = 10
        assert deve_checar_conexao(0) is True
        assert deve_checar_conexao(5) is False
        assert deve_checar_conexao(10) is True
