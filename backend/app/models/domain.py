from datetime import datetime
from sqlalchemy import Column, Integer, String, Enum, Numeric, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Aluno(Base):
    __tablename__ = "alunos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False, index=True)
    turno = Column(Enum('MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL', name='turno_enum'), nullable=False)
    telefone_pessoal = Column(String(20), nullable=True)
    telefone_comercial = Column(String(20), nullable=True)
    historico_observacoes = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    materias = relationship("AlunoMateria", back_populates="aluno")
    provas = relationship("ProvaResultado", back_populates="aluno")
    mensagens = relationship("HistoricoWhatsApp", back_populates="aluno")


class Materia(Base):
    __tablename__ = "materias"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False, unique=True)


class AlunoMateria(Base):
    __tablename__ = "aluno_materias"

    id = Column(Integer, primary_key=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)

    aluno = relationship("Aluno", back_populates="materias")
    materia = relationship("Materia")


class ProvaResultado(Base):
    __tablename__ = "provas_resultados"

    id = Column(Integer, primary_key=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    nota = Column(Numeric(4, 2), nullable=False)
    tentativa = Column(Integer, nullable=False, default=1)
    data_realizacao = Column(DateTime, default=datetime.utcnow)

    aluno = relationship("Aluno", back_populates="provas")
    materia = relationship("Materia")


class HistoricoWhatsApp(Base):
    __tablename__ = "historico_mensagens"

    id = Column(Integer, primary_key=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"), nullable=False)
    numero_destino = Column(String(20), nullable=False)
    canal_utilizado = Column(Enum('PESSOAL', 'COMERCIAL', name='canal_enum'), nullable=False)
    usou_fallback = Column(Boolean, default=False)
    conteudo = Column(Text, nullable=False)
    status_final = Column(Enum('PENDENTE', 'SUCESSO', 'FALHA_AMBOS', name='status_final_enum'), default='PENDENTE')
    enviado_em = Column(DateTime, default=datetime.utcnow)

    aluno = relationship("Aluno", back_populates="mensagens")


class ConfiguracaoMensagem(Base):
    __tablename__ = "configuracoes_mensagem"

    id = Column(Integer, primary_key=True, index=True)
    template = Column(Text, nullable=False)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    cargo = Column(
        Enum('DIRETOR', 'PROFESSOR', 'ASSISTENTE', 'ANALISTA', 'ADM', name='cargo_enum'),
        nullable=False,
        default='ASSISTENTE'
    )
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)