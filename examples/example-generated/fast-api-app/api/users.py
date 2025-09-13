"""
User management endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from db import get_db
from schemas.user import UserCreate, UserUpdate, UserResponse, UserRole, UserStatus
from schemas.common import PaginatedResponse, PaginationParams
from services.user_service import UserService
from api.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new user (admin only).
    
    Args:
        user_data: User creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created user
        
    Raises:
        HTTPException: If user is not admin or email already exists
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create users"
        )
    
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
    
    return UserResponse.from_orm(user)


@router.get("/", response_model=PaginatedResponse[UserResponse])
async def get_users(
    pagination: PaginationParams = Depends(),
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    status: Optional[UserStatus] = Query(None, description="Filter by user status"),
    search: Optional[str] = Query(None, description="Search in name or email"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of users with pagination and filtering (admin only).
    
    Args:
        pagination: Pagination parameters
        role: Filter by user role
        status: Filter by user status
        search: Search term
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Paginated list of users
        
    Raises:
        HTTPException: If user is not admin
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view all users"
        )
    
    user_service = UserService(db)
    
    # Calculate skip
    skip = (pagination.page - 1) * pagination.size
    
    # Get users
    users = user_service.get_users(
        skip=skip,
        limit=pagination.size,
        role=role,
        status=status,
        search=search
    )
    
    # Get total count
    total = user_service.get_user_count()
    
    # Calculate pagination info
    pages = (total + pagination.size - 1) // pagination.size
    has_next = pagination.page < pages
    has_prev = pagination.page > 1
    
    return PaginatedResponse(
        items=[UserResponse.from_orm(user) for user in users],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=pages,
        has_next=has_next,
        has_prev=has_prev
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user by ID.
    
    Args:
        user_id: User ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        User information
        
    Raises:
        HTTPException: If user not found or access denied
    """
    user_service = UserService(db)
    
    # Check if user exists
    user = user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if current user can view this user
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return UserResponse.from_orm(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user.
    
    Args:
        user_id: User ID
        user_data: User update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated user
        
    Raises:
        HTTPException: If user not found or access denied
    """
    user_service = UserService(db)
    
    # Check if user exists
    user = user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if current user can update this user
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Prevent non-admins from changing role or status
    if current_user.role != UserRole.ADMIN:
        if user_data.role is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change user role"
            )
        if user_data.status is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change user status"
            )
    
    # Update user
    updated_user = user_service.update_user(user_id, user_data)
    
    return UserResponse.from_orm(updated_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user (admin only).
    
    Args:
        user_id: User ID
        current_user: Current authenticated user
        db: Database session
        
    Raises:
        HTTPException: If user is not admin, user not found, or trying to delete self
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete users"
        )
    
    # Prevent self-deletion
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user_service = UserService(db)
    
    # Check if user exists
    user = user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Delete user
    success = user_service.delete_user(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )


@router.get("/me/profile", response_model=UserResponse)
async def get_my_profile(current_user: UserResponse = Depends(get_current_user)):
    """
    Get current user's profile.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user's profile
    """
    return current_user


@router.put("/me/profile", response_model=UserResponse)
async def update_my_profile(
    user_data: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile.
    
    Args:
        user_data: User update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated user profile
        
    Raises:
        HTTPException: If user not found
    """
    user_service = UserService(db)
    
    # Update user (remove role and status from data to prevent escalation)
    user_data.role = None
    user_data.status = None
    
    updated_user = user_service.update_user(current_user.id, user_data)
    
    return UserResponse.from_orm(updated_user)
