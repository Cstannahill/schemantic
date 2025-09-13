"""
File service for handling file uploads and management.
"""
import os
import uuid
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from datetime import datetime

from core.config import settings
from schemas.common import FileUpload

class FileService:
    """File service class."""
    
    def __init__(self):
        self.upload_dir = "uploads"
        self.max_file_size = settings.max_file_size
        self.allowed_types = settings.allowed_file_types
    
    async def upload_file(self, file: UploadFile) -> FileUpload:
        """
        Upload a file.
        
        Args:
            file: Uploaded file
            
        Returns:
            File upload information
            
        Raises:
            HTTPException: If file validation fails
        """
        # Validate file
        self._validate_file(file)
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(self.upload_dir, unique_filename)
        
        try:
            contents = await file.read()
            
            # Check file size
            if len(contents) > self.max_file_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File size exceeds maximum allowed size"
                )
            
            with open(file_path, "wb") as f:
                f.write(contents)
            
            # Generate file URL
            file_url = f"/files/{unique_filename}"
            
            return FileUpload(
                filename=file.filename,
                file_size=len(contents),
                content_type=file.content_type,
                url=file_url,
                uploaded_at=datetime.utcnow()
            )
            
        except Exception as e:
            # Clean up file if upload failed
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )
    
    def get_file_path(self, filename: str) -> Optional[str]:
        """
        Get file path by filename.
        
        Args:
            filename: File filename
            
        Returns:
            File path if exists, None otherwise
        """
        file_path = os.path.join(self.upload_dir, filename)
        return file_path if os.path.exists(file_path) else None
    
    def delete_file(self, filename: str) -> bool:
        """
        Delete a file.
        
        Args:
            filename: File filename
            
        Returns:
            True if deleted, False if not found
        """
        file_path = os.path.join(self.upload_dir, filename)
        
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                return True
            except Exception:
                return False
        
        return False
    
    def _validate_file(self, file: UploadFile) -> None:
        """
        Validate uploaded file.
        
        Args:
            file: Uploaded file
            
        Raises:
            HTTPException: If file validation fails
        """
        # Check if file is provided
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Check file type
        if file.content_type not in self.allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file.content_type} not allowed"
            )
        
        # Check file extension
        file_extension = os.path.splitext(file.filename)[1].lower()
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif']
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension {file_extension} not allowed"
            )
