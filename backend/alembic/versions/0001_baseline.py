"""baseline — schema das 7 tabelas já existentes no banco de desenvolvimento.

Espelho do Postgres real (sem logs_auditoria). Gerado com autogenerate
contra um banco vazio e revisado contra \\d de cada tabela.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-09-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_baseline"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alunos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("turno", sa.Enum("MATUTINO", "VESPERTINO", "NOTURNO", "INTEGRAL", name="turno_enum"), nullable=False),
        sa.Column("telefone_pessoal", sa.String(length=20), nullable=True),
        sa.Column("telefone_comercial", sa.String(length=20), nullable=True),
        sa.Column("historico_observacoes", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alunos_id"), "alunos", ["id"], unique=False)
    op.create_index(op.f("ix_alunos_nome"), "alunos", ["nome"], unique=False)

    op.create_table(
        "configuracoes_mensagem",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("template", sa.Text(), nullable=False),
        sa.Column("template_lembrete", sa.Text(), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_configuracoes_mensagem_id"), "configuracoes_mensagem", ["id"], unique=False)

    op.create_table(
        "materias",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nome"),
    )
    op.create_index(op.f("ix_materias_id"), "materias", ["id"], unique=False)

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("senha_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "cargo",
            sa.Enum("DIRETOR", "PROFESSOR", "ASSISTENTE", "ANALISTA", "ADM", name="cargo_enum"),
            nullable=False,
        ),
        sa.Column("ativo", sa.Boolean(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_usuarios_email"), "usuarios", ["email"], unique=True)
    op.create_index(op.f("ix_usuarios_id"), "usuarios", ["id"], unique=False)

    op.create_table(
        "aluno_materias",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("aluno_id", sa.Integer(), nullable=False),
        sa.Column("materia_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["aluno_id"], ["alunos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_aluno_materias_aluno_id"), "aluno_materias", ["aluno_id"], unique=False)
    op.create_index(op.f("ix_aluno_materias_materia_id"), "aluno_materias", ["materia_id"], unique=False)

    op.create_table(
        "historico_mensagens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("aluno_id", sa.Integer(), nullable=True),
        sa.Column("nome_destino", sa.String(length=150), nullable=True),
        sa.Column("numero_destino", sa.String(length=20), nullable=False),
        sa.Column("canal_utilizado", sa.Enum("PESSOAL", "COMERCIAL", name="canal_enum"), nullable=False),
        sa.Column("usou_fallback", sa.Boolean(), nullable=True),
        sa.Column("conteudo", sa.Text(), nullable=False),
        sa.Column("status_final", sa.Enum("PENDENTE", "SUCESSO", "FALHA_AMBOS", name="status_final_enum"), nullable=True),
        sa.Column("enviado_em", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["aluno_id"], ["alunos.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_historico_mensagens_aluno_id"), "historico_mensagens", ["aluno_id"], unique=False)
    op.create_index(op.f("ix_historico_mensagens_enviado_em"), "historico_mensagens", ["enviado_em"], unique=False)
    op.create_index(op.f("ix_historico_mensagens_nome_destino"), "historico_mensagens", ["nome_destino"], unique=False)
    op.create_index(op.f("ix_historico_mensagens_numero_destino"), "historico_mensagens", ["numero_destino"], unique=False)
    op.create_index(op.f("ix_historico_mensagens_status_final"), "historico_mensagens", ["status_final"], unique=False)

    op.create_table(
        "provas_resultados",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("aluno_id", sa.Integer(), nullable=False),
        sa.Column("materia_id", sa.Integer(), nullable=False),
        sa.Column("nota", sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column("tentativa", sa.Integer(), nullable=False),
        sa.Column("data_realizacao", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["aluno_id"], ["alunos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_provas_resultados_aluno_id"), "provas_resultados", ["aluno_id"], unique=False)
    op.create_index(op.f("ix_provas_resultados_materia_id"), "provas_resultados", ["materia_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_provas_resultados_materia_id"), table_name="provas_resultados")
    op.drop_index(op.f("ix_provas_resultados_aluno_id"), table_name="provas_resultados")
    op.drop_table("provas_resultados")
    op.drop_index(op.f("ix_historico_mensagens_status_final"), table_name="historico_mensagens")
    op.drop_index(op.f("ix_historico_mensagens_numero_destino"), table_name="historico_mensagens")
    op.drop_index(op.f("ix_historico_mensagens_nome_destino"), table_name="historico_mensagens")
    op.drop_index(op.f("ix_historico_mensagens_enviado_em"), table_name="historico_mensagens")
    op.drop_index(op.f("ix_historico_mensagens_aluno_id"), table_name="historico_mensagens")
    op.drop_table("historico_mensagens")
    op.drop_index(op.f("ix_aluno_materias_materia_id"), table_name="aluno_materias")
    op.drop_index(op.f("ix_aluno_materias_aluno_id"), table_name="aluno_materias")
    op.drop_table("aluno_materias")
    op.drop_index(op.f("ix_usuarios_id"), table_name="usuarios")
    op.drop_index(op.f("ix_usuarios_email"), table_name="usuarios")
    op.drop_table("usuarios")
    op.drop_index(op.f("ix_materias_id"), table_name="materias")
    op.drop_table("materias")
    op.drop_index(op.f("ix_configuracoes_mensagem_id"), table_name="configuracoes_mensagem")
    op.drop_table("configuracoes_mensagem")
    op.drop_index(op.f("ix_alunos_nome"), table_name="alunos")
    op.drop_index(op.f("ix_alunos_id"), table_name="alunos")
    op.drop_table("alunos")
    sa.Enum(name="turno_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="cargo_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="canal_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="status_final_enum").drop(op.get_bind(), checkfirst=True)
