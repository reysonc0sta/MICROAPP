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
