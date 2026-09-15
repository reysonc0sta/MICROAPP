from datetime import datetime
from io import BytesIO
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

NAO_IDENTIFICADA = "não identificada"
TITULO_RELATORIO = "Relatório de Pós-Prova"
COR_TITULO = colors.HexColor("#1e3a5f")
COR_CABECALHO = colors.HexColor("#1e3a5f")
COR_ZEBRA = colors.HexColor("#f1f5f9")


def gerar_pdf_pos_prova(relatorio: dict, gerado_em: str | None = None) -> bytes:
    """Monta o PDF a partir do JSON já processado (não relê a planilha)."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=TITULO_RELATORIO,
        author="MICROAPP",
        pageCompression=0,
    )

    estilo_titulo = ParagraphStyle(
        "TituloRelatorio",
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=COR_TITULO,
        spaceAfter=4,
        leading=20,
    )
    estilo_meta = ParagraphStyle(
        "MetaRelatorio",
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#475569"),
        spaceAfter=2,
        leading=12,
    )
    estilo_vazio = ParagraphStyle(
        "VazioRelatorio",
        fontName="Helvetica-Oblique",
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceBefore=12,
        leading=14,
    )

    data = gerado_em or _data_geracao()
    alunos = relatorio.get("alunos") or []
    total_alunos = relatorio.get("total_alunos", len(alunos))
    total_ocorrencias = relatorio.get("total_ocorrencias")

    story = [
        Paragraph(TITULO_RELATORIO, estilo_titulo),
        Paragraph(f"Gerado em {data}", estilo_meta),
        Paragraph(_linha_totais(total_alunos, total_ocorrencias), estilo_meta),
        Spacer(1, 8),
    ]

    if not alunos:
        story.append(Paragraph("Nenhum aluno no relatório.", estilo_vazio))
    else:
        story.append(_tabela_alunos(alunos))

    doc.build(story)
    return buffer.getvalue()


def _data_geracao() -> str:
    try:
        agora = datetime.now(ZoneInfo("America/Sao_Paulo"))
    except Exception:
        agora = datetime.now()
    return agora.strftime("%d/%m/%Y %H:%M")


def _linha_totais(total_alunos, total_ocorrencias) -> str:
    partes = [f"{total_alunos} aluno(s)"]
    if total_ocorrencias is not None:
        partes.append(f"{total_ocorrencias} ocorrência(s) de Pós prova")
    return " · ".join(partes)


def _rotulo(valor: str | None) -> str:
    texto = (valor or "").strip()
    return texto or NAO_IDENTIFICADA


def _tabela_alunos(alunos: list[dict]) -> Table:
    dados = [["Aluno", "Matéria", "Nota"]]
    for aluno in alunos:
        provas = aluno.get("provas") or []
        if not provas:
            provas = [{"materia": None, "nota_exibicao": None}]
        primeira = True
        for prova in provas:
            dados.append(
                [
                    aluno.get("nome") or NAO_IDENTIFICADA if primeira else "",
                    _rotulo(prova.get("materia")),
                    _rotulo(prova.get("nota_exibicao")),
                ]
            )
            primeira = False

    tabela = Table(dados, colWidths=[70 * mm, 80 * mm, 28 * mm], repeatRows=1)
    estilo = [
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), COR_CABECALHO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#0f172a")),
        ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
    ]
    for i in range(1, len(dados)):
        if i % 2 == 0:
            estilo.append(("BACKGROUND", (0, i), (-1, i), COR_ZEBRA))
    tabela.setStyle(TableStyle(estilo))
    return tabela
