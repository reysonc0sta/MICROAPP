import calendar
import logging
import unicodedata
from datetime import date, datetime, timedelta
from math import floor
from zoneinfo import ZoneInfo

import holidays

from app.services.pacotes_parser import PacoteLinha, parsear_planilha_pacotes

logger = logging.getLogger(__name__)

TZ_SAO_PAULO = ZoneInfo("America/Sao_Paulo")

GRUPO_SEG_QUA = frozenset({"SEGUNDA", "QUARTA"})
GRUPO_TER_QUI = frozenset({"TERCA", "QUINTA"})
GRUPO_SABADO = frozenset({"SABADO"})

DIA_WEEKDAY = {
    "SEGUNDA": calendar.MONDAY,
    "TERCA": calendar.TUESDAY,
    "QUARTA": calendar.WEDNESDAY,
    "QUINTA": calendar.THURSDAY,
    "SABADO": calendar.SATURDAY,
}

NOMES_FERIADOS_FIXOS = {
    (1, 1): "Confraternização Universal",
    (4, 21): "Tiradentes",
    (5, 1): "Dia do Trabalho",
    (9, 7): "Independência do Brasil",
    (10, 12): "Nossa Senhora Aparecida",
    (11, 2): "Finados",
    (11, 15): "Proclamação da República",
    (11, 20): "Consciência Negra",
    (12, 25): "Natal",
}

ROTULOS_GRUPO = {
    "seg_qua": "Seg/Qua",
    "ter_qui": "Ter/Qui",
    "sabado": "Sábado",
}


def _normalizar_nome_feriado(nome: str) -> str:
    nfd = unicodedata.normalize("NFD", nome)
    sem_acento = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return " ".join(sem_acento.casefold().split())


def _pascoa(ano: int) -> date:
    """Algoritmo anônimo gregoriano — fallback se a lib holidays não devolver a Sexta-feira Santa."""
    a = ano % 19
    b = ano // 100
    c = ano % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = ((h + l - 7 * m + 114) % 31) + 1
    return date(ano, mes, dia)


def _sexta_feira_santa(ano: int) -> date:
    br = holidays.country_holidays("BR", years=ano)
    for dia, nome in br.items():
        chave = _normalizar_nome_feriado(str(nome))
        if "sexta-feira santa" in chave or "good friday" in chave or "paixao de cristo" in chave:
            return dia
    return _pascoa(ano) - timedelta(days=2)


def feriados_federais(ano: int) -> list[tuple[date, str]]:
    """Nacionais obrigatórios. Carnaval e Corpus Christi ficam de fora de propósito."""
    itens: list[tuple[date, str]] = [
        (date(ano, mes, dia), nome) for (mes, dia), nome in NOMES_FERIADOS_FIXOS.items()
    ]
    sexta = _sexta_feira_santa(ano)
    itens.append((sexta, "Sexta-feira Santa"))
    itens.sort(key=lambda item: item[0])
    return itens


def classificar_grupo(dias: list[str]) -> str | None:
    conjunto = frozenset(dias)
    if not conjunto:
        return None
    if conjunto <= GRUPO_SEG_QUA:
        return "seg_qua"
    if conjunto <= GRUPO_TER_QUI:
        return "ter_qui"
    if conjunto <= GRUPO_SABADO:
        return "sabado"
    return None


def _ocorrencias_no_mes(ano: int, mes: int, weekday: int, feriados: set[date]) -> int:
    _, total_dias = calendar.monthrange(ano, mes)
    total = 0
    for dia in range(1, total_dias + 1):
        atual = date(ano, mes, dia)
        if atual.weekday() == weekday and atual not in feriados:
            total += 1
    return total


def _status(realizada: int, previsto: int) -> tuple[str, int]:
    diferenca = previsto - realizada
    if realizada < previsto:
        return "Atrasado", diferenca
    if realizada == previsto:
        return "Em dia", 0
    return "Adiantado", diferenca


def _aluno_base(linha: PacoteLinha, aviso: str | None = None) -> dict:
    return {
        "nome": linha["nome"],
        "educador": linha["educador"],
        "dias_agendamento": linha["dias_agendamento"],
        "dias_normalizados": list(linha["dias_normalizados"]),
        "horas_agendamento": linha["horas_agendamento"],
        "qtd_realizada": linha["qtd_realizada"],
        "qtd_agendamento": linha["qtd_agendamento"] if linha["qtd_agendamento"] is not None else 0,
        "qtd_aula_extra": linha["qtd_aula_extra"],
        "aulas_por_ocorrencia_do_dia": None,
        "total_previsto_mes": None,
        "previsto_ate_hoje": None,
        "status": None,
        "diferenca": None,
        "aviso": aviso,
    }


