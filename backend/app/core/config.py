from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "sua_chave_secreta_aqui"

    class Config:
        env_file = ".env"

settings = Settings()