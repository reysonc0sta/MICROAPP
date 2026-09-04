from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.domain import Usuario
from app.schemas.schemas import UsuarioCreate, UsuarioOut, LoginSchema, TokenSchema
from app.core.security import gerar_hash_senha, verificar_senha, criar_token_acesso

router = APIRouter()

@router.post("/cadastrar", response_model=UsuarioOut)
def cadastrar_usuario(dados: UsuarioCreate, db: Session = Depends(get_db)):
    usuario_existente = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado no sistema.")

    cargos_validos = ['DIRETOR', 'PROFESSOR', 'ASSISTENTE', 'ANALISTA', 'ADM']
    if dados.cargo.upper() not in cargos_validos:
        raise HTTPException(status_code=400, detail=f"Cargo inválido. Escolha entre: {cargos_validos}")

    novo_usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=gerar_hash_senha(dados.senha),
        cargo=dados.cargo.upper()
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@router.post("/login", response_model=TokenSchema)
def login(dados: LoginSchema, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    if not usuario.ativo:
        raise HTTPException(status_code=403, detail="Usuário desativado. Fale com a direção.")

    token = criar_token_acesso({"sub": str(usuario.id), "cargo": usuario.cargo})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": usuario
    }

@router.get("/", response_model=List[UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).all()