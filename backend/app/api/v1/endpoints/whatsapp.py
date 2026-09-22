import asyncio
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import get_current_user, require_cargos
from app.core.validacao_arquivo import calcular_sha256, validar_magic_number_xlsx
from app.models.domain import Aluno, Materia, ProvaResultado, Usuario
from app.services.auditoria import registrar_log
from app.services.config_service import obter_template_lembrete, obter_template_mensagem
from app.services.disparo_jobs import cancelar_job, criar_job, obter_job
from app.services.historico_service import registrar_envio_whatsapp
from app.services.lembrete_service import (
    TURNOS_VALIDOS,
    preview_lembretes_excel,
    processar_lembretes_excel,
)
from app.services.reposicao_service import (
    preview_disparos_faltas_excel,
    processar_disparos_faltas_excel,
)
from app.services.telefones import candidatos_envio, limpar_telefone
from app.services.whatsapp_service import (
    conectar_whatsapp,
    disparar_mensagem_real,
    exigir_whatsapp_conectado,
    nome_instancia_usuario,
    obter_estado_conexao,
    whatsapp_esta_conectado,
)

router = APIRouter()
# Disparo operacional (faltas, lembretes, mensagem direta) — opção B
whatsapp_ops_deps = Depends(require_cargos("ADM", "DIRETOR", "PROFESSOR", "ASSISTENTE"))

EXTENSOES_PLANILHA = {".xls", ".xlsx"}
EXTENSOES_IMAGEM = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MIME_IMAGEM = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}
LIMITE_IMAGEM_BYTES = 5 * 1024 * 1024  # 5 MB


class EnviarDiretoBody(BaseModel):
    numero: str = Field(..., min_length=8, description="Número com DDI/DDD, ex: 5511999999999")
    texto: str = Field(..., min_length=1, description="Mensagem a ser enviada")


