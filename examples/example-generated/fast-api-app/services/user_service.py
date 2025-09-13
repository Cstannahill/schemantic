"""
User service for business logic.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from passlib.context import CryptContext
from datetime import datetime

from db.models import User
from schemas.user import UserCreate, UserUpdate, UserResponse, UserRole, UserStatus
from core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    """User service class."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_user(self, user_data: UserCreate) -> User:
        """
        Create a new user.
        
        Args:
            user_data: User creation data
            
        Returns:
            Created user
        """
        # Hash password
        hashed_password = pwd_context.hash(user_data.password)
        
        # Create user object
        user = User(
            email=user_data.email,
            password_hash=hashed_password,
            role=user_data.role.value,
            first_name=user_data.profile.first_name,
            last_name=user_data.profile.last_name,
            phone=user_data.profile.phone,
            date_of_birth=user_data.profile.date_of_birth,
            bio=user_data.profile.bio,
            avatar_url=user_data.profile.avatar_url,
            preferences=user_data.preferences.dict()
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User if found, None otherwise
        """
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email.
        
        Args:
            email: User email
            
        Returns:
            User if found, None otherwise
        """
        return self.db.query(User).filter(User.email == email).first()
    
    def get_users(
        self, 
        skip: int = 0, 
        limit: int = 100,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
        search: Optional[str] = None
    ) -> List[User]:
        """
        Get list of users with optional filtering.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            role: Filter by user role
            status: Filter by user status
            search: Search term for name or email
            
        Returns:
            List of users
        """
        query = self.db.query(User)
        
        # Apply filters
        if role:
            query = query.filter(User.role == role.value)
        
        if status:
            query = query.filter(User.status == status.value)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        return query.offset(skip).limit(limit).all()
    
    def update_user(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """
        Update user.
        
        Args:
            user_id: User ID
            user_data: User update data
            
        Returns:
            Updated user if found, None otherwise
        """
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        # Update fields
        update_data = user_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "profile" and value:
                # Update profile fields
                for profile_field, profile_value in value.items():
                    setattr(user, profile_field, profile_value)
            elif field == "preferences" and value:
                # Update preferences
                current_prefs = user.preferences or {}
                current_prefs.update(value)
                user.preferences = current_prefs
            else:
                setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def delete_user(self, user_id: int) -> bool:
        """
        Delete user.
        
        Args:
            user_id: User ID
            
        Returns:
            True if deleted, False if not found
        """
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        self.db.delete(user)
        self.db.commit()
        
        return True
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify password against hash.
        
        Args:
            plain_password: Plain text password
            hashed_password: Hashed password
            
        Returns:
            True if password matches, False otherwise
        """
        return pwd_context.verify(plain_password, hashed_password)
    
    def update_last_login(self, user_id: int) -> None:
        """
        Update user's last login timestamp.
        
        Args:
            user_id: User ID
        """
        user = self.get_user_by_id(user_id)
        if user:
            user.last_login = datetime.utcnow()
            self.db.commit()
    
    def change_password(self, user_id: int, new_password: str) -> bool:
        """
        Change user password.
        
        Args:
            user_id: User ID
            new_password: New password
            
        Returns:
            True if successful, False if user not found
        """
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.password_hash = pwd_context.hash(new_password)
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return True
    
    def get_user_count(self) -> int:
        """
        Get total number of users.
        
        Returns:
            Total user count
        """
        return self.db.query(User).count()
