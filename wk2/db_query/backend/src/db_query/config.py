"""Application configuration using pydantic-settings."""

import logging
import os
import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Find .env file in parent directories
# Backend runs from db_query/backend, .env is in db_query/
# Path: db_query/backend/src/db_query/config.py -> db_query/.env
current_dir = Path(__file__).resolve().parent  # db_query/backend/src/db_query/
env_file = current_dir.parent.parent.parent / ".env"  # db_query/.env


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(env_file) if env_file.exists() else ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # OpenAI API Configuration (optional, only needed for Phase 5)
    openai_api_key: str | None = None
    openai_base_url: str | None = None  # Custom API base URL (e.g., for Azure OpenAI, local proxy)

    # Database Configuration
    database_url: str = "sqlite:///./db_query.db"

    # Server Configuration
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # CORS Configuration
    cors_origins: str = "*"

    # Logging Configuration
    log_level: str = "INFO"

    # Query Execution Settings
    max_query_results: int = 1000
    query_timeout_seconds: int = 30

    # LLM Settings
    llm_model: str = "gpt-4"
    llm_temperature: float = 0.2
    llm_max_tokens: int = 1000

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins string into list."""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Global settings instance
settings = Settings()


def configure_logging() -> None:
    """
    Configure structured logging based on settings.

    Sets up logging with JSON formatting for production and
    human-readable format for development.
    """
    log_level = settings.log_level.upper()

    # Configure logging format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Create handler with appropriate level
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    # Create formatter and add it to handler
    formatter = logging.Formatter(log_format)
    handler.setFormatter(formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(handler)

    # Reduce noise from external libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    logging.info(f"Logging configured with level: {log_level}")
