import re

def limpar_telefone(numero: str | None) -> str | None:
    if not numero:
        return None
    num_limpo = re.sub(r'\D', '', str(numero))
    if not num_limpo:
        return None
    if len(num_limpo) in [10, 11]:
        num_limpo = "55" + num_limpo
    return num_limpo

def obter_telefone_envio(telefone_pessoal: str | None, telefone_comercial: str | None) -> dict:
    pessoal = limpar_telefone(telefone_pessoal)
    comercial = limpar_telefone(telefone_comercial)

    if pessoal:
        return {"numero": pessoal, "canal": "PESSOAL", "usou_fallback": False}
    if comercial:
        return {"numero": comercial, "canal": "COMERCIAL", "usou_fallback": True}

    return {"numero": None, "canal": "PESSOAL", "usou_fallback": False}