from datetime import datetime
from io import BytesIO
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

TITULO_RELATORIO = "Relatório de Gestão de Pacotes"
COR_TITULO = colors.HexColor("#1e3a5f")
COR_CABECALHO = colors.HexColor("#1e3a5f")
COR_ZEBRA = colors.HexColor("#f1f5f9")

GRUPOS = (
    ("seg_qua", "Segunda / Quarta"),
    ("ter_qui", "Terça / Quinta"),
    ("sabado", "Sábado"),
)


def gerar_pdf_pacotes(relatorio: dict, gerado_em: str | None = None) -> bytes:
    """Monta o PDF a partir do JSON já processado (não relê a planilha)."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title=TITULO_RELATORIO,
        author="MICROAPP",
        pageCompression=0,
    )

    estilo_titulo = ParagraphStyle(
        "TituloPacotes",
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=COR_TITULO,
        spaceAfter=4,
        leading=20,
    )
    estilo_meta = ParagraphStyle(
        "MetaPacotes",
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#475569"),
        spaceAfter=2,
        leading=12,
    )
    estilo_grupo = ParagraphStyle(
        "GrupoPacotes",
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=COR_TITULO,
        spaceBefore=10,
        spaceAfter=4,
        leading=14,
    )
    estilo_vazio = ParagraphStyle(
        "VazioPacotes",
        fontName="Helvetica-Oblique",
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        spaceBefore=4,
        leading=12,
    )
    estilo_celula = ParagraphStyle(
        "CelulaPacotes",
        fontName="Helvetica",
        fontSize=8,
        textColor=colors.HexColor("#0f172a"),
        leading=10,
    )

    data = gerado_em or _data_geracao()
    grupos = relatorio.get("grupos") or {}
    nao_agrupados = relatorio.get("nao_agrupados") or []
    feriados = relatorio.get("feriados_aplicados") or []
    total_alunos = relatorio.get("total_alunos", 0)
    dia = relatorio.get("dia_atual")
    mes = relatorio.get("mes")
    ano = relatorio.get("ano")
    dias_mes = relatorio.get("dias_totais_mes")

    story = [
        Paragraph(TITULO_RELATORIO, estilo_titulo),
        Paragraph(f"Gerado em {data}", estilo_meta),
        Paragraph(
            f"{total_alunos} aluno(s) · referência {_data_ref(dia, mes, ano)}"
            + (f" · previsto até hoje = floor(previsto no mês × {dia}/{dias_mes})" if dia and dias_mes else ""),
            estilo_meta,
        ),
        Paragraph(_linha_feriados(feriados), estilo_meta),
        Spacer(1, 4),
    ]

    algum = False
    for chave, titulo in GRUPOS:
        alunos = grupos.get(chave) or []
        story.append(Paragraph(f"{titulo} ({len(alunos)})", estilo_grupo))
        if not alunos:
            story.append(Paragraph("Nenhum aluno neste grupo.", estilo_vazio))
        else:
            algum = True
            story.append(_tabela_alunos(alunos, estilo_celula))

    if nao_agrupados:
        algum = True
        story.append(
            Paragraph(f"Não classificados ({len(nao_agrupados)})", estilo_grupo)
        )
        story.append(_tabela_alunos(nao_agrupados, estilo_celula))

    if not algum and not any(grupos.get(chave) for chave, _ in GRUPOS):
        story.append(Paragraph("Nenhum aluno no relatório.", estilo_vazio))

    doc.build(story)
    return buffer.getvalue()


def _data_geracao() -> str:
    try:
        agora = datetime.now(ZoneInfo("America/Sao_Paulo"))
    except Exception:
        agora = datetime.now()
    return agora.strftime("%d/%m/%Y %H:%M")


def _data_ref(dia, mes, ano) -> str:
    if not all((dia, mes, ano)):
        return "—"
    return f"{int(dia):02d}/{int(mes):02d}/{ano}"


def _linha_feriados(feriados: list[dict]) -> str:
    if not feriados:
        return "Feriados neste mês (sem aula): nenhum."
    partes = []
    for item in feriados:
        data = str(item.get("data") or "")
        if len(data) >= 10:
            data = f"{data[8:10]}/{data[5:7]}/{data[0:4]}"
        partes.append(f"{data} — {item.get('nome') or ''}".strip(" —"))
    return "Feriados neste mês (sem aula): " + "; ".join(partes)


def _escapar(texto: str) -> str:
    return (
        str(texto)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _celula(valor, estilo) -> Paragraph:
    if valor is None or valor == "":
        texto = "—"
    else:
        texto = str(valor)
    return Paragraph(_escapar(texto), estilo)


def _rotulo_status(aluno: dict) -> str:
    status = aluno.get("status")
    aviso = aluno.get("aviso")
    if not status:
        return "Sem cálculo" if aviso else "—"
    if status == "Atrasado":
        return f"Atrasado · déficit {aluno.get('diferenca')}"
    if status == "Adiantado":
        return f"Adiantado · {abs(aluno.get('diferenca') or 0)}"
    return "Em dia"


def _tabela_alunos(alunos: list[dict], estilo_celula: ParagraphStyle) -> Table:
    cabecalho = [
        "Aluno",
        "Educador",
        "Dias Agendamento",
        "Realizada",
        "Prev. mês",
        "Prev. hoje",
        "Status",
    ]
    dados = [cabecalho]
    for aluno in alunos:
        dados.append(
            [
                _celula(aluno.get("nome"), estilo_celula),
                _celula(aluno.get("educador"), estilo_celula),
                _celula(aluno.get("dias_agendamento"), estilo_celula),
                _celula(aluno.get("qtd_realizada"), estilo_celula),
                _celula(aluno.get("total_previsto_mes"), estilo_celula),
                _celula(aluno.get("previsto_ate_hoje"), estilo_celula),
                _celula(_rotulo_status(aluno), estilo_celula),
            ]
        )

    larguras = [52 * mm, 40 * mm, 48 * mm, 22 * mm, 22 * mm, 22 * mm, 48 * mm]
    tabela = Table(dados, colWidths=larguras, repeatRows=1)
    estilo = [
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BACKGROUND", (0, 0), (-1, 0), COR_CABECALHO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (3, 0), (5, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
    ]
    for i in range(1, len(dados)):
        if i % 2 == 0:
            estilo.append(("BACKGROUND", (0, i), (-1, i), COR_ZEBRA))
    tabela.setStyle(TableStyle(estilo))
    return tabela
