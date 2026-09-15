import re
from typing import TypedDict

ANCORA_MODULO = re.compile(r"(?i)m[oó]dulo\s*:")
PREFIXO_PROVA_REALIZADA = re.compile(r"(?i)^\s*prova\s+realizada\s*!\s*")
ROTULO_NOTA = re.compile(r"(?i)(?:prova|nota)\s*:\s*([\d]+(?:[,.]\d+)?)")
INICIO_ROTULO_NOTA = re.compile(r"(?i)(?:prova|nota)\s*:")
FIM_BLOCO = re.compile(
    r"(?i)(?:livro|book|m[eé]dia)\s*:|aprovad[oa]|reprovad[oa]"
)


class ProvaExtraida(TypedDict):
    materia: str | None
    nota: float | None
    nota_exibicao: str | None


def parse_provas(descricao: str | None) -> list[ProvaExtraida]:
    """Extrai matéria e nota de um texto livre de ocorrência Pós prova.

    Nunca lança: descrições vazias viram lista vazia; falhas parciais
    devolvem o que foi possível identificar (campos None).
    """
    if descricao is None:
        return []
    texto = str(descricao).strip()
    if not texto:
        return []

    if ANCORA_MODULO.search(texto):
        blocos = ANCORA_MODULO.split(texto)
        provas = [_parse_bloco(bloco) for bloco in blocos[1:] if bloco.strip()]
        return provas or [_prova_incompleta()]

    texto = PREFIXO_PROVA_REALIZADA.sub("", texto, count=1).strip()
    if not texto:
        return [_prova_incompleta()]
    return [_parse_bloco(texto)]


def _parse_bloco(bloco: str) -> ProvaExtraida:
    nota_exibicao, nota = _extrair_nota(bloco)
    materia = _extrair_materia(bloco)
    return {
        "materia": materia,
        "nota": nota,
        "nota_exibicao": nota_exibicao,
    }


def _extrair_nota(bloco: str) -> tuple[str | None, float | None]:
    match = ROTULO_NOTA.search(bloco)
    if not match:
        return None, None
    bruto = match.group(1)
    try:
        valor = float(bruto.replace(",", "."))
    except ValueError:
        return bruto, None
    return bruto, valor


def _extrair_materia(bloco: str) -> str | None:
    corte = INICIO_ROTULO_NOTA.search(bloco)
    if corte:
        bruto = bloco[: corte.start()]
    else:
        fim = FIM_BLOCO.search(bloco)
        bruto = bloco[: fim.start()] if fim else bloco
    materia = re.sub(r"\s+", " ", bruto).strip(" :-")
    return materia or None


def _prova_incompleta() -> ProvaExtraida:
    return {"materia": None, "nota": None, "nota_exibicao": None}
