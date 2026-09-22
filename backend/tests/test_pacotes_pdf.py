import inspect
import re

from app.services.pacotes_pdf import TITULO_RELATORIO, gerar_pdf_pacotes

RELATORIO = {
    "ano": 2026,
    "mes": 9,
    "dia_atual": 17,
    "dias_totais_mes": 30,
    "feriados_aplicados": [{"data": "2026-09-07", "nome": "Independência do Brasil"}],
    "grupos": {
        "seg_qua": [
            {
                "nome": "Maria Silva",
                "educador": "Ana",
                "dias_agendamento": "Segunda-Feira,Quarta-Feira",
                "qtd_realizada": 4,
                "total_previsto_mes": 8,
                "previsto_ate_hoje": 4,
                "status": "Em dia",
                "diferenca": 0,
            }
        ],
        "ter_qui": [],
        "sabado": [
            {
                "nome": "Joao",
                "educador": None,
                "dias_agendamento": "Sábado",
                "qtd_realizada": 1,
                "total_previsto_mes": 4,
                "previsto_ate_hoje": 2,
                "status": "Atrasado",
                "diferenca": 1,
            }
        ],
    },
    "nao_agrupados": [],
    "avisos": [],
    "total_alunos": 2,
    "rotulos_grupo": {},
}


def _texto_pdf(pdf: bytes) -> str:
    bruto = pdf.decode("latin-1")
    return re.sub(r"\\([0-3][0-7]{2})", lambda m: chr(int(m.group(1), 8)), bruto)


def test_pdf_pacotes_contem_dados():
    pdf = gerar_pdf_pacotes(RELATORIO, gerado_em="17/09/2026 08:30")
    assert pdf.startswith(b"%PDF")
    texto = _texto_pdf(pdf)
    assert TITULO_RELATORIO in texto
    assert "17/09/2026 08:30" in texto
    assert "Maria Silva" in texto
    assert "Joao" in texto
    assert "Segunda / Quarta" in texto
    assert "Independ" in texto


def test_pdf_pacotes_nao_reprocessa_planilha():
    params = inspect.signature(gerar_pdf_pacotes).parameters
    assert "caminho" not in params
    assert "caminho_arquivo" not in params
