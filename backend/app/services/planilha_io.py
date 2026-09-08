from pathlib import Path

import pandas as pd

COLUNAS_OBRIGATORIAS_FALTAS = ("Nome Aluno", "Faltas")
COLUNAS_OBRIGATORIAS_LEMBRETES = ("Nome Aluno",)


def _escolher_engine(caminho_arquivo: str) -> str | None:
    sufixo = Path(caminho_arquivo).suffix.lower()
    if sufixo == ".xls":
        return "xlrd"
    if sufixo == ".xlsx":
        return "openpyxl"
    return None


def ler_planilha_excel(caminho_arquivo: str) -> pd.DataFrame:
    """Lê .xls (xlrd) ou .xlsx (openpyxl) com mensagem de erro clara."""
    engine = _escolher_engine(caminho_arquivo)
    try:
        return pd.read_excel(caminho_arquivo, engine=engine)
    except ImportError as exc:
        if engine == "xlrd":
            raise ValueError(
                "Suporte a arquivos .xls indisponível no servidor. Contate o administrador."
            ) from exc
        raise ValueError(
            "Suporte a arquivos Excel indisponível no servidor. Contate o administrador."
        ) from exc
    except Exception as exc:
        raise ValueError(
            "Não foi possível ler a planilha. Verifique se o arquivo é um Excel válido "
            "exportado pelo Hub Escola (.xls ou .xlsx)."
        ) from exc


def validar_colunas(df: pd.DataFrame, obrigatorias: tuple[str, ...]) -> None:
    faltando = [c for c in obrigatorias if c not in df.columns]
    if faltando:
        raise ValueError(
            "Planilha inválida: faltam as colunas "
            + ", ".join(f'"{c}"' for c in faltando)
            + ". Use a exportação padrão do Hub Escola."
        )


def celula_texto(valor) -> str | None:
    """Converte célula da planilha em texto limpo; NaN/None viram None (JSON-safe)."""
    if valor is None:
        return None
    try:
        if pd.isna(valor):
            return None
    except (TypeError, ValueError):
        pass
    texto = str(valor).strip()
    if not texto or texto.lower() == "nan":
        return None
    return texto


def celula_int(valor, default: int = 0) -> int:
    """Converte célula numérica; NaN vira default."""
    if valor is None:
        return default
    try:
        if pd.isna(valor):
            return default
    except (TypeError, ValueError):
        pass
    try:
        return int(float(valor))
    except (TypeError, ValueError):
        return default
