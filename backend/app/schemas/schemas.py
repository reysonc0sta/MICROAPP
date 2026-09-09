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


class PaginatedAlunos(BaseModel):
    items: list[AlunoOut]
    total: int
    limit: int
    offset: int


class MateriaVinculo(BaseModel):
    materia_id: int


class MateriaCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)


class MateriaUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)


class MateriaOut(BaseModel):
    id: int
    nome: str

    class Config:
        from_attributes = True


class LancarNota(BaseModel):
    aluno_id: int
    materia_id: int
    nota: float = Field(..., ge=0, le=10)


class ProvaOut(BaseModel):
    id: int
    aluno_id: int
    materia_id: int
    nota: float
    tentativa: int
    data_realizacao: datetime

    class Config:
        from_attributes = True


class NotificarNota(BaseModel):
    aluno_id: int
    materia_id: int


class UsuarioCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., min_length=5, max_length=150)
    senha: str = Field(..., min_length=6, max_length=128)
    cargo: str


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[str] = Field(None, min_length=5, max_length=150)
    cargo: Optional[str] = None


class UsuarioAtivoUpdate(BaseModel):
    ativo: bool


class RedefinirSenha(BaseModel):
    nova_senha: str = Field(..., min_length=6, max_length=128)


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str
    cargo: str
    ativo: bool
    criado_em: datetime

    class Config:
        from_attributes = True


class PaginatedUsuarios(BaseModel):
    items: list[UsuarioOut]
    total: int
    limit: int
    offset: int


class LoginSchema(BaseModel):
    email: str
    senha: str


class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut
