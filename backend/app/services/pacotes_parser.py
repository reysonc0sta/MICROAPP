import re
import unicodedata
from typing import TypedDict

import pandas as pd

from app.services.planilha_io import (
    celula_int,
    celula_texto,
    encontrar_coluna,
    ler_planilha_excel,
)

COLUNAS_OBRIGATORIAS = (
    "Educador",
    "Aluno",
    "Qtd Aula Realizada",
    "Qtd Agendamento",
    "Dias Agendamento",
)

COLUNAS_OPCIONAIS = {
    "qtd_aula_extra": ("Qtd Aula Extra",),
    "horas_agendamento": ("Horas Agendamento",),
    "estimativa_conclusao": ("Estimativa Conclusão Aulas", "Estimativa Conclusao Aulas"),
    "aula_semanal_realizada": ("Aula Semanal Realizada",),
    "presencas": ("Presenças", "Presencas"),
    "faltas": ("Faltas",),
    "reposicoes": ("Reposições", "Reposicoes", "Reposição", "Reposicao"),
}

DIAS_CANONICOS = {
    "segunda": "SEGUNDA",
    "segunda-feira": "SEGUNDA",
    "segunda feira": "SEGUNDA",
    "terca": "TERCA",
    "terca-feira": "TERCA",
    "terca feira": "TERCA",
    "quarta": "QUARTA",
    "quarta-feira": "QUARTA",
    "quarta feira": "QUARTA",
    "quinta": "QUINTA",
    "quinta-feira": "QUINTA",
    "quinta feira": "QUINTA",
    "sabado": "SABADO",
}


class PacoteLinha(TypedDict):
    nome: str
    educador: str | None
    dias_agendamento: str | None
    horas_agendamento: str | None
    qtd_realizada: int
    qtd_agendamento: int | None
    qtd_aula_extra: int
    presencas: int
    faltas: int
    reposicoes: int
    dias_normalizados: list[str]
    dias_desconhecidos: list[str]


def _normalizar(texto: str) -> str:
    nfd = unicodedata.normalize("NFD", texto)
    sem_acento = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", sem_acento).strip().casefold()


def _int_ou_none(valor) -> int | None:
    try:
        if valor is None or pd.isna(valor):
            return None
    except (TypeError, ValueError):
        pass
    texto = celula_texto(valor)
    if texto is None:
        return None
    try:
        return int(float(texto.replace(",", ".")))
    except (TypeError, ValueError):
        return None


def _exigir_colunas(df) -> dict[str, str]:
    encontradas: dict[str, str] = {}
    faltando: list[str] = []
    for nome in COLUNAS_OBRIGATORIAS:
        coluna = encontrar_coluna(df, (nome,))
        if coluna is None:
            faltando.append(nome)
        else:
            encontradas[nome] = coluna
    if faltando:
        raise ValueError(
            "Planilha inválida: faltam as colunas "
            + ", ".join(f'"{c}"' for c in faltando)
            + "."
        )
    return encontradas


def _coluna_opcional(df, candidatos: tuple[str, ...]) -> str | None:
    return encontrar_coluna(df, candidatos)


def normalizar_dias(texto: str | None) -> tuple[list[str], list[str]]:
    """Converte 'Quarta-Feira,Segunda-Feira' em (['QUARTA', 'SEGUNDA'], dias_desconhecidos)."""
    if not texto:
        return [], []
    conhecidos: list[str] = []
    desconhecidos: list[str] = []
    vistos: set[str] = set()
    for bruto in texto.split(","):
        pedaco = bruto.strip()
        if not pedaco:
            continue
        chave = _normalizar(pedaco)
        canonico = DIAS_CANONICOS.get(chave)
        if canonico is None:
            desconhecidos.append(pedaco)
            continue
        if canonico not in vistos:
            conhecidos.append(canonico)
            vistos.add(canonico)
    return conhecidos, desconhecidos


def parsear_planilha_pacotes(caminho_arquivo: str) -> list[PacoteLinha]:
    """Lê a planilha de agendamentos (header na linha 1). Stateless."""
    df = ler_planilha_excel(caminho_arquivo, header=0)
    colunas = _exigir_colunas(df)
    opcionais = {
        chave: _coluna_opcional(df, nomes) for chave, nomes in COLUNAS_OPCIONAIS.items()
    }

    linhas: list[PacoteLinha] = []
    for _, row in df.iterrows():
        nome = celula_texto(row[colunas["Aluno"]])
        if not nome:
            continue

        dias_bruto = celula_texto(row[colunas["Dias Agendamento"]])
        dias_normalizados, dias_desconhecidos = normalizar_dias(dias_bruto)
        qtd_agendamento = _int_ou_none(row[colunas["Qtd Agendamento"]])

        horas_col = opcionais["horas_agendamento"]
        extra_col = opcionais["qtd_aula_extra"]
        pres_col = opcionais["presencas"]
        faltas_col = opcionais["faltas"]
        repo_col = opcionais["reposicoes"]

        linhas.append(
            {
                "nome": nome,
                "educador": celula_texto(row[colunas["Educador"]]),
                "dias_agendamento": dias_bruto,
                "horas_agendamento": celula_texto(row[horas_col]) if horas_col else None,
                "qtd_realizada": celula_int(row[colunas["Qtd Aula Realizada"]], default=0),
                "qtd_agendamento": qtd_agendamento,
                "qtd_aula_extra": celula_int(row[extra_col], default=0) if extra_col else 0,
                "presencas": celula_int(row[pres_col], default=0) if pres_col else 0,
                "faltas": celula_int(row[faltas_col], default=0) if faltas_col else 0,
                "reposicoes": celula_int(row[repo_col], default=0) if repo_col else 0,
                "dias_normalizados": dias_normalizados,
                "dias_desconhecidos": dias_desconhecidos,
            }
        )

    if not linhas:
        raise ValueError("Nenhuma linha com aluno preenchido foi encontrada na planilha.")
    return linhas
