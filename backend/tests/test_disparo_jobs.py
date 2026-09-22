from app.services.disparo_jobs import cancelar_job, criar_job, deve_parar, finalizar_job, obter_job


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
