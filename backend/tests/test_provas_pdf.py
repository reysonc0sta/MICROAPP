import inspect
import re

from app.services.provas_pdf import TITULO_RELATORIO, gerar_pdf_pos_prova

RELATORIO = {
    "alunos": [
        {
            "nome": "Maria Silva",
            "provas": [
                {"materia": "Power Bi", "nota": 10.0, "nota_exibicao": "10,0"},
                {"materia": "Windows 11", "nota": 9.0, "nota_exibicao": "9,0"},
            ],
        },
        {
            "nome": "Joao",
            "provas": [
                {"materia": "Google ADS", "nota": 10.0, "nota_exibicao": "10,0"},
            ],
        },
        {
            "nome": "Ana",
            "provas": [
                {"materia": None, "nota": None, "nota_exibicao": None},
            ],
        },
    ],
    "total_alunos": 3,
    "total_ocorrencias": 4,
}


def _texto_pdf(pdf: bytes) -> str:
    bruto = pdf.decode("latin-1")
    return re.sub(r"\\([0-3][0-7]{2})", lambda m: chr(int(m.group(1), 8)), bruto)


def test_pdf_comeca_com_assinatura_e_contem_dados():
    pdf = gerar_pdf_pos_prova(RELATORIO, gerado_em="14/09/2026 16:12")
    assert pdf.startswith(b"%PDF")
    texto = _texto_pdf(pdf)
    assert TITULO_RELATORIO in texto
    assert "14/09/2026 16:12" in texto
    assert "Maria Silva" in texto
    assert "Power Bi" in texto
    assert "10,0" in texto
    assert "Windows 11" in texto
    assert "Joao" in texto
    assert "Google ADS" in texto
    assert "não identificada" in texto


def test_pdf_nao_reprocessa_planilha():
    params = inspect.signature(gerar_pdf_pos_prova).parameters
    assert "caminho" not in params
    assert "caminho_arquivo" not in params


def test_pdf_vazio_nao_quebra():
    pdf = gerar_pdf_pos_prova(
        {"alunos": [], "total_alunos": 0, "total_ocorrencias": 0},
        gerado_em="14/09/2026 16:12",
    )
    assert pdf.startswith(b"%PDF")
    assert "Nenhum aluno" in _texto_pdf(pdf)
