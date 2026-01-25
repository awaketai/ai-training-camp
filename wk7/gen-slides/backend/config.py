from pydantic_settings import BaseSettings
from pathlib import Path


# Get the backend directory
BACKEND_DIR = Path(__file__).parent
# Get the project root (gen-slides/)
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    slides_dir: str = "./slides"

    # Image generation settings
    image_generator_type: str = "gemini"  # Options: "gemini", "qianwen"

    # Gemini settings
    gemini_api_key: str = ""
    gemini_image_model: str = "gemini-2.0-flash-exp-image-generation"

    # Qianwen (通义千问) settings
    qianwen_api_key: str = ""
    qianwen_image_model: str = "wanx-v1"  # Options: "wanx-v1", "wanx2-v1"

    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        env_file_encoding = 'utf-8'


settings = Settings()
