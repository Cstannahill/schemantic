"""
Health check endpoints.
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from schemas.common import HealthCheck
from core.config import settings

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/", response_model=HealthCheck)
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint.
    
    Returns:
        Health status information
    """
    # Check database connection
    try:
        db.execute("SELECT 1")
        database_status = "connected"
    except Exception:
        database_status = "disconnected"
    
    return HealthCheck(
        status="healthy" if database_status == "connected" else "unhealthy",
        version=settings.api_version,
        environment="development" if settings.debug else "production",
        database_status=database_status
    )


@router.get("/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """
    Readiness check endpoint for Kubernetes.
    
    Returns:
        Ready status
    """
    try:
        # Check database connection
        db.execute("SELECT 1")
        return {"status": "ready"}
    except Exception:
        return {"status": "not ready"}, 503


@router.get("/live")
async def liveness_check():
    """
    Liveness check endpoint for Kubernetes.
    
    Returns:
        Live status
    """
    return {"status": "alive"}
