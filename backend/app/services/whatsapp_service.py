import base64
import io
import re
import time

import qrcode
import requests
from fastapi import HTTPException

from app.core.config import settings
from app.models.domain import Usuario

EVOLUTION_URL = settings.EVOLUTION_API_URL.rstrip("/")
API_KEY = settings.EVOLUTION_API_KEY

MENSAGEM_DESCONECTADO = (
    "WhatsApp desconectado. Conecte o aparelho pelo QR Code antes de enviar planilhas ou disparar mensagens."
)


def nome_instancia_usuario(usuario: Usuario | int) -> str:
    """Cada login tem sua própria instância Evolution (número WhatsApp isolado)."""
    usuario_id = usuario if isinstance(usuario, int) else usuario.id
    return f"user_{int(usuario_id)}"


def _headers() -> dict:
    return {
        "apikey": API_KEY,
        "Content-Type": "application/json",
    }


def _parse_json(response: requests.Response) -> dict:
    if not response.content:
        return {}
    try:
        dados = response.json()
    except ValueError:
        return {}
    if isinstance(dados, dict):
        return dados
    if isinstance(dados, list) and dados and isinstance(dados[0], dict):
        return dados[0]
    return {}


def _detalhe_evolution(dados: dict, response: requests.Response) -> str:
    for chave in ("message", "error", "response"):
        valor = dados.get(chave)
        if isinstance(valor, str) and valor.strip():
            return valor
        if isinstance(valor, dict):
            interno = valor.get("message") or valor.get("error")
            if interno:
                return str(interno)
        if isinstance(valor, list) and valor:
            return str(valor[0])
    texto = (response.text or "").strip()
    return texto[:400] if texto else f"HTTP {response.status_code}"


def _extrair_estado(payload: dict) -> str:
    instancia = payload.get("instance") if isinstance(payload, dict) else None
    if isinstance(instancia, dict) and instancia.get("state"):
        return str(instancia["state"]).lower()
    if isinstance(payload, dict) and payload.get("state"):
        return str(payload["state"]).lower()
    return "close"


def obter_estado_conexao(instance_name: str) -> str:
    try:
        response = requests.get(
            f"{EVOLUTION_URL}/instance/connectionState/{instance_name}",
            headers=_headers(),
            timeout=15,
        )
        if response.status_code != 200:
            return "close"
        return _extrair_estado(response.json())
    except requests.RequestException:
        return "error"


def whatsapp_esta_conectado(instance_name: str) -> bool:
    return obter_estado_conexao(instance_name) in {"open", "connected"}


def exigir_whatsapp_conectado(instance_name: str) -> None:
    if not whatsapp_esta_conectado(instance_name):
        raise HTTPException(status_code=409, detail=MENSAGEM_DESCONECTADO)


def _nome_instancia(item: dict) -> str:
    instancia = item.get("instance") if isinstance(item.get("instance"), dict) else {}
    return str(
        item.get("name")
        or item.get("instanceName")
        or instancia.get("instanceName")
        or instancia.get("name")
        or ""
    )


def _instancia_existe(instance_name: str) -> bool:
    try:
        response = requests.get(
            f"{EVOLUTION_URL}/instance/fetchInstances",
            headers=_headers(),
            timeout=15,
        )
        if response.status_code != 200:
            return False
        dados = response.json()
        itens = dados if isinstance(dados, list) else dados.get("value") if isinstance(dados, dict) else []
        if not isinstance(itens, list):
            return False
        return any(_nome_instancia(item) == instance_name for item in itens if isinstance(item, dict))
    except requests.RequestException:
        return False


def _criar_instancia(instance_name: str) -> dict:
    response = requests.post(
        f"{EVOLUTION_URL}/instance/create",
        headers=_headers(),
        json={
            "instanceName": instance_name,
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS",
        },
        timeout=30,
    )
    dados = _parse_json(response)
    if response.status_code in (200, 201, 403, 409):
        return dados
    raise HTTPException(
        status_code=502,
        detail=f"Falha ao criar instância na Evolution API: {_detalhe_evolution(dados, response)}",
    )


def _logout_instancia(instance_name: str) -> None:
    try:
        requests.delete(
            f"{EVOLUTION_URL}/instance/logout/{instance_name}",
            headers=_headers(),
            timeout=20,
        )
    except requests.RequestException:
        pass


def _apagar_instancia(instance_name: str) -> None:
    try:
        requests.delete(
            f"{EVOLUTION_URL}/instance/delete/{instance_name}",
            headers=_headers(),
            timeout=20,
        )
    except requests.RequestException:
        pass
    for _ in range(10):
        if not _instancia_existe(instance_name):
            return
        time.sleep(0.4)


def _gerar_qr_data_uri(conteudo: str) -> str | None:
    try:
        imagem = qrcode.make(conteudo)
        buffer = io.BytesIO()
        imagem.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/png;base64,{encoded}"
    except Exception:
        return None


def _extrair_pairing(payload: dict) -> str | None:
    if not isinstance(payload, dict):
        return None
    qrcode_payload = payload.get("qrcode")
    candidatos = [
        payload.get("pairingCode"),
        qrcode_payload.get("pairingCode") if isinstance(qrcode_payload, dict) else None,
    ]
    for valor in candidatos:
        if isinstance(valor, str) and valor.strip():
            return valor.strip()
    return None


