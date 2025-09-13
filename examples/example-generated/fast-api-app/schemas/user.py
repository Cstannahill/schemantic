"""
User-related schemas for request/response validation.
"""
from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, EmailStr, Field, field_validator
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration."""
    
    CUSTOMER = "customer"
    ADMIN = "admin"
    MODERATOR = "moderator"
    VENDOR = "vendor"


class UserStatus(str, Enum):
    """User status enumeration."""
    
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class UserPreferences(BaseModel):
    """User preferences schema."""
    
    newsletter: bool = Field(default=False, description="Newsletter subscription")
    notifications: bool = Field(default=True, description="Push notifications")
    language: str = Field(default="en", description="Preferred language")
    timezone: str = Field(default="UTC", description="User timezone")
    currency: str = Field(default="USD", description="Preferred currency")
    theme: Literal["light", "dark", "auto"] = Field(default="auto", description="UI theme preference")
    
    class Config:
        json_schema_extra = {
            "example": {
                "newsletter": True,
                "notifications": True,
                "language": "en",
                "timezone": "America/New_York",
                "currency": "USD",
                "theme": "dark"
            }
        }


class UserProfile(BaseModel):
    """User profile information schema."""
    
    first_name: str = Field(..., min_length=1, max_length=50, description="First name")
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name")
    phone: Optional[str] = Field(None, pattern=r"^\+?1?\d{9,15}$", description="Phone number")
    date_of_birth: Optional[datetime] = Field(None, description="Date of birth")
    bio: Optional[str] = Field(None, max_length=500, description="User biography")
    avatar_url: Optional[str] = Field(None, description="Avatar image URL")
    
    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "phone": "+1234567890",
                "date_of_birth": "1990-01-01T00:00:00Z",
                "bio": "Software developer and tech enthusiast",
                "avatar_url": "https://example.com/avatar.jpg"
            }
        }


class UserCreate(BaseModel):
    """User creation schema."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100, description="User password")
    role: UserRole = Field(default=UserRole.CUSTOMER, description="User role")
    profile: UserProfile = Field(..., description="User profile information")
    preferences: UserPreferences = Field(default_factory=UserPreferences, description="User preferences")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password strength."""
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecurePass123",
                "role": "customer",
                "profile": {
                    "first_name": "John",
                    "last_name": "Doe",
                    "phone": "+1234567890",
                    "bio": "Software developer"
                },
                "preferences": {
                    "newsletter": True,
                    "language": "en",
                    "currency": "USD"
                }
            }
        }


class UserUpdate(BaseModel):
    """User update schema."""
    
    email: Optional[EmailStr] = Field(None, description="User email address")
    role: Optional[UserRole] = Field(None, description="User role")
    status: Optional[UserStatus] = Field(None, description="User status")
    profile: Optional[UserProfile] = Field(None, description="User profile information")
    preferences: Optional[UserPreferences] = Field(None, description="User preferences")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "newemail@example.com",
                "status": "active",
                "profile": {
                    "first_name": "Jane",
                    "last_name": "Smith"
                }
            }
        }


class UserLogin(BaseModel):
    """User login schema."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    remember_me: bool = Field(default=False, description="Remember user session")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecurePass123",
                "remember_me": True
            }
        }


class UserResponse(BaseModel):
    """User response schema."""
    
    id: int = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email address")
    role: UserRole = Field(..., description="User role")
    status: UserStatus = Field(..., description="User status")
    profile: UserProfile = Field(..., description="User profile information")
    preferences: UserPreferences = Field(..., description="User preferences")
    created_at: datetime = Field(..., description="User creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "john.doe@example.com",
                "role": "customer",
                "status": "active",
                "profile": {
                    "first_name": "John",
                    "last_name": "Doe",
                    "phone": "+1234567890",
                    "bio": "Software developer"
                },
                "preferences": {
                    "newsletter": True,
                    "language": "en",
                    "currency": "USD"
                },
                "created_at": "2023-12-01T10:00:00Z",
                "updated_at": "2023-12-01T10:00:00Z",
                "last_login": "2023-12-01T09:30:00Z"
            }
        }
