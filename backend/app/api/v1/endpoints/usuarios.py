from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from app.models.domain import Usuario
from app.schemas.schemas import (
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioAtivoUpdate,
    RedefinirSenha,
    UsuarioOut,
    PaginatedUsuarios,
    LoginSchema,
    TokenSchema,
)
from app.core.security import (
    gerar_hash_senha,
    verificar_senha,
    criar_token_acesso,
    get_current_user,
    require_cargos,
)

router = APIRouter()

CARGOS_VALIDOS = ["DIRETOR", "PROFESSOR", "ASSISTENTE", "ANALISTA", "ADM"]
admin_deps = Depends(require_cargos("ADM", "DIRETOR"))


def _obter_usuario_ou_404(db: Session, usuario_id: int) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return usuario


def _validar_cargo(cargo: str) -> str:
    cargo_up = cargo.upper().strip()
    if cargo_up not in CARGOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Cargo inválido. Escolha entre: {CARGOS_VALIDOS}",
        )
    return cargo_up


@router.post("/cadastrar", response_model=UsuarioOut)
def cadastrar_usuario(
    dados: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = admin_deps,
):
    usuario_existente = db.query(Usuario).filter(Usuario.email == dados.email.lower().strip()).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado no sistema.")

    if len(dados.senha) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter no mínimo 6 caracteres.")

    novo_usuario = Usuario(
        nome=dados.nome.strip(),
        email=dados.email.lower().strip(),
        senha_hash=gerar_hash_senha(dados.senha),
        cargo=_validar_cargo(dados.cargo),
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario


@router.post("/login", response_model=TokenSchema)
@limiter.limit("5/minute")
def login(request: Request, dados: LoginSchema, db: Session = Depends(get_db)):
    email = dados.email.lower().strip()
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    if not usuario.ativo:
        raise HTTPException(status_code=403, detail="Usuário desativado. Fale com a direção.")

    token = criar_token_acesso({"sub": str(usuario.id), "cargo": usuario.cargo})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": usuario,
    }


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)):
    return usuario


@router.get("/", response_model=PaginatedUsuarios)
def listar_usuarios(
    db: Session = Depends(get_db),
    _: Usuario = admin_deps,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = db.query(Usuario)
    total = query.count()
    items = query.order_by(Usuario.nome.asc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.patch("/{usuario_id}", response_model=UsuarioOut)
def editar_usuario(
    usuario_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: Usuario = admin_deps,
):
    usuario = _obter_usuario_ou_404(db, usuario_id)

    if dados.nome is not None:
        usuario.nome = dados.nome.strip()

    if dados.email is not None:
        email = dados.email.lower().strip()
        conflito = (
            db.query(Usuario)
            .filter(Usuario.email == email, Usuario.id != usuario_id)
            .first()
        )
        if conflito:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado no sistema.")
        usuario.email = email

    if dados.cargo is not None:
        usuario.cargo = _validar_cargo(dados.cargo)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}/ativo", response_model=UsuarioOut)
def alterar_status_usuario(
    usuario_id: int,
    dados: UsuarioAtivoUpdate,
    db: Session = Depends(get_db),
    atual: Usuario = admin_deps,
):
    if atual.id == usuario_id:
        raise HTTPException(
            status_code=400,
            detail="Você não pode ativar/desativar o próprio perfil.",
        )

    usuario = _obter_usuario_ou_404(db, usuario_id)
    usuario.ativo = dados.ativo
    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/{usuario_id}/redefinir-senha", response_model=UsuarioOut)
def redefinir_senha_usuario(
    usuario_id: int,
    dados: RedefinirSenha,
    db: Session = Depends(get_db),
    _: Usuario = admin_deps,
):
    if len(dados.nova_senha) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter no mínimo 6 caracteres.")

    usuario = _obter_usuario_ou_404(db, usuario_id)
    usuario.senha_hash = gerar_hash_senha(dados.nova_senha)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    atual: Usuario = admin_deps,
):
    if atual.id == usuario_id:
        raise HTTPException(status_code=400, detail="Você não pode excluir o próprio perfil.")

    usuario = _obter_usuario_ou_404(db, usuario_id)
    db.delete(usuario)
    db.commit()
    return None
