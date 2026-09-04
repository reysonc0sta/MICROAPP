from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
import io
import re
from app.core.database import get_db
from app.schemas.schemas import NotificarNota
from app.services.whatsapp_service import executar_envio_whatsapp

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

def processar_disparo_planilha(df_data: pd.DataFrame):
    """Lógica em segundo plano que varre a planilha e realiza os envios"""
    # Filtra contratos ativos
    if 'Status Contrato' in df_data.columns:
        df_data = df_data[df_data['Status Contrato'] == 'Ativo']
    
    # Exemplo: Filtra alunos com faltas > 0
    if 'Faltas' in df_data.columns:
        df_data = df_data[df_data['Faltas'] > 0]

    for _, row in df_data.iterrows():
        nome = str(row.get('Nome Aluno', '')).strip()
        tel_aluno = limpar_telefone(row.get('Telefone Aluno'))
        tel_resp = limpar_telefone(row.get('Telefone Responsável'))
        telefone_destino = tel_aluno or tel_resp
        
        if telefone_destino:
            # Aqui aciona a rotina de automação do WhatsApp
            print(f"[PROCESSANDO PLANILHA] Enviando para {nome} -> {telefone_destino}")

@router.post("/upload-planilha")
async def upload_planilha_whatsapp(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Formato inválido. Envie um arquivo .xlsx ou .xls")

    try:
        conteudo = await file.read()
        df = pd.read_excel(io.BytesIO(conteudo))
        
        # Validação básica de colunas
        if 'Nome Aluno' not in df.columns:
            raise HTTPException(status_code=400, detail="A planilha não contém a coluna 'Nome Aluno'")

        # Inicia o processamento em segundo plano sem travar a tela
        background_tasks.add_task(processar_disparo_planilha, df)

        total_linhas = len(df.dropna(subset=['Nome Aluno']))
        return {
            "mensagem": "Planilha recebida com sucesso! O processamento foi iniciado em segundo plano.",
            "nome_arquivo": file.filename,
            "total_registros_identificados": total_linhas
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler a planilha: {str(e)}")