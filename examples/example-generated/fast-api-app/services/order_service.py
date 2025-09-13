"""
Order service for business logic.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from decimal import Decimal
from datetime import datetime

from db.models import Order, OrderItem, Product
from schemas.order import OrderCreate, OrderUpdate, OrderStatus
from services.product_service import ProductService

class OrderService:
    """Order service class."""
    
    def __init__(self, db: Session):
        self.db = db
        self.product_service = ProductService(db)
    
    def create_order(self, user_id: int, order_data: OrderCreate) -> Order:
        """
        Create a new order.
        
        Args:
            user_id: User ID
            order_data: Order creation data
            
        Returns:
            Created order
        """
        # Generate order number
        order_number = self._generate_order_number()
        
        # Calculate totals
        subtotal = sum(item.total_price for item in order_data.items)
        
        # Simple tax calculation (8% tax rate)
        tax_rate = Decimal('0.08')
        tax_amount = subtotal * tax_rate
        
        # Simple shipping calculation
        shipping_cost = Decimal('9.99') if order_data.shipping_method != "digital" else Decimal('0.00')
        
        # Calculate total
        total_amount = subtotal + tax_amount + shipping_cost
        
        # Create order
        order = Order(
            order_number=order_number,
            user_id=user_id,
            subtotal=subtotal,
            tax_amount=tax_amount,
            shipping_cost=shipping_cost,
            total_amount=total_amount,
            shipping_address=order_data.shipping_address.dict(),
            billing_address=order_data.billing_address.dict(),
            shipping_method=order_data.shipping_method.value,
            payment_method=order_data.payment_method.value,
            notes=order_data.notes,
            coupon_code=order_data.coupon_code
        )
        
        self.db.add(order)
        self.db.flush()  # Get the order ID
        
        # Create order items and update inventory
        for item_data in order_data.items:
            # Check product availability
            product = self.product_service.get_product_by_id(item_data.product_id)
            if not product:
                raise ValueError(f"Product with ID {item_data.product_id} not found")
            
            if product.track_inventory and product.inventory_quantity < item_data.quantity:
                raise ValueError(f"Insufficient inventory for product {product.name}")
            
            # Create order item
            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data.product_id,
                product_name=item_data.product_name,
                product_sku=item_data.product_sku,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total_price=item_data.total_price,
                product_image=item_data.product_image,
                product_variant=item_data.product_variant
            )
            
            self.db.add(order_item)
            
            # Update inventory
            if product.track_inventory:
                self.product_service.update_inventory(item_data.product_id, -item_data.quantity)
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def get_order_by_id(self, order_id: int) -> Optional[Order]:
        """
        Get order by ID.
        
        Args:
            order_id: Order ID
            
        Returns:
            Order if found, None otherwise
        """
        return self.db.query(Order).filter(Order.id == order_id).first()
    
    def get_order_by_number(self, order_number: str) -> Optional[Order]:
        """
        Get order by order number.
        
        Args:
            order_number: Order number
            
        Returns:
            Order if found, None otherwise
        """
        return self.db.query(Order).filter(Order.order_number == order_number).first()
    
    def get_user_orders(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OrderStatus] = None
    ) -> List[Order]:
        """
        Get user's orders with optional filtering.
        
        Args:
            user_id: User ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Filter by order status
            
        Returns:
            List of orders
        """
        query = self.db.query(Order).filter(Order.user_id == user_id)
        
        if status:
            query = query.filter(Order.status == status.value)
        
        return query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_orders(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OrderStatus] = None,
        user_id: Optional[int] = None
    ) -> List[Order]:
        """
        Get all orders with optional filtering.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Filter by order status
            user_id: Filter by user ID
            
        Returns:
            List of orders
        """
        query = self.db.query(Order)
        
        if status:
            query = query.filter(Order.status == status.value)
        
        if user_id:
            query = query.filter(Order.user_id == user_id)
        
        return query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    def update_order(self, order_id: int, order_data: OrderUpdate) -> Optional[Order]:
        """
        Update order.
        
        Args:
            order_id: Order ID
            order_data: Order update data
            
        Returns:
            Updated order if found, None otherwise
        """
        order = self.get_order_by_id(order_id)
        if not order:
            return None
        
        # Update fields
        update_data = order_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "shipping_address" and value:
                setattr(order, field, value.dict())
            elif field == "billing_address" and value:
                setattr(order, field, value.dict())
            else:
                setattr(order, field, value)
        
        order.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def update_order_status(self, order_id: int, status: OrderStatus) -> Optional[Order]:
        """
        Update order status.
        
        Args:
            order_id: Order ID
            status: New order status
            
        Returns:
            Updated order if found, None otherwise
        """
        order = self.get_order_by_id(order_id)
        if not order:
            return None
        
        order.status = status.value
        order.updated_at = datetime.utcnow()
        
        # Set timestamps based on status
        if status == OrderStatus.SHIPPED:
            order.shipped_at = datetime.utcnow()
        elif status == OrderStatus.DELIVERED:
            order.delivered_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def cancel_order(self, order_id: int) -> Optional[Order]:
        """
        Cancel order.
        
        Args:
            order_id: Order ID
            
        Returns:
            Updated order if found and can be cancelled, None otherwise
        """
        order = self.get_order_by_id(order_id)
        if not order:
            return None
        
        # Check if order can be cancelled
        if order.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            return None  # Cannot cancel shipped or delivered orders
        
        # Cancel order
        order.status = OrderStatus.CANCELLED.value
        order.updated_at = datetime.utcnow()
        
        # Restore inventory
        for item in order.items:
            if item.product.track_inventory:
                self.product_service.update_inventory(item.product_id, item.quantity)
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def delete_order(self, order_id: int) -> bool:
        """
        Delete order.
        
        Args:
            order_id: Order ID
            
        Returns:
            True if deleted, False if not found
        """
        order = self.get_order_by_id(order_id)
        if not order:
            return False
        
        # Only allow deletion of pending or cancelled orders
        if order.status not in [OrderStatus.PENDING.value, OrderStatus.CANCELLED.value]:
            return False
        
        self.db.delete(order)
        self.db.commit()
        
        return True
    
    def get_user_order_count(self, user_id: int) -> int:
        """
        Get total number of orders for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Total order count
        """
        return self.db.query(Order).filter(Order.user_id == user_id).count()
    
    def get_order_count(self) -> int:
        """
        Get total number of orders.
        
        Returns:
            Total order count
        """
        return self.db.query(Order).count()
    
    def _generate_order_number(self) -> str:
        """
        Generate unique order number.
        
        Returns:
            Unique order number
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        # In a real application, you might want to add a sequence number
        return f"ORD-{timestamp}"
