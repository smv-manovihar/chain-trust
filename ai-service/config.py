from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ChainTrust AI Service"
    OPENROUTER_API_KEY: str = "dummy_key"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "chaintrust_ai"
    JWT_SECRET: str = "your_jwt_secret_here"

    # S3 Settings
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_REGION: str = "us-east-1"
    S3_BUCKET: str = "chaintrust"

    # OCR Settings
    TESSERACT_CMD: str | None = None
    INTERNAL_API_KEY: str = "chaintrust_internal_2026_secret"
    BACKEND_URL: str = "http://localhost:5000"
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()


def get_settings() -> Settings:
    return settings
