"""Controle em memória de disparos em segundo plano (cancelamento).

Funciona com um worker Uvicorn (padrão do Compose). Em multi-worker
o cancelamento só afeta o processo que criou o job.
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class DisparoJob:
    id: str
    usuario_id: int
    tipo: str
    cancelado: bool = False
    # PROCESSANDO | CONCLUIDO | CANCELADO | DESCONECTADO
    status: str = "PROCESSANDO"
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


_lock = threading.Lock()
_jobs: dict[str, DisparoJob] = {}


def criar_job(usuario_id: int, tipo: str) -> str:
    job_id = str(uuid.uuid4())
    with _lock:
        _jobs[job_id] = DisparoJob(id=job_id, usuario_id=int(usuario_id), tipo=tipo)
    return job_id


def cancelar_job(job_id: str, usuario_id: int) -> DisparoJob:
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            raise KeyError(job_id)
        if job.usuario_id != int(usuario_id):
            raise PermissionError("Job pertence a outro usuário.")
        if job.status == "CONCLUIDO":
            return job
        job.cancelado = True
        job.status = "CANCELADO"
        return job


def obter_job(job_id: str) -> DisparoJob | None:
    with _lock:
        return _jobs.get(job_id)


def deve_parar(job_id: str | None) -> bool:
    if not job_id:
        return False
    with _lock:
        job = _jobs.get(job_id)
        return bool(job and job.cancelado)


def finalizar_job(
    job_id: str | None,
    *,
    cancelado: bool = False,
    status: str | None = None,
) -> None:
    if not job_id:
        return
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            return
        if cancelado or job.cancelado:
            job.cancelado = True
            job.status = "CANCELADO"
        elif status:
            job.status = status
        elif job.status == "PROCESSANDO":
            job.status = "CONCLUIDO"
