from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.v1.router import api_router
from app.core.database import engine, Base
import app.models.domain  # Carrega as definições das tabelas
import sys
import os

# Adiciona a pasta 'backend' ao caminho do Python
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Cria as tabelas automaticamente se não existirem
Base.metadata.create_all(bind=engine)


def garantir_colunas():
    """Adiciona colunas novas em bancos já existentes (create_all não altera tabelas)."""
    with engine.begin() as conn:
        existe = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'configuracoes_mensagem'
                  AND column_name = 'template_lembrete'
                """
            )
        ).scalar()
        if not existe:
            conn.execute(
                text("ALTER TABLE configuracoes_mensagem ADD COLUMN template_lembrete TEXT")
            )


garantir_colunas()

app = FastAPI(title="Plataforma Central de Alunos - API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"status": "API operacional"}
