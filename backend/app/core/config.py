from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# localhost, loopback e IPs privados (RFC 1918), com porta opcional.
CORS_LAN_ORIGIN_REGEX = (
    r"^https?://("
    r"localhost|"
    r"127\.0\.0\.1|"
    r"\[::1\]|"
    r"10(\.\d{1,3}){3}|"
    r"192\.168(\.\d{1,3}){2}|"
    r"172\.(1[6-9]|2[0-9]|3[0-1])(\.\d{1,3}){2}"
    r")(:\d+)?$"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    EVOLUTION_API_URL: str = "http://evolution_api:8080"
    EVOLUTION_API_KEY: str
    EVOLUTION_INSTANCE_NAME: str = "hub_escola"
    # Origens CORS explícitas, separadas por vírgula. CORS_ALLOWED_ORIGINS tem prioridade.
    CORS_ALLOWED_ORIGINS: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Libera o frontend acessado por IP da rede local (ex.: http://192.168.0.10:5173).
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
