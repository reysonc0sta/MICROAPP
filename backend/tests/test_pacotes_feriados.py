from datetime import date

from app.services.pacotes_calculo import feriados_sem_aula, _ocorrencias_no_mes


def test_5_de_setembro_e_feriado_regional_sem_aula():
    feriados = feriados_sem_aula(2026)
    datas = {d: nome for d, nome in feriados}
    assert date(2026, 9, 5) in datas
    assert datas[date(2026, 9, 5)] == "Feriado regional"
    assert date(2026, 9, 7) in datas


def test_sabado_5_de_setembro_nao_conta_ocorrencia():
    feriados = {d for d, _ in feriados_sem_aula(2026) if d.month == 9}
    # 5/9/2026 é sábado; sem o feriado haveria 4 sábados em setembro/2026
    import calendar

    assert date(2026, 9, 5).weekday() == calendar.SATURDAY
    total = _ocorrencias_no_mes(2026, 9, calendar.SATURDAY, feriados)
    assert total == 3
