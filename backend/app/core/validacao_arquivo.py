import hashlib

MAGIC_NUMBER_XLSX = b"PK\x03\x04"  # .xlsx é um ZIP por baixo


def validar_magic_number_xlsx(caminho: str) -> None:
    """Levanta ValueError se o arquivo não tiver a assinatura binária de um .xlsx (ZIP)."""
    with open(caminho, "rb") as f:
        cabecalho = f.read(4)
    if cabecalho != MAGIC_NUMBER_XLSX:
        raise ValueError("O arquivo enviado não é um .xlsx válido (assinatura binária não confere).")


def calcular_sha256(caminho: str) -> str:
    sha256 = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(8192), b""):
            sha256.update(bloco)
    return sha256.hexdigest()
