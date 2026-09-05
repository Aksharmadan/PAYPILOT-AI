import os
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".env",
)


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

    @property
    def database_url_resolved(self) -> str:
        """
        Return a database URL that is always compatible with psycopg2:

        1. Converts bare postgres:// or postgresql:// → postgresql+psycopg2://
           (Supabase and Render both provide the bare form by default)

        2. Appends ?sslmode=require for non-localhost connections
           (Supabase rejects connections without SSL)
        """
        url = self.DATABASE_URL

        # Normalise the scheme so SQLAlchemy always uses the psycopg2 driver
        if url.startswith("postgres://"):
            url = "postgresql+psycopg2://" + url[len("postgres://"):]
        elif url.startswith("postgresql://"):
            url = "postgresql+psycopg2://" + url[len("postgresql://"):]

        # Add sslmode=require for hosted databases (non-localhost)
        is_local = (
            "localhost" in url
            or "127.0.0.1" in url
            or "@postgres:" in url   # docker-compose service name
        )
        if not is_local and "sslmode" not in url:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}sslmode=require"

        return url


settings = Settings()
