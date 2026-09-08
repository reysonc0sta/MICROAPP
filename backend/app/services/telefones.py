import re


def limpar_telefone(numero: str | None) -> str | None:
    """Normaliza para E.164 BR (55 + DDD + número). Retorna None se inválido."""
    if not numero:
        return None

    digitos = re.sub(r"\D", "", str(numero))
    if not digitos:
        return None

    # Remove zero inicial de tronco (ex.: 0119...)
    if digitos.startswith("0") and len(digitos) in (11, 12):
        digitos = digitos.lstrip("0")

    if digitos.startswith("55") and len(digitos) in (12, 13):
        return digitos

    if len(digitos) in (10, 11):
        return "55" + digitos

    return None


def obter_telefone_envio(telefone_pessoal: str | None, telefone_comercial: str | None) -> dict:
    """Compat: retorna o primeiro canal disponível (preview)."""
    candidatos = candidatos_envio(telefone_pessoal, telefone_comercial)
    if not candidatos:
        return {"numero": None, "canal": "PESSOAL", "usou_fallback": False}
    return candidatos[0]


def candidatos_envio(telefone_pessoal: str | None, telefone_comercial: str | None) -> list[dict]:
    """Lista ordenada pessoal → comercial para retry em caso de falha no envio."""
    pessoal = limpar_telefone(telefone_pessoal)
    comercial = limpar_telefone(telefone_comercial)
    out: list[dict] = []

    if pessoal:
        out.append({"numero": pessoal, "canal": "PESSOAL", "usou_fallback": False})
    if comercial and comercial != pessoal:
        out.append({
            "numero": comercial,
            "canal": "COMERCIAL",
            "usou_fallback": bool(pessoal),
        })
    return out
