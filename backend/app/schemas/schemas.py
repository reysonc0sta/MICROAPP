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


class ProvaRelatorioItem(BaseModel):
    materia: Optional[str] = None
    nota: Optional[float] = None
    nota_exibicao: Optional[str] = None


class AlunoProvasRelatorio(BaseModel):
    nome: str
    provas: list[ProvaRelatorioItem]


class RelatorioPosProvaOut(BaseModel):
    alunos: list[AlunoProvasRelatorio]
    total_alunos: int
    total_ocorrencias: int


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


class LogAuditoriaOut(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    usuario_nome: str
    acao: str
    entidade: Optional[str] = None
    entidade_id: Optional[int] = None
    descricao: str
    valor_anterior: Optional[str] = None
    valor_novo: Optional[str] = None
    data_hora: datetime

    class Config:
        from_attributes = True


class PaginatedAuditoria(BaseModel):
    items: list[LogAuditoriaOut]
    total: int
    page: int
    page_size: int


class AlunoPacoteOut(BaseModel):
    nome: str
    educador: Optional[str] = None
    dias_agendamento: Optional[str] = None
    dias_normalizados: list[str] = []
    horas_agendamento: Optional[str] = None
    qtd_realizada: int = 0
    qtd_agendamento: int = 0
    qtd_aula_extra: int = 0
    aulas_por_ocorrencia_do_dia: Optional[int] = None
    total_previsto_mes: Optional[int] = None
    previsto_ate_hoje: Optional[int] = None
    status: Optional[str] = None
    diferenca: Optional[int] = None
    aviso: Optional[str] = None


class FeriadoPacoteOut(BaseModel):
    data: str
    nome: str


class AvisoPacoteOut(BaseModel):
    nome: str
    educador: Optional[str] = None
    motivo: str


class GruposPacoteOut(BaseModel):
    seg_qua: list[AlunoPacoteOut]
    ter_qui: list[AlunoPacoteOut]
    sabado: list[AlunoPacoteOut]


class RelatorioPacotesOut(BaseModel):
    ano: int
    mes: int
    dia_atual: int
    dias_totais_mes: int
    feriados_aplicados: list[FeriadoPacoteOut]
    grupos: GruposPacoteOut
    nao_agrupados: list[AlunoPacoteOut]
    avisos: list[AvisoPacoteOut]
    total_alunos: int
    rotulos_grupo: dict[str, str]
