from collections import OrderedDict
import re
import unicodedata

from app.services.planilha_io import celula_texto, ler_planilha_excel
from app.services.provas_parser import parse_provas

COLUNAS_POS_PROVA = ("Aluno", "Ocorrência", "Descrição")
OCORRENCIA_ALVO = "pos prova"
MAX_LINHAS_CABECALHO = 80


def _normalizar(texto: str) -> str:
    nfd = unicodedata.normalize("NFD", texto)
    sem_acento = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", sem_acento).strip().casefold()


def _texto_celula_bruto(valor) -> str:
    texto = celula_texto(valor)
    return texto or ""


def _eh_pos_prova(valor) -> bool:
    texto = _texto_celula_bruto(valor)
    return bool(texto) and _normalizar(texto) == OCORRENCIA_ALVO


def _localizar_cabecalho(df) -> dict[str, int]:
    alvos = {_normalizar(nome): nome for nome in COLUNAS_POS_PROVA}
    melhor: dict[str, int] = {}
    limite = min(len(df), MAX_LINHAS_CABECALHO)

    for i in range(limite):
        encontrados: dict[str, int] = {}
        for j, valor in enumerate(df.iloc[i]):
            chave = _normalizar(_texto_celula_bruto(valor))
            nome = alvos.get(chave)
            if nome and nome not in encontrados:
                encontrados[nome] = j
        if len(encontrados) == len(COLUNAS_POS_PROVA):
            return {"linha": i, **encontrados}
        if len(encontrados) > len(melhor):
            melhor = encontrados

    faltando = [c for c in COLUNAS_POS_PROVA if c not in melhor]
    raise ValueError(
        "Planilha inválida: faltam as colunas "
        + ", ".join(f'"{c}"' for c in faltando)
        + '. O cabeçalho deve conter "Aluno", "Ocorrência" e "Descrição".'
    )


def processar_planilha_pos_prova(caminho_arquivo: str) -> dict:
    """Lê o Histórico de Contratos e agrupa provas extraídas por aluno.

    Stateless: não consulta nem grava alunos no banco.
    """
    df = ler_planilha_excel(caminho_arquivo, header=None)
    cabecalho = _localizar_cabecalho(df)
    dados = df.iloc[cabecalho["linha"] + 1 :]

    alunos: OrderedDict[str, dict] = OrderedDict()
    total_ocorrencias = 0

    for _, row in dados.iterrows():
        if not _eh_pos_prova(row.iloc[cabecalho["Ocorrência"]]):
            continue

        nome = celula_texto(row.iloc[cabecalho["Aluno"]])
        if not nome:
            continue

        descricao = celula_texto(row.iloc[cabecalho["Descrição"]])
        provas = parse_provas(descricao)
        total_ocorrencias += 1

        chave = nome.strip()
        if chave not in alunos:
            alunos[chave] = {"nome": nome, "provas": []}
        alunos[chave]["provas"].extend(provas)

    lista = list(alunos.values())
    if not lista:
        raise ValueError('Nenhuma linha com ocorrência "Pós prova" foi encontrada.')

    return {
        "alunos": lista,
        "total_alunos": len(lista),
        "total_ocorrencias": total_ocorrencias,
    }
