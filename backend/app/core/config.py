from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    EVOLUTION_API_URL: str = "http://evolution_api:8080"
    EVOLUTION_API_KEY: str
    EVOLUTION_INSTANCE_NAME: str = "hub_escola"
    # Origens CORS separadas por vírgula
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    ADMIN_EMAIL: str = "admin@escola.com"
    ADMIN_PASSWORD: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
