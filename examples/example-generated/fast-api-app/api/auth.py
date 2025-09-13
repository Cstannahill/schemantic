"""
Authentication endpoints.
"""
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from db import get_db
from schemas.user import UserLogin, UserResponse, UserCreate
from schemas.common import SuccessResponse
from services.user_service import UserService
from services.auth_service import AuthService
from core.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserResponse:
    """
    Get current authenticated user.
    
    Args:
        token: JWT token
        db: Database session
        
    Returns:
        Current user
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = AuthService.verify_token(token)
        if payload is None:
            raise credentials_exception
        
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except Exception:
        raise credentials_exception
    
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    
    return UserResponse.from_orm(user)


@router.post("/register", response_model=SuccessResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    Args:
        user_data: User registration data
        db: Database session
        
    Returns:
        Success response
        
    Raises:
        HTTPException: If email already exists
    """
    user_service = UserService(db)
    
    # Check if user already exists
    existing_user = user_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = user_service.create_user(user_data)
    
    return SuccessResponse(
        message="User registered successfully",
        data={"user_id": user.id, "email": user.email}
    )


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Login user and return access token.
    
    Args:
        form_data: Login form data
        db: Database session
        
    Returns:
        Access token
        
    Raises:
        HTTPException: If credentials are invalid
    """
    user_service = UserService(db)
    
    # Get user by email
    user = user_service.get_user_by_email(form_data.username)
    if not user or not user_service.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is not active"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    # Update last login
    user_service.update_last_login(user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
        "user": UserResponse.from_orm(user)
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user information
    """
    return current_user


@router.post("/refresh")
async def refresh_token(current_user: UserResponse = Depends(get_current_user)):
    """
    Refresh access token.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        New access token
    """
    # Create new access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = AuthService.create_access_token(
        data={"sub": str(current_user.id)}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60
    }


@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    current_password: str,
    new_password: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password.
    
    Args:
        current_password: Current password
        new_password: New password
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success response
        
    Raises:
        HTTPException: If current password is incorrect
    """
    user_service = UserService(db)
    
    # Verify current password
    user = user_service.get_user_by_id(current_user.id)
    if not user_service.verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Change password
    success = user_service.change_password(current_user.id, new_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )
    
    return SuccessResponse(message="Password changed successfully")


@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: UserResponse = Depends(get_current_user)):
    """
    Logout user (client should discard token).
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Success response
    """
    # In a real application, you might want to blacklist the token
    # For now, we'll just return a success message
    return SuccessResponse(message="Logged out successfully")
