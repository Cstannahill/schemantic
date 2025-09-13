"""
Product management endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from db import get_db
from schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductSearch, ProductFilter
)
from schemas.common import PaginatedResponse, PaginationParams
from services.product_service import ProductService
from api.auth import get_current_user

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new product (admin/vendor only).
    
    Args:
        product_data: Product creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created product
        
    Raises:
        HTTPException: If user is not admin/vendor or SKU already exists
    """
    # Check if current user can create products
    if current_user.role not in ["admin", "vendor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and vendors can create products"
        )
    
    product_service = ProductService(db)
    
    # Check if SKU already exists
    existing_product = product_service.get_product_by_sku(product_data.sku)
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SKU already exists"
        )
    
    # Create product
    product = product_service.create_product(product_data)
    
    return ProductResponse.from_orm(product)


@router.get("/", response_model=PaginatedResponse[ProductResponse])
async def get_products(
    pagination: PaginationParams = Depends(),
    category: Optional[str] = Query(None, description="Filter by category"),
    featured: Optional[bool] = Query(None, description="Filter featured products"),
    search: Optional[str] = Query(None, description="Search query"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    in_stock: Optional[bool] = Query(None, description="Filter in-stock products"),
    db: Session = Depends(get_db)
):
    """
    Get list of products with pagination and filtering.
    
    Args:
        pagination: Pagination parameters
        category: Filter by category
        featured: Filter featured products
        search: Search query
        min_price: Minimum price
        max_price: Maximum price
        in_stock: Filter in-stock products
        db: Database session
        
    Returns:
        Paginated list of products
    """
    product_service = ProductService(db)
    
    # Build filter parameters
    filter_params = ProductFilter(
        category=category,
        featured=featured
    )
    
    # Build search parameters
    search_params = ProductSearch(
        query=search,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock
    )
    
    # Calculate skip
    skip = (pagination.page - 1) * pagination.size
    
    # Get products
    products = product_service.get_products(
        skip=skip,
        limit=pagination.size,
        filter_params=filter_params,
        search_params=search_params
    )
    
    # Get total count
    total = product_service.get_product_count()
    
    # Calculate pagination info
    pages = (total + pagination.size - 1) // pagination.size
    has_next = pagination.page < pages
    has_prev = pagination.page > 1
    
    return PaginatedResponse(
        items=[ProductResponse.from_orm(product) for product in products],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=pages,
        has_next=has_next,
        has_prev=has_prev
    )


@router.get("/search", response_model=List[ProductResponse])
async def search_products(
    q: str = Query(..., description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    db: Session = Depends(get_db)
):
    """
    Search products.
    
    Args:
        q: Search query
        category: Filter by category
        limit: Maximum number of results
        db: Database session
        
    Returns:
        List of matching products
    """
    product_service = ProductService(db)
    
    # Build search parameters
    search_params = ProductSearch(query=q, category=category)
    
    # Search products
    products = product_service.search_products(search_params, limit=limit)
    
    return [ProductResponse.from_orm(product) for product in products]


@router.get("/featured", response_model=List[ProductResponse])
async def get_featured_products(
    limit: int = Query(10, ge=1, le=50, description="Maximum results"),
    db: Session = Depends(get_db)
):
    """
    Get featured products.
    
    Args:
        limit: Maximum number of products
        db: Database session
        
    Returns:
        List of featured products
    """
    product_service = ProductService(db)
    
    products = product_service.get_featured_products(limit=limit)
    
    return [ProductResponse.from_orm(product) for product in products]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """
    Get product by ID.
    
    Args:
        product_id: Product ID
        db: Database session
        
    Returns:
        Product information
        
    Raises:
        HTTPException: If product not found
    """
    product_service = ProductService(db)
    
    product = product_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return ProductResponse.from_orm(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update product (admin/vendor only).
    
    Args:
        product_id: Product ID
        product_data: Product update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated product
        
    Raises:
        HTTPException: If user is not admin/vendor or product not found
    """
    # Check if current user can update products
    if current_user.role not in ["admin", "vendor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and vendors can update products"
        )
    
    product_service = ProductService(db)
    
    # Check if product exists
    product = product_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update product
    updated_product = product_service.update_product(product_id, product_data)
    
    return ProductResponse.from_orm(updated_product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete product (admin only).
    
    Args:
        product_id: Product ID
        current_user: Current authenticated user
        db: Database session
        
    Raises:
        HTTPException: If user is not admin or product not found
    """
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete products"
        )
    
    product_service = ProductService(db)
    
    # Check if product exists
    product = product_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Delete product
    success = product_service.delete_product(product_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete product"
        )


@router.patch("/{product_id}/inventory", response_model=ProductResponse)
async def update_inventory(
    product_id: int,
    quantity_change: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update product inventory (admin/vendor only).
    
    Args:
        product_id: Product ID
        quantity_change: Change in quantity
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated product
        
    Raises:
        HTTPException: If user is not admin/vendor or insufficient inventory
    """
    # Check if current user can update inventory
    if current_user.role not in ["admin", "vendor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and vendors can update inventory"
        )
    
    product_service = ProductService(db)
    
    # Update inventory
    success = product_service.update_inventory(product_id, quantity_change)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update inventory or insufficient stock"
        )
    
    # Get updated product
    product = product_service.get_product_by_id(product_id)
    
    return ProductResponse.from_orm(product)
