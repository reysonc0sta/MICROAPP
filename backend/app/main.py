from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.core.security import gerar_hash_senha
from app.models.domain import Usuario
import app.models.domain  # noqa: F401 — registra modelos no metadata

Base.metadata.create_all(bind=engine)


def garantir_colunas():
    """Adiciona colunas novas em bancos já existentes (create_all não altera tabelas)."""
    with engine.begin() as conn:
        existe_lembrete = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'configuracoes_mensagem'
                  AND column_name = 'template_lembrete'
                """
            )
        ).scalar()
        if not existe_lembrete:
            conn.execute(text("ALTER TABLE configuracoes_mensagem ADD COLUMN template_lembrete TEXT"))

        existe_nome = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'historico_mensagens'
                  AND column_name = 'nome_destino'
                """
            )
        ).scalar()
        if not existe_nome:
            conn.execute(text("ALTER TABLE historico_mensagens ADD COLUMN nome_destino VARCHAR(150)"))

        aluno_nullable = conn.execute(
            text(
                """
                SELECT is_nullable FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'historico_mensagens'
                  AND column_name = 'aluno_id'
                """
            )
        ).scalar()
        if aluno_nullable == "NO":
            conn.execute(text("ALTER TABLE historico_mensagens ALTER COLUMN aluno_id DROP NOT NULL"))


def garantir_admin_inicial():
    """Cria o usuário ADM inicial se ADMIN_PASSWORD estiver definido e o e-mail ainda não existir."""
    if not settings.ADMIN_PASSWORD:
        return
    db = SessionLocal()
    try:
        email = settings.ADMIN_EMAIL.lower().strip()
        existente = db.query(Usuario).filter(Usuario.email == email).first()
        if existente:
            return
        db.add(
            Usuario(
                nome="Administrador Master",
                email=email,
                senha_hash=gerar_hash_senha(settings.ADMIN_PASSWORD),
                cargo="ADM",
            )
        )
        db.commit()
        print(f"[BOOTSTRAP] Admin criado: {email}")
    finally:
        db.close()


garantir_colunas()
garantir_admin_inicial()

app = FastAPI(title="Plataforma Central de Alunos - API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"status": "API operacional"}


@app.get("/health")
def health():
    return {"status": "ok"}
