import pytest
from pydantic import ValidationError

from app.core.config import Settings

BASE = dict(
    DATABASE_URL="postgresql://user:pass@localhost:5432/test",
    SECRET_KEY="test-secret-key",
    EVOLUTION_API_KEY="test-evolution-key",
)


def test_cors_lista_explicita_de_allowed_origins():
    settings = Settings(**BASE, CORS_ALLOWED_ORIGINS="http://localhost:5173, http://127.0.0.1:5173")
    assert settings.cors_origins_list == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_cors_fallback_para_cors_origins():
    settings = Settings(**BASE, CORS_ALLOWED_ORIGINS="", CORS_ORIGINS="http://localhost:5173")
    assert settings.cors_origins_list == ["http://localhost:5173"]


def test_cors_rejeita_wildcard_em_allowed_origins():
    with pytest.raises(ValidationError):
        Settings(**BASE, CORS_ALLOWED_ORIGINS="*")


def test_cors_rejeita_wildcard_na_lista():
    with pytest.raises(ValidationError):
        Settings(**BASE, CORS_ORIGINS="http://localhost:5173,*")


def test_cors_regex_lan_libera_acesso_por_ip():
    import re

    settings = Settings(**BASE)
    regex = re.compile(settings.cors_allow_origin_regex)
    assert regex.fullmatch("http://192.168.0.10:5173")
    assert regex.fullmatch("http://10.0.0.5:5173")
    assert regex.fullmatch("http://172.16.1.2:5173")
    assert regex.fullmatch("http://193.168.0.85:5173")
    assert regex.fullmatch("http://localhost:5173")
    assert not regex.fullmatch("https://evil.example.com")
    assert not regex.fullmatch("http://app.escola.local:5173")


def test_cors_regex_lan_pode_ser_desligado():
    settings = Settings(**BASE, CORS_ALLOW_LAN=False)
    assert settings.cors_allow_origin_regex is None
