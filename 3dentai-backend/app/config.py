import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "3DentAI API"
    VERSION: str = "1.0.0"
    API_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Server Configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Security Configuration
    JWT_SECRET_KEY: str = "default-secret-key-for-local-development"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL: str = "https://placeholder-project.supabase.co"
    NEXT_PUBLIC_SUPABASE_ANON_KEY: str = "placeholder-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-role-key"

    # Storage Buckets
    BUCKET_PANO_IMAGES: str = "panoramic-images"
    BUCKET_VOXEL_OUTPUTS: str = "voxel-outputs"
    BUCKET_STL_MESHES: str = "stl-meshes"
    BUCKET_PREVIEWS: str = "reconstruction-previews"

    # AI Mock Settings
    SIMULATE_AI_DELAY_SECONDS: float = 5.0

    # CORS Origins (comma separated in string, parsed into list)
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "*"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

settings = Settings()
