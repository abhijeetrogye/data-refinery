from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Data Refinery"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str

    DATABASE_URL: str = "mongodb+srv://rogyeabhijeet_db_user:J9hv8mPpqnJ3Nihh@datarefinery.fzzkjng.mongodb.net/datarefinery?appName=DataRefinery"

    
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
