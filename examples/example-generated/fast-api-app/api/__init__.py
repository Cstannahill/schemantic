"""API package for FastAPI route handlers."""

from .users import router as users_router
from .products import router as products_router
from .orders import router as orders_router
from .auth import router as auth_router
from .health import router as health_router

__all__ = [
    "users_router",
    "products_router", 
    "orders_router",
    "auth_router",
    "health_router"
]
