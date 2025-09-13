"""
Core configuration settings for the FastAPI application.
"""
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # API Configuration
    api_title: str = Field(default="E-Commerce API", description="API title")
    api_description: str = Field(
        default="A comprehensive e-commerce API for testing type-sync",
        description="API description"
    )
    api_version: str = Field(default="1.0.0", description="API version")
    debug: bool = Field(default=True, description="Debug mode")
    
    # Server Configuration
    host: str = Field(default="127.0.0.1", description="Server host")
    port: int = Field(default=8000, description="Server port")
    
    # Database Configuration
    database_url: str = Field(
        default="sqlite:///./test.db",
        description="Database URL"
    )
    
    # Security Configuration
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT tokens"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=30,
        description="Access token expiration time in minutes"
    )
    
    # File Upload Configuration
    max_file_size: int = Field(
        default=10 * 1024 * 1024,  # 10MB
        description="Maximum file size in bytes"
    )
    allowed_file_types: list[str] = Field(
        default=["image/jpeg", "image/png", "image/gif"],
        description="Allowed file types for uploads"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
