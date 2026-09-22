from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# localhost, loopback e qualquer IPv4 (redes locais fora do RFC 1918, ex.: 193.168.x.x).
# Domínios continuam exigindo lista explícita em CORS_ALLOWED_ORIGINS / CORS_ORIGINS.
CORS_LAN_ORIGIN_REGEX = (
    r"^https?://("
    r"localhost|"
    r"127\.0\.0\.1|"
    r"\[::1\]|"
    r"(\d{1,3}\.){3}\d{1,3}"
    r")(:\d+)?$"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    EVOLUTION_API_URL: str = "http://evolution_api:8080"
    EVOLUTION_API_KEY: str
    EVOLUTION_INSTANCE_NAME: str = "hub_escola"
    # Intervalo entre destinatários no disparo em massa (anti-ban WhatsApp/Baileys).
    WHATSAPP_DELAY_ENTRE_MS: int = 4000
    WHATSAPP_DELAY_JITTER_MS: int = 2000
    # Pausa extra a cada N destinatários processados (0 = desliga).
    WHATSAPP_PAUSA_LOTE_A_CADA: int = 40
    WHATSAPP_PAUSA_LOTE_MS: int = 30000
    # Checa connectionState a cada N envios (1 = sempre; 0 = só no início).
    WHATSAPP_CHECK_CONEXAO_A_CADA: int = 10
    # Simulação de "digitando" no payload da Evolution (por mensagem).
    WHATSAPP_PRESENCE_DELAY_MS: int = 1500
    # Origens CORS explícitas, separadas por vírgula. CORS_ALLOWED_ORIGINS tem prioridade.
    CORS_ALLOWED_ORIGINS: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Libera o frontend acessado por IP (ex.: http://192.168.0.10:5173 ou http://193.168.0.85:5173).
    CORS_ALLOW_LAN: bool = True
    ADMIN_EMAIL: str = "admin@escola.com"
    ADMIN_PASSWORD: str = ""

    @staticmethod
    def _parse_origins(raw: str) -> list[str]:
        return [o.strip() for o in (raw or "").split(",") if o.strip()]

    @field_validator("CORS_ALLOWED_ORIGINS", "CORS_ORIGINS")
    @classmethod
    def recusar_wildcard_cors(cls, value: str) -> str:
        origens = cls._parse_origins(value)
        if "*" in origens:
            raise ValueError(
                "CORS não pode usar '*' com credenciais. Liste origens explícitas, separadas por vírgula."
            )
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        origens = self._parse_origins(self.CORS_ALLOWED_ORIGINS) or self._parse_origins(self.CORS_ORIGINS)
        if not origens:
            raise ValueError(
                "Defina CORS_ALLOWED_ORIGINS (ou CORS_ORIGINS) com origens explícitas, separadas por vírgula."
            )
        return origens

    @property
    def cors_allow_origin_regex(self) -> str | None:
        if not self.CORS_ALLOW_LAN:
            return None
        return CORS_LAN_ORIGIN_REGEX


settings = Settings()