def _extrair_qr(payload: dict) -> str | None:
    if not isinstance(payload, dict):
        return None

    qrcode_payload = payload.get("qrcode")
    candidatos = [
        payload.get("base64"),
        qrcode_payload.get("base64") if isinstance(qrcode_payload, dict) else None,
        payload.get("code"),
        qrcode_payload.get("code") if isinstance(qrcode_payload, dict) else None,
        qrcode_payload if isinstance(qrcode_payload, str) else None,
    ]

    for valor in candidatos:
        if not valor or not isinstance(valor, str):
            continue
        if valor.startswith("data:image"):
            return valor
        if valor.startswith("iVBOR") or valor.startswith("/9j/"):
            return f"data:image/png;base64,{valor}"
        if valor.startswith("2@"):
            gerado = _gerar_qr_data_uri(valor)
            if gerado:
                return gerado
        if len(valor) > 80 and not valor.startswith("2@"):
            return f"data:image/png;base64,{valor}"
    return None


def _obter_qr_atual(instance_name: str) -> tuple[dict, str | None]:
    response = requests.get(
        f"{EVOLUTION_URL}/instance/connect/{instance_name}",
        headers=_headers(),
        timeout=25,
    )
    dados = _parse_json(response)
    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Falha ao obter QR Code: {_detalhe_evolution(dados, response)}",
        )
    return dados, _extrair_qr(dados)


def _aguardar_qr(instance_name: str, qr_inicial: str | None = None) -> tuple[dict, str | None]:
    if qr_inicial:
        return {}, qr_inicial

    dados: dict = {}
    qr = None
    ultimo_erro: Exception | None = None
    for _ in range(8):
        try:
            dados, qr = _obter_qr_atual(instance_name)
        except HTTPException as exc:
            ultimo_erro = exc
            time.sleep(1.5)
            continue
        except requests.RequestException as exc:
            ultimo_erro = exc
            time.sleep(1.5)
            continue

        if qr:
            return dados, qr
        if obter_estado_conexao(instance_name) in {"open", "connected"}:
            return dados, None
        time.sleep(1.5)

    if qr or dados:
        return dados, qr
    if isinstance(ultimo_erro, HTTPException):
        raise ultimo_erro
    if ultimo_erro:
        raise HTTPException(status_code=502, detail=f"Falha ao obter QR Code: {ultimo_erro}") from ultimo_erro
    return dados, qr


def conectar_whatsapp(instance_name: str, forcar_novo: bool = False) -> dict:
    # Sanitiza nome (Evolution costuma rejeitar caracteres especiais)
    instance_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", instance_name)

    estado = obter_estado_conexao(instance_name)
    if estado == "error":
        raise HTTPException(
            status_code=502,
            detail="Não foi possível falar com a Evolution API. Verifique se o serviço está no ar.",
        )

    if estado in {"open", "connected"} and not forcar_novo:
        return {
            "state": "open",
            "instance": {"state": "open", "instanceName": instance_name},
            "qrcode": None,
            "base64": None,
            "instanceName": instance_name,
        }

    qr_criacao = None
    if forcar_novo:
        _logout_instancia(instance_name)
        _apagar_instancia(instance_name)
        criado = _criar_instancia(instance_name)
        qr_criacao = _extrair_qr(criado)
    elif not _instancia_existe(instance_name):
        criado = _criar_instancia(instance_name)
        qr_criacao = _extrair_qr(criado)

    try:
        dados, qr = _aguardar_qr(instance_name, qr_criacao)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Falha ao obter QR Code: {exc}") from exc

    estado_atual = obter_estado_conexao(instance_name)
    if estado_atual in {"open", "connected"}:
        return {
            "state": "open",
            "instance": {"state": "open", "instanceName": instance_name},
            "qrcode": None,
            "base64": None,
            "instanceName": instance_name,
        }

    pairing = _extrair_pairing(dados) if isinstance(dados, dict) else None
    return {
        "state": estado_atual if estado_atual not in {"error"} else "close",
        "instance": {
            "state": estado_atual if estado_atual not in {"error"} else "close",
            "instanceName": instance_name,
        },
        "qrcode": {"base64": qr} if qr else None,
        "base64": qr,
        "pairingCode": pairing,
        "instanceName": instance_name,
    }


def disparar_mensagem_real(numero: str, texto: str, instance_name: str) -> bool:
    """Envia uma mensagem de texto via Evolution API (POST /message/sendText/{instance})."""
    url = f"{EVOLUTION_URL}/message/sendText/{instance_name}"
    payload = {
        "number": numero,
        "text": texto,
        "options": {
            "delay": 1200,
            "presence": "composing",
        },
        "textMessage": {
            "text": texto,
        },
    }
    try:
        response = requests.post(
            url,
            json=payload,
            headers=_headers(),
            timeout=15,
        )
        return response.status_code in (200, 201)
    except requests.Timeout as exc:
        print(f"[ERRO EVOLUTION] Timeout (15s) ao enviar para {numero}: {exc}")
        return False
    except requests.RequestException as exc:
        print(f"[ERRO EVOLUTION] Falha ao enviar para {numero}: {exc}")
        return False
    except Exception as exc:
        print(f"[ERRO EVOLUTION] Erro inesperado ao enviar para {numero}: {exc}")
        return False
