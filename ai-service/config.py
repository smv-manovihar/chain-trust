from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "ChainTrust AI Service"
    OPENROUTER_API_KEY: str = "dummy_key"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "chaintrust_ai"
    AI_MODEL: str = "google/gemini-2.5-flash"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()