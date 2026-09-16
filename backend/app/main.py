from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.limiter import limiter
from app.core.database import SessionLocal, engine, Base
from app.core.security import gerar_hash_senha
from app.models.domain import Usuario
import app.models.domain  # noqa: F401 — registra modelos no metadata

Base.metadata.create_all(bind=engine)


def garantir_colunas():
    """LEGADO / CONGELADO — não adicionar schema novo aqui.

    Estas ALTER/CREATE cobrem bancos que ainda não passaram pelo Alembic
    (create_all não altera tabelas existentes). A partir de agora, qualquer
    mudança de schema vai só via `alembic revision` + `alembic upgrade`.
    Não remover estes patches até todos os ambientes estarem em `alembic stamp`
    ou `upgrade` com a baseline aplicada.
    """
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

        existe_logs = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'logs_auditoria'
                """
            )
        ).scalar()
        if not existe_logs:
            conn.execute(
                text(
                    """
                    CREATE TABLE logs_auditoria (
                        id SERIAL PRIMARY KEY,
                        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                        usuario_nome VARCHAR(255) NOT NULL,
                        acao VARCHAR(20) NOT NULL,
                        entidade VARCHAR(50),
                        entidade_id INTEGER,
                        descricao TEXT NOT NULL,
                        valor_anterior TEXT,
                        valor_novo TEXT,
                        data_hora TIMESTAMP WITHOUT TIME ZONE NOT NULL
                    )
                    """
                )
            )
            conn.execute(text("CREATE INDEX ix_logs_auditoria_usuario_id ON logs_auditoria (usuario_id)"))
            conn.execute(text("CREATE INDEX ix_logs_auditoria_acao ON logs_auditoria (acao)"))
            conn.execute(text("CREATE INDEX ix_logs_auditoria_entidade ON logs_auditoria (entidade)"))
            conn.execute(text("CREATE INDEX ix_logs_auditoria_entidade_id ON logs_auditoria (entidade_id)"))
            conn.execute(text("CREATE INDEX ix_logs_auditoria_data_hora ON logs_auditoria (data_hora)"))


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
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_allow_origin_regex,
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