def calcular_relatorio_pacotes(
    linhas: list[PacoteLinha],
    hoje: date | None = None,
) -> dict:
    agora = hoje or datetime_sao_paulo().date()
    ano, mes = agora.year, agora.month
    dia_atual = agora.day
    dias_totais_mes = calendar.monthrange(ano, mes)[1]

    feriados_ano = feriados_federais(ano)
    feriados_mes = [(d, nome) for d, nome in feriados_ano if d.month == mes]
    feriados_set = {d for d, _ in feriados_mes}

    grupos = {"seg_qua": [], "ter_qui": [], "sabado": []}
    nao_agrupados: list[dict] = []
    avisos: list[dict] = []

    for linha in linhas:
        grupo = classificar_grupo(linha["dias_normalizados"])
        if linha["dias_desconhecidos"]:
            grupo = None
        avisos_linha: list[str] = []

        if linha["dias_desconhecidos"]:
            avisos_linha.append(
                "Dia(s) de agendamento não reconhecido(s): "
                + ", ".join(linha["dias_desconhecidos"])
            )
        if grupo is None:
            if linha["dias_normalizados"] and not linha["dias_desconhecidos"]:
                avisos_linha.append(
                    "Combinação de dias fora dos grupos Seg/Qua, Ter/Qui ou Sábado: "
                    + (linha["dias_agendamento"] or "")
                )
            elif not linha["dias_normalizados"]:
                avisos_linha.append("Dias de agendamento vazios ou inválidos.")

        qtd = linha["qtd_agendamento"]
        num_dias = len(linha["dias_normalizados"])
        divisivel = (
            qtd is not None
            and num_dias > 0
            and qtd >= 0
            and qtd % num_dias == 0
            and not linha["dias_desconhecidos"]
            and grupo is not None
        )

        if qtd is None:
            avisos_linha.append("Qtd Agendamento ausente ou inválida.")
        elif num_dias == 0:
            pass
        elif qtd % num_dias != 0:
            msg = (
                f"Qtd Agendamento ({qtd}) não é divisível pelo número de dias "
                f"({num_dias})."
            )
            avisos_linha.append(msg)
            logger.warning("Aluno %s: %s", linha["nome"], msg)

        aluno = _aluno_base(linha, aviso="; ".join(avisos_linha) if avisos_linha else None)

        if divisivel:
            aulas_por_dia = qtd // num_dias
            total_previsto = 0
            for dia_canonico in linha["dias_normalizados"]:
                weekday = DIA_WEEKDAY[dia_canonico]
                total_previsto += aulas_por_dia * _ocorrencias_no_mes(
                    ano, mes, weekday, feriados_set
                )
            previsto_hoje = floor(total_previsto * (dia_atual / dias_totais_mes))
            status, diferenca = _status(linha["qtd_realizada"], previsto_hoje)
            aluno["aulas_por_ocorrencia_do_dia"] = aulas_por_dia
            aluno["total_previsto_mes"] = total_previsto
            aluno["previsto_ate_hoje"] = previsto_hoje
            aluno["status"] = status
            aluno["diferenca"] = diferenca

        if avisos_linha:
            avisos.append(
                {
                    "nome": linha["nome"],
                    "educador": linha["educador"],
                    "motivo": aluno["aviso"],
                }
            )

        if grupo is None:
            nao_agrupados.append(aluno)
        else:
            grupos[grupo].append(aluno)

    return {
        "ano": ano,
        "mes": mes,
        "dia_atual": dia_atual,
        "dias_totais_mes": dias_totais_mes,
        "feriados_aplicados": [
            {"data": d.isoformat(), "nome": nome} for d, nome in feriados_mes
        ],
        "grupos": grupos,
        "nao_agrupados": nao_agrupados,
        "avisos": avisos,
        "total_alunos": len(linhas),
        "rotulos_grupo": ROTULOS_GRUPO,
    }


def datetime_sao_paulo() -> datetime:
    return datetime.now(TZ_SAO_PAULO)


def processar_planilha_pacotes(caminho_arquivo: str) -> dict:
    linhas = parsear_planilha_pacotes(caminho_arquivo)
    return calcular_relatorio_pacotes(linhas)
