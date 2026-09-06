from fastapi import APIRouter
from app.api.v1.endpoints import alunos, provas, whatsapp, usuarios, configuracoes

api_router = APIRouter()

@api_router.get("/")
def status_v1():
    return {"status": "Versão 1 da API operacional"}

api_router.include_router(alunos.router, prefix="/alunos", tags=["Alunos"])
api_router.include_router(provas.router, prefix="/provas", tags=["Provas"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp"])
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários e Autenticação"])
api_router.include_router(configuracoes.router, prefix="/configuracoes", tags=["Configurações"])