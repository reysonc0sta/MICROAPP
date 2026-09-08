from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AlunoCreate(BaseModel):
    nome: str
    turno: str
    telefone_pessoal: Optional[str] = None
    telefone_comercial: Optional[str] = None
    historico_observacoes: Optional[str] = None


class AlunoOut(AlunoCreate):
    id: int
    criado_em: datetime

    class Config:
        from_attributes = True


class LancarNota(BaseModel):
    aluno_id: int
    materia_id: int
    nota: float


class NotificarNota(BaseModel):
    aluno_id: int
    materia_id: int


class UsuarioCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., min_length=5, max_length=150)
    senha: str = Field(..., min_length=6, max_length=128)
    cargo: str


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str
    cargo: str
    ativo: bool
    criado_em: datetime

    class Config:
        from_attributes = True


class LoginSchema(BaseModel):
    email: str
    senha: str


class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut
