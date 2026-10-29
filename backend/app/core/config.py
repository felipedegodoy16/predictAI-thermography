from pathlib import Path
from typing import Literal
from urllib.parse import quote, urlsplit, urlunsplit

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "PredictAI | Gestão de Manutenção"
    app_version: str = "1.0.0"
    app_env: str = "development"
    database_url: str
    database_user: str
    database_password: SecretStr
    database_min_pool_size: int = 1
    database_max_pool_size: int = 10
    secret_key: str = Field(min_length=32)
    algorithm: Literal["HS256"] = "HS256"
    access_token_expire_minutes: int = Field(default=30, gt=0)
    refresh_token_expire_days: int = Field(default=7, gt=0)
    reset_password_token_expire_minutes: int = Field(default=5, gt=0)
    smtp_host: str = ""
    smtp_port: int = Field(default=587, gt=0, le=65535)
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    emails_from_email: str = ""
    emails_from_name: str = "Suporte Manutenção"
    frontend_url: str = "http://localhost:3000/reset-password"
    groq_api_key: SecretStr = SecretStr("")
    groq_model: str = "openai/gpt-oss-20b"

    @property
    def database_dsn(self) -> str:
        parsed = urlsplit(self.database_url)
        if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname:
            raise ValueError(
                "DATABASE_URL must be a PostgreSQL URL without embedded credentials."
            )
        if parsed.username is not None or parsed.password is not None:
            raise ValueError(
                "Put database credentials in DATABASE_USER and DATABASE_PASSWORD, "
                "not in DATABASE_URL."
            )

        host = parsed.hostname
        if ":" in host:
            host = f"[{host}]"
        if parsed.port is not None:
            host = f"{host}:{parsed.port}"
        user = quote(self.database_user, safe="")
        password = quote(self.database_password.get_secret_value(), safe="")
        netloc = f"{user}:{password}@{host}"
        return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()


def get_settings() -> Settings:
    return settings
