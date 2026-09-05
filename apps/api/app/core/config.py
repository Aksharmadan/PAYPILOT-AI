import os
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=env_path, extra="ignore")

    PROJECT_NAME: str = "PayPilot AI"
    DATABASE_URL: str = "postgresql+psycopg2://paypilot:paypilot@localhost:5432/paypilot"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    CORS_ORIGINS: str = "http://localhost:3000"
    GROQ_API_KEY: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
