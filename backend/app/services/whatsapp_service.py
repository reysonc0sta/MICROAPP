import time
import requests
from fastapi import HTTPException

from app.core.config import settings

EVOLUTION_URL = settings.EVOLUTION_API_URL.rstrip("/")
API_KEY = settings.EVOLUTION_API_KEY
INSTANCE_NAME = settings.EVOLUTION_INSTANCE_NAME

MENSAGEM_DESCONECTADO = (
    "WhatsApp desconectado. Conecte o aparelho pelo QR Code antes de enviar planilhas ou disparar mensagens."
)


def _headers() -> dict:
    return {
        "apikey": API_KEY,
        "Content-Type": "application/json",
    }


def _extrair_estado(payload: dict) -> str:
    instancia = payload.get("instance") if isinstance(payload, dict) else None
    if isinstance(instancia, dict) and instancia.get("state"):
        return str(instancia["state"]).lower()
    if isinstance(payload, dict) and payload.get("state"):
        return str(payload["state"]).lower()
    return "close"


def obter_estado_conexao() -> str:
    try:
        response = requests.get(
            f"{EVOLUTION_URL}/instance/connectionState/{INSTANCE_NAME}",
            headers=_headers(),
            timeout=15,
        )
        if response.status_code != 200:
            return "close"
        return _extrair_estado(response.json())
    except requests.RequestException:
        return "error"


def whatsapp_esta_conectado() -> bool:
    return obter_estado_conexao() in {"open", "connected"}


def exigir_whatsapp_conectado() -> None:
    if not whatsapp_esta_conectado():
        raise HTTPException(status_code=409, detail=MENSAGEM_DESCONECTADO)


def _instancia_existe() -> bool:
    try:
        response = requests.get(
            f"{EVOLUTION_URL}/instance/fetchInstances",
            headers=_headers(),
            timeout=15,
        )
        if response.status_code != 200:
            return False
        dados = response.json()
        if isinstance(dados, list):
            return any(
                (item.get("name") or item.get("instanceName") or item.get("instance", {}).get("instanceName"))
                == INSTANCE_NAME
                for item in dados
                if isinstance(item, dict)
            )
        return False
    except requests.RequestException:
        return False


def _criar_instancia() -> dict:
    response = requests.post(
        f"{EVOLUTION_URL}/instance/create",
        headers=_headers(),
        json={
            "instanceName": INSTANCE_NAME,
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS",
        },
        timeout=20,
    )
    if response.status_code in (200, 201):
        return response.json() if response.content else {}
    return {}


def _logout_instancia() -> None:
    try:
        requests.delete(
            f"{EVOLUTION_URL}/instance/logout/{INSTANCE_NAME}",
            headers=_headers(),
            timeout=20,
        )
    except requests.RequestException:
        pass


def _apagar_instancia() -> None:
    try:
        requests.delete(
            f"{EVOLUTION_URL}/instance/delete/{INSTANCE_NAME}",
            headers=_headers(),
            timeout=20,
        )
    except requests.RequestException:
        pass


def _extrair_qr(payload: dict) -> str | None:
    if not isinstance(payload, dict):
        return None

    qrcode = payload.get("qrcode")
    candidatos = [
        payload.get("base64"),
        payload.get("code"),
        qrcode.get("base64") if isinstance(qrcode, dict) else None,
        qrcode.get("code") if isinstance(qrcode, dict) else None,
        qrcode if isinstance(qrcode, str) else None,
    ]

    for valor in candidatos:
        if not valor or not isinstance(valor, str):
            continue
        if valor.startswith("data:image"):
            return valor
        if len(valor) > 80 and not valor.startswith("2@"):
            return f"data:image/png;base64,{valor}"
    return None


def _obter_qr_atual() -> tuple[dict, str | None]:
    response = requests.get(
        f"{EVOLUTION_URL}/instance/connect/{INSTANCE_NAME}",
        headers=_headers(),
        timeout=20,
    )
    dados = response.json() if response.content else {}
    return dados, _extrair_qr(dados)


def conectar_whatsapp(forcar_novo: bool = False) -> dict:
    estado = obter_estado_conexao()
    if estado == "error":
        raise HTTPException(
            status_code=502,
            detail="Não foi possível falar com a Evolution API. Verifique se o serviço está no ar.",
        )

    if estado in {"open", "connected"} and not forcar_novo:
        return {
            "state": "open",
            "instance": {"state": "open"},
            "qrcode": None,
            "base64": None,
        }

    qr_criacao = None
    if forcar_novo:
        _logout_instancia()
        _apagar_instancia()
        time.sleep(1.5)
        criado = _criar_instancia()
        qr_criacao = _extrair_qr(criado)
        time.sleep(0.8)
    elif not _instancia_existe():
        criado = _criar_instancia()
        qr_criacao = _extrair_qr(criado)
        time.sleep(0.8)

    try:
        dados, qr = _obter_qr_atual()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Falha ao obter QR Code: {exc}") from exc

    qr = qr or qr_criacao
    estado_atual = obter_estado_conexao()
    if estado_atual in {"open", "connected"}:
        return {
            "state": "open",
            "instance": {"state": "open"},
            "qrcode": None,
            "base64": None,
        }

    return {
        "state": estado_atual if estado_atual not in {"error"} else "close",
        "instance": {"state": estado_atual if estado_atual not in {"error"} else "close"},
        "qrcode": {"base64": qr} if qr else None,
        "base64": qr,
        "pairingCode": dados.get("pairingCode") if isinstance(dados, dict) else None,
    }


def disparar_mensagem_real(numero: str, texto: str) -> bool:
    """Envia uma mensagem de texto via Evolution API (POST /message/sendText/{instance})."""
    url = f"{EVOLUTION_URL}/message/sendText/{INSTANCE_NAME}"
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
