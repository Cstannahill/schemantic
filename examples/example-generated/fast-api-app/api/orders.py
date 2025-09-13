"""
Order management endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from db import get_db
from schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderStatus
from schemas.common import PaginatedResponse, PaginationParams
from services.order_service import OrderService
from api.auth import get_current_user

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new order.
    
    Args:
        order_data: Order creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created order
        
    Raises:
        HTTPException: If order creation fails
    """
    order_service = OrderService(db)
    
    # Create order
    order = order_service.create_order(current_user.id, order_data)
    
    return OrderResponse.from_orm(order)


@router.get("/", response_model=PaginatedResponse[OrderResponse])
async def get_orders(
    pagination: PaginationParams = Depends(),
    status: Optional[OrderStatus] = Query(None, description="Filter by order status"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's orders with pagination and filtering.
    
    Args:
        pagination: Pagination parameters
        status: Filter by order status
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Paginated list of orders
    """
    order_service = OrderService(db)
    
    # Calculate skip
    skip = (pagination.page - 1) * pagination.size
    
    # Get orders
    orders = order_service.get_user_orders(
        user_id=current_user.id,
        skip=skip,
        limit=pagination.size,
        status=status
    )
    
    # Get total count
    total = order_service.get_user_order_count(current_user.id)
    
    # Calculate pagination info
    pages = (total + pagination.size - 1) // pagination.size
    has_next = pagination.page < pages
    has_prev = pagination.page > 1
    
    return PaginatedResponse(
        items=[OrderResponse.from_orm(order) for order in orders],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=pages,
        has_next=has_next,
        has_prev=has_prev
    )


@router.get("/all", response_model=PaginatedResponse[OrderResponse])
async def get_all_orders(
    pagination: PaginationParams = Depends(),
    status: Optional[OrderStatus] = Query(None, description="Filter by order status"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all orders with pagination and filtering (admin only).
    
    Args:
        pagination: Pagination parameters
        status: Filter by order status
        user_id: Filter by user ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Paginated list of orders
        
    Raises:
        HTTPException: If user is not admin
    """
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view all orders"
        )
    
    order_service = OrderService(db)
    
    # Calculate skip
    skip = (pagination.page - 1) * pagination.size
    
    # Get orders
    orders = order_service.get_orders(
        skip=skip,
        limit=pagination.size,
        status=status,
        user_id=user_id
    )
    
    # Get total count
    total = order_service.get_order_count()
    
    # Calculate pagination info
    pages = (total + pagination.size - 1) // pagination.size
    has_next = pagination.page < pages
    has_prev = pagination.page > 1
    
    return PaginatedResponse(
        items=[OrderResponse.from_orm(order) for order in orders],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=pages,
        has_next=has_next,
        has_prev=has_prev
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get order by ID.
    
    Args:
        order_id: Order ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Order information
        
    Raises:
        HTTPException: If order not found or access denied
    """
    order_service = OrderService(db)
    
    # Get order
    order = order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if current user can view this order
    if current_user.role != "admin" and order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return OrderResponse.from_orm(order)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    order_data: OrderUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update order (admin only).
    
    Args:
        order_id: Order ID
        order_data: Order update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated order
        
    Raises:
        HTTPException: If user is not admin or order not found
    """
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update orders"
        )
    
    order_service = OrderService(db)
    
    # Check if order exists
    order = order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Update order
    updated_order = order_service.update_order(order_id, order_data)
    
    return OrderResponse.from_orm(updated_order)


@router.patch("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel order.
    
    Args:
        order_id: Order ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated order
        
    Raises:
        HTTPException: If order not found, access denied, or cannot be cancelled
    """
    order_service = OrderService(db)
    
    # Get order
    order = order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if current user can cancel this order
    if current_user.role != "admin" and order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Cancel order
    updated_order = order_service.cancel_order(order_id)
    
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot be cancelled"
        )
    
    return OrderResponse.from_orm(updated_order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    new_status: OrderStatus,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update order status (admin only).
    
    Args:
        order_id: Order ID
        new_status: New order status
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated order
        
    Raises:
        HTTPException: If user is not admin or order not found
    """
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update order status"
        )
    
    order_service = OrderService(db)
    
    # Check if order exists
    order = order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Update order status
    updated_order = order_service.update_order_status(order_id, new_status)
    
    return OrderResponse.from_orm(updated_order)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete order (admin only).
    
    Args:
        order_id: Order ID
        current_user: Current authenticated user
        db: Database session
        
    Raises:
        HTTPException: If user is not admin or order not found
    """
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete orders"
        )
    
    order_service = OrderService(db)
    
    # Check if order exists
    order = order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Delete order
    success = order_service.delete_order(order_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete order"
        )
