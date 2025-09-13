"""
Common schemas used across the application.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional, Generic, TypeVar
from pydantic import BaseModel, Field, HttpUrl

# Generic type for paginated responses
T = TypeVar('T')


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "ValidationError",
                "message": "Invalid input data",
                "details": {"field": "email", "issue": "Invalid email format"},
                "timestamp": "2023-12-01T10:00:00Z"
            }
        }


class SuccessResponse(BaseModel):
    """Standard success response schema."""
    
    message: str = Field(..., description="Success message")
    data: Optional[Any] = Field(None, description="Response data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Operation completed successfully",
                "data": {"id": 1, "name": "Example"},
                "timestamp": "2023-12-01T10:00:00Z"
            }
        }


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints."""
    
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=20, ge=1, le=100, description="Page size")
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: Optional[str] = Field(default="asc", pattern="^(asc|desc)$", description="Sort order")
    
    class Config:
        json_schema_extra = {
            "example": {
                "page": 1,
                "size": 20,
                "sort_by": "created_at",
                "sort_order": "desc"
            }
        }


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""
    
    items: List[T] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "size": 20,
                "pages": 5,
                "has_next": True,
                "has_prev": False
            }
        }


class FileUpload(BaseModel):
    """File upload response schema."""
    
    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="File content type")
    url: HttpUrl = Field(..., description="File access URL")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow, description="Upload timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "filename": "profile.jpg",
                "file_size": 1024000,
                "content_type": "image/jpeg",
                "url": "https://api.example.com/files/profile.jpg",
                "uploaded_at": "2023-12-01T10:00:00Z"
            }
        }


class HealthCheck(BaseModel):
    """Health check response schema."""
    
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Check timestamp")
    version: str = Field(..., description="Application version")
    environment: str = Field(..., description="Environment name")
    database_status: str = Field(..., description="Database connection status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": "2023-12-01T10:00:00Z",
                "version": "1.0.0",
                "environment": "development",
                "database_status": "connected"
            }
        }
