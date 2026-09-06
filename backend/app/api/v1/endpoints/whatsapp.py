from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
import re

router = APIRouter()

def limpar_telefone(numero):
    if pd.isna(numero):
        return None
    num_limpo = re.sub(r'\D', '', str(numero))
    if not num_limpo:
        return None
    if len(num_limpo) in [10, 11]:
        return "55" + num_limpo
    return num_limpo

@router.post("/preview-planilha")
async def preview_planilha(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Envie um arquivo .xlsx ou .xls")

    try:
        conteudo = await file.read()
        df = pd.read_excel(io.BytesIO(conteudo))
        df = df.dropna(subset=['Nome Aluno'])

        # Filtra apenas contratos ativos
        if 'Status Contrato' in df.columns:
            df = df[df['Status Contrato'] == 'Ativo']

        registros = []
        for idx, row in df.iterrows():
            nome = str(row.get('Nome Aluno', '')).strip()
            primeiro_nome = nome.split()[0].title()
            tel_aluno = limpar_telefone(row.get('Telefone Aluno'))
            tel_resp = limpar_telefone(row.get('Telefone Responsável'))
            telefone = tel_aluno or tel_resp
            turno = str(row.get('Turno', 'Manhã'))
            faltas = int(row.get('Faltas', 0)) if 'Faltas' in row and not pd.isna(row.get('Faltas')) else 0

            # Gera a mensagem dinâmica dependendo do foco (Faltas ou Lembrete)
            if faltas > 0:
                mensagem = f"Olá {primeiro_nome}! Identificamos {faltas} falta(s) este mês. Esta é a ÚLTIMA SEMANA para reposição!"
            else:
                mensagem = f"Olá {primeiro_nome}! Lembrando que você tem aula hoje ({turno}). Estamos te esperando!"

            registros.append({
                "id": idx + 1,
                "nome": nome,
                "primeiro_nome": primeiro_nome,
                "telefone": telefone,
                "turno": turno,
                "faltas": faltas,
                "mensagem": mensagem,
                "status": "PENDENTE" if telefone else "SEM_TELEFONE"
            })

        return {
            "nome_arquivo": file.filename,
            "total_identificados": len(registros),
            "registros": registros
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar planilha: {str(e)}")