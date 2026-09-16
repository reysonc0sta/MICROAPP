"""criar tabela logs_auditoria (modelo ORM, inclusive ix_logs_auditoria_id).

O banco de desenvolvimento atual NÃO tinha essa tabela (create_all/garantir_colunas
ainda não tinham sido aplicados nela). Por isso ela NÃO entra na baseline —
stamp da baseline não criaria a tabela, e misturá-la na baseline + stamp head
deixaria o schema incompleto.

ix_logs_auditoria_id vem do index=True da PK no modelo. Não é um índice que
já existia no banco; fica nesta revisão de propósito, não na baseline.

Revision ID: 0002_criar_logs_auditoria
Revises: 0001_baseline
Create Date: 2026-09-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_criar_logs_auditoria"
down_revision: Union[str, Sequence[str], None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "logs_auditoria",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("usuario_nome", sa.String(length=255), nullable=False),
        sa.Column("acao", sa.String(length=20), nullable=False),
        sa.Column("entidade", sa.String(length=50), nullable=True),
        sa.Column("entidade_id", sa.Integer(), nullable=True),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("valor_anterior", sa.Text(), nullable=True),
        sa.Column("valor_novo", sa.Text(), nullable=True),
        sa.Column("data_hora", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_logs_auditoria_acao"), "logs_auditoria", ["acao"], unique=False)
    op.create_index(op.f("ix_logs_auditoria_data_hora"), "logs_auditoria", ["data_hora"], unique=False)
    op.create_index(op.f("ix_logs_auditoria_entidade"), "logs_auditoria", ["entidade"], unique=False)
    op.create_index(op.f("ix_logs_auditoria_entidade_id"), "logs_auditoria", ["entidade_id"], unique=False)
    op.create_index(op.f("ix_logs_auditoria_id"), "logs_auditoria", ["id"], unique=False)
    op.create_index(op.f("ix_logs_auditoria_usuario_id"), "logs_auditoria", ["usuario_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_logs_auditoria_usuario_id"), table_name="logs_auditoria")
    op.drop_index(op.f("ix_logs_auditoria_id"), table_name="logs_auditoria")
    op.drop_index(op.f("ix_logs_auditoria_entidade_id"), table_name="logs_auditoria")
    op.drop_index(op.f("ix_logs_auditoria_entidade"), table_name="logs_auditoria")
    op.drop_index(op.f("ix_logs_auditoria_data_hora"), table_name="logs_auditoria")
    op.drop_index(op.f("ix_logs_auditoria_acao"), table_name="logs_auditoria")
    op.drop_table("logs_auditoria")
