from pathlib import Path

import pandas as pd

COLUNAS_OBRIGATORIAS_FALTAS = ("Faltas",)
NOMES_COLUNA_ALUNO = ("Nome Aluno", "Aluno", "Nome do Aluno")
NOMES_COLUNA_FALTAS = ("Faltas",)
NOMES_COLUNA_REPOSICAO = ("Reposição", "Reposicao", "Reposições", "Reposicoes")


def _escolher_engine(caminho_arquivo: str) -> str | None:
    sufixo = Path(caminho_arquivo).suffix.lower()
    if sufixo == ".xls":
        return "xlrd"
    if sufixo == ".xlsx":
        return "openpyxl"
    return None


def ler_planilha_excel(caminho_arquivo: str, header: int | None = 0) -> pd.DataFrame:
    """Lê .xls (xlrd) ou .xlsx (openpyxl) com mensagem de erro clara."""
    engine = _escolher_engine(caminho_arquivo)
    try:
        df = pd.read_excel(caminho_arquivo, engine=engine, header=header)
        df.columns = [
            str(c).replace("\ufeff", "").strip() if not isinstance(c, (int, float)) else c
            for c in df.columns
        ]
        return df
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


def encontrar_coluna(
    df: pd.DataFrame,
    candidatos: tuple[str, ...],
    trecho: str | None = None,
) -> str | None:
    """Localiza uma coluna pelos nomes esperados, ignorando maiúsculas e acentos extras."""
    mapa = {str(c).strip().casefold(): c for c in df.columns}
    for nome in candidatos:
        chave = nome.casefold()
        if chave in mapa:
            return mapa[chave]
    if trecho:
        trecho_cf = trecho.casefold()
        for chave, original in mapa.items():
            if trecho_cf in chave:
                return original
    return None


def colunas_nome_aluno(df: pd.DataFrame) -> list[str]:
    """Retorna as colunas de nome encontradas, na ordem de preferência (Nome Aluno, depois Aluno)."""
    encontradas: list[str] = []
    vistos: set[str] = set()
    for nome in NOMES_COLUNA_ALUNO:
        coluna = encontrar_coluna(df, (nome,))
        if coluna and coluna not in vistos:
            encontradas.append(coluna)
            vistos.add(coluna)
    return encontradas


def exigir_coluna_nome_aluno(df: pd.DataFrame) -> list[str]:
    colunas = colunas_nome_aluno(df)
    if not colunas:
        raise ValueError(
            'Planilha inválida: faltam as colunas "Nome Aluno" ou "Aluno". '
            "Use a exportação padrão do Hub Escola."
        )
    return colunas


def exigir_coluna_faltas(df: pd.DataFrame) -> str:
    coluna = encontrar_coluna(df, NOMES_COLUNA_FALTAS)
    if not coluna:
        raise ValueError(
            'Planilha inválida: falta a coluna "Faltas". '
            "Use a exportação padrão do Hub Escola."
        )
    return coluna


def nome_da_linha(row, colunas_nome: list[str]) -> str | None:
    """Usa o primeiro nome preenchido entre as colunas de aluno."""
    for coluna in colunas_nome:
        nome = celula_texto(row.get(coluna) if hasattr(row, "get") else row[coluna])
        if nome:
            return nome
    return None


def validar_colunas(df: pd.DataFrame, obrigatorias: tuple[str, ...]) -> None:
    faltando = [c for c in obrigatorias if encontrar_coluna(df, (c,)) is None]
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
