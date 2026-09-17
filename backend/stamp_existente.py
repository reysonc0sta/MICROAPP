"""Marca o Alembic em bancos criados antes das migrations (create_all)."""

from sqlalchemy import create_engine, inspect, text

from app.core.config import settings

BASELINE = "0001_baseline"
HEAD = "0002_criar_logs_auditoria"


def _garantir_tabela_versao(conn) -> None:
    conn.execute(
        text(
            "CREATE TABLE IF NOT EXISTS alembic_version ("
            "version_num VARCHAR(32) NOT NULL PRIMARY KEY)"
        )
    )


def _versao_atual(conn) -> str | None:
    nomes = set(inspect(conn).get_table_names())
    if "alembic_version" not in nomes:
        return None
    row = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
    return row[0] if row else None


def _gravar_versao(conn, revisao: str) -> None:
    _garantir_tabela_versao(conn)
    atual = _versao_atual(conn)
    if atual is None:
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:v)"), {"v": revisao})
        return
    if atual != revisao:
        conn.execute(text("UPDATE alembic_version SET version_num = :v"), {"v": revisao})


def main() -> None:
    engine = create_engine(settings.DATABASE_URL)
    with engine.begin() as conn:
        nomes = set(inspect(conn).get_table_names())
        if "alunos" not in nomes:
            return
        atual = _versao_atual(conn)
        if "logs_auditoria" in nomes:
            alvo = HEAD
        else:
            alvo = BASELINE
        if atual is None or (alvo == HEAD and atual == BASELINE and "logs_auditoria" in nomes):
            _gravar_versao(conn, alvo)


if __name__ == "__main__":
    main()