def _validar_planilha(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido.")
    sufixo = Path(file.filename).suffix.lower()
    if sufixo not in EXTENSOES_PLANILHA:
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel válido (.xls ou .xlsx).")
    return sufixo


def _validar_imagem(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Envie uma imagem válida.")
    sufixo = Path(file.filename).suffix.lower()
    if sufixo not in EXTENSOES_IMAGEM:
        raise HTTPException(
            status_code=400,
            detail="Envie apenas imagens JPG, PNG, WEBP ou GIF.",
        )
    content_type = (file.content_type or "").lower()
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="O arquivo de mídia precisa ser uma imagem.")
    return sufixo


async def _salvar_upload_seguro(file: UploadFile) -> str:
    sufixo = _validar_planilha(file)
    fd, path = tempfile.mkstemp(prefix="microapp_", suffix=sufixo)
    os.close(fd)
    try:
        with open(path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                buffer.write(chunk)
    except Exception:
        if os.path.exists(path):
            os.remove(path)
        raise

    if sufixo == ".xlsx":
        try:
            validar_magic_number_xlsx(path)
        except ValueError as exc:
            os.remove(path)
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    return path


async def _salvar_imagem_segura(file: UploadFile) -> tuple[str, str, str]:
    """Salva imagem temporária e devolve (caminho, mimetype, nome_arquivo)."""
    sufixo = _validar_imagem(file)
    fd, path = tempfile.mkstemp(prefix="microapp_img_", suffix=sufixo)
    os.close(fd)
    total = 0
    try:
        with open(path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > LIMITE_IMAGEM_BYTES:
                    raise HTTPException(
                        status_code=400,
                        detail="A imagem deve ter no máximo 5 MB.",
                    )
                buffer.write(chunk)
    except HTTPException:
        if os.path.exists(path):
            os.remove(path)
        raise
    except Exception:
        if os.path.exists(path):
            os.remove(path)
        raise

    if total == 0:
        os.remove(path)
        raise HTTPException(status_code=400, detail="A imagem enviada está vazia.")

    mimetype = MIME_IMAGEM.get(sufixo, "image/jpeg")
    nome = Path(file.filename).name
    return path, mimetype, nome


def _job_disparar_faltas(caminho: str, instance_name: str, job_id: str | None = None) -> None:
    db = SessionLocal()
    try:
        processar_disparos_faltas_excel(caminho, db, instance_name, job_id=job_id)
    finally:
        db.close()
        if os.path.exists(caminho):
            os.remove(caminho)


def _job_disparar_lembretes(
    caminho: str,
    turno: str,
    instance_name: str,
    caminho_imagem: str | None = None,
    imagem_mimetype: str | None = None,
    imagem_nome: str | None = None,
    job_id: str | None = None,
) -> None:
    db = SessionLocal()
    try:
        processar_lembretes_excel(
            caminho,
            db,
            turno,
            instance_name,
            caminho_imagem=caminho_imagem,
            imagem_mimetype=imagem_mimetype,
            imagem_nome=imagem_nome,
            job_id=job_id,
        )
    finally:
        db.close()
        if os.path.exists(caminho):
            os.remove(caminho)
        if caminho_imagem and os.path.exists(caminho_imagem):
            os.remove(caminho_imagem)


@router.get("/status")
def status_whatsapp(usuario: Usuario = Depends(get_current_user)):
    instance_name = nome_instancia_usuario(usuario)
    estado = obter_estado_conexao(instance_name)
    conectado = whatsapp_esta_conectado(instance_name)
    return {
        "state": "open" if conectado else estado,
        "instance": {"state": "open" if conectado else estado, "instanceName": instance_name},
        "conectado": conectado,
        "instanceName": instance_name,
    }


@router.get("/conectar")
def conectar(forcar: bool = False, usuario: Usuario = Depends(get_current_user)):
    """Cria/consulta a instância Evolution deste usuário e retorna o QR Code."""
    instance_name = nome_instancia_usuario(usuario)
    return conectar_whatsapp(instance_name, forcar_novo=forcar)


@router.post("/notificar-nota")
def notificar_nota(
    aluno_id: int = Query(...),
    materia_id: int = Query(...),
    usuario: Usuario = whatsapp_ops_deps,
    db: Session = Depends(get_db),
):
    """Envia a última nota do aluno na matéria via WhatsApp."""
    instance_name = nome_instancia_usuario(usuario)
    exigir_whatsapp_conectado(instance_name)

    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")

    materia = db.query(Materia).filter(Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Matéria não encontrada.")

    prova = (
        db.query(ProvaResultado)
        .filter(ProvaResultado.aluno_id == aluno_id, ProvaResultado.materia_id == materia_id)
        .order_by(ProvaResultado.tentativa.desc())
        .first()
    )
    if not prova:
        raise HTTPException(status_code=400, detail="Não há nota lançada para esta matéria.")

    canais = candidatos_envio(aluno.telefone_pessoal, aluno.telefone_comercial)
    if not canais:
        raise HTTPException(status_code=400, detail="Aluno sem telefone válido cadastrado.")

    primeiro_nome = aluno.nome.split()[0].title()
    texto = (
        f"Olá, {primeiro_nome}! Sua nota em {materia.nome} foi {prova.nota} "
        f"({prova.tentativa}ª tentativa)."
    )

    enviado = False
    canal_usado = canais[0]
    for canal in canais:
        canal_usado = canal
        if disparar_mensagem_real(canal["numero"], texto, instance_name):
            enviado = True
            break

    registrar_envio_whatsapp(
        db,
        numero=canal_usado["numero"],
        canal=canal_usado["canal"],
        usou_fallback=canal_usado["usou_fallback"],
        texto=texto,
        status_final="SUCESSO" if enviado else "FALHA_AMBOS",
        nome_destino=aluno.nome,
        aluno_id=aluno.id,
    )
    if not enviado:
        raise HTTPException(
            status_code=502,
            detail="Falha ao enviar a nota pela Evolution API. Verifique a conexão.",
        )
    return {"sucesso": True, "mensagem": "Nota enviada via WhatsApp.", "instanceName": instance_name}


@router.post("/enviar-direto")
def enviar_direto(
    body: EnviarDiretoBody,
    usuario: Usuario = whatsapp_ops_deps,
    db: Session = Depends(get_db),
):
    """Dispara uma mensagem individual via Evolution API na instância do usuário."""
    instance_name = nome_instancia_usuario(usuario)
    exigir_whatsapp_conectado(instance_name)
    numero = limpar_telefone(body.numero)
    if not numero:
        raise HTTPException(status_code=400, detail="Número de telefone inválido.")

    enviado = disparar_mensagem_real(numero, body.texto, instance_name)
    registrar_envio_whatsapp(
        db,
        numero=numero,
        canal="PESSOAL",
        usou_fallback=False,
        texto=body.texto,
        status_final="SUCESSO" if enviado else "FALHA_AMBOS",
    )
    if not enviado:
        raise HTTPException(
            status_code=502,
            detail="Falha ao enviar mensagem pela Evolution API. Verifique a conexão e tente novamente.",
        )
    return {
        "sucesso": True,
        "numero": numero,
        "mensagem": "Mensagem enviada com sucesso.",
        "instanceName": instance_name,
    }


@router.post("/preview-planilha")
async def preview_planilha(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = whatsapp_ops_deps,
):
    """Lê a planilha e devolve a lista de quem receberia mensagem, sem disparar nada."""
    temp_path = await _salvar_upload_seguro(file)
    try:
        template = obter_template_mensagem(db)
        resultado = await asyncio.to_thread(preview_disparos_faltas_excel, temp_path, template)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {
        "nome_arquivo": file.filename,
        **resultado,
    }


@router.post("/preview-lembretes")
async def preview_lembretes(
    file: UploadFile = File(...),
    turno: str = Form("TODOS"),
    db: Session = Depends(get_db),
    _: Usuario = whatsapp_ops_deps,
):
    """Prévia dos alunos do turno selecionado que receberiam o lembrete."""
    turno_norm = (turno or "TODOS").strip().upper()
    if turno_norm not in TURNOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Turno inválido. Use MANHA, TARDE, NOITE ou TODOS.")

    temp_path = await _salvar_upload_seguro(file)
    try:
        template = obter_template_lembrete(db)
        resultado = await asyncio.to_thread(preview_lembretes_excel, temp_path, turno_norm, template)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {
        "nome_arquivo": file.filename,
        **resultado,
    }


@router.post("/disparar-lembretes", status_code=202)
async def disparar_lembretes(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    turno: str = Form("TODOS"),
    imagem: UploadFile | None = File(None),
    usuario: Usuario = whatsapp_ops_deps,
    db: Session = Depends(get_db),
):
    instance_name = nome_instancia_usuario(usuario)
    exigir_whatsapp_conectado(instance_name)

    turno_norm = (turno or "TODOS").strip().upper()
    if turno_norm not in TURNOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Turno inválido. Use MANHA, TARDE, NOITE ou TODOS.")

    temp_path = await _salvar_upload_seguro(file)
    caminho_imagem = None
    imagem_mimetype = None
    imagem_nome = None
    try:
        if imagem is not None and imagem.filename:
            caminho_imagem, imagem_mimetype, imagem_nome = await _salvar_imagem_segura(imagem)
    except Exception:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise

    hash_arquivo = calcular_sha256(temp_path)
    job_id = criar_job(usuario.id, "lembretes")
    background_tasks.add_task(
        _job_disparar_lembretes,
        temp_path,
        turno_norm,
        instance_name,
        caminho_imagem,
        imagem_mimetype,
        imagem_nome,
        job_id,
    )
    registrar_log(
        db,
        usuario=usuario,
        acao="UPLOAD",
        entidade="whatsapp",
        entidade_id=None,
        descricao=f'Disparou lembretes do turno {turno_norm} com a planilha "{file.filename}"',
        valor_novo={
            "nome_arquivo": file.filename,
            "turno": turno_norm,
            "sha256": hash_arquivo,
            "com_imagem": bool(caminho_imagem),
            "imagem": imagem_nome,
            "job_id": job_id,
        },
    )

    return {
        "mensagem": f"Lembretes do turno {turno_norm} iniciados em segundo plano. O histórico será gravado no banco.",
        "status": "PROCESSANDO",
        "nome_arquivo": file.filename,
        "turno": turno_norm,
        "com_imagem": bool(caminho_imagem),
        "job_id": job_id,
        "instanceName": instance_name,
    }


@router.post("/upload-planilha", status_code=202)
async def upload_planilha(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    usuario: Usuario = whatsapp_ops_deps,
    db: Session = Depends(get_db),
):
    instance_name = nome_instancia_usuario(usuario)
    exigir_whatsapp_conectado(instance_name)
    temp_path = await _salvar_upload_seguro(file)
    hash_arquivo = calcular_sha256(temp_path)
    job_id = criar_job(usuario.id, "faltas")
    background_tasks.add_task(_job_disparar_faltas, temp_path, instance_name, job_id)
    registrar_log(
        db,
        usuario=usuario,
        acao="UPLOAD",
        entidade="whatsapp",
        entidade_id=None,
        descricao=f'Disparou mensagens de falta com a planilha "{file.filename}"',
        valor_novo={"nome_arquivo": file.filename, "sha256": hash_arquivo, "job_id": job_id},
    )
    return {
        "mensagem": "Disparo de reposição iniciado em segundo plano. O histórico será gravado no banco.",
        "status": "PROCESSANDO",
        "nome_arquivo": file.filename,
        "job_id": job_id,
        "instanceName": instance_name,
    }


@router.post("/cancelar-disparo/{job_id}")
def cancelar_disparo(
    job_id: str,
    usuario: Usuario = whatsapp_ops_deps,
):
    """Solicita o cancelamento de um disparo em andamento (para no próximo aluno)."""
    try:
        job = cancelar_job(job_id, usuario.id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Disparo não encontrado ou já finalizado.") from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail="Sem permissão para cancelar este disparo.") from exc

    if job.status == "CONCLUIDO":
        return {
            "job_id": job.id,
            "status": job.status,
            "mensagem": "O disparo já havia sido concluído.",
        }

    return {
        "job_id": job.id,
        "status": job.status,
        "mensagem": "Cancelamento solicitado. Os envios param após a mensagem em andamento.",
    }


@router.get("/status-disparo/{job_id}")
def status_disparo(
    job_id: str,
    usuario: Usuario = whatsapp_ops_deps,
):
    job = obter_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Disparo não encontrado.")
    if job.usuario_id != int(usuario.id):
        raise HTTPException(status_code=403, detail="Sem permissão para consultar este disparo.")
    return {
        "job_id": job.id,
        "tipo": job.tipo,
        "status": job.status,
        "cancelado": job.cancelado,
    }
