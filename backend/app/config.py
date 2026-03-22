"""
Application configuration management
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    APP_NAME: str = "Food & Nutrition Analysis API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/foodai"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}
    
    # AI Service Configuration
    AI_SERVICE_URL: str = "http://localhost:8001"
    
    # Gemini AI Configuration
    GEMINI_API_KEY: str = ""  # Get from https://makersuite.google.com/app/apikey
    # e.g. gemini-2.5-flash — see Google AI Studio model list
    # (gemini-2.0-flash free-tier quota can show limit:0 when exhausted; 2.5-flash is the current default)
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Local YOLO Model Configuration
    YOLO_MODEL_PATH: str = "best.pt"  # Path to the trained YOLO weights file
    YOLO_CONFIDENCE_THRESHOLD: float = 0.4  # Minimum confidence to accept a detection
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
