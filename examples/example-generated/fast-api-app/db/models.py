"""
SQLAlchemy database models.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Numeric, ForeignKey, Enum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    """User model."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum('customer', 'admin', 'moderator', 'vendor', name='user_role'), default='customer')
    status = Column(Enum('active', 'inactive', 'suspended', 'pending', name='user_status'), default='active')
    
    # Profile information
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Preferences (stored as JSON)
    preferences = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    orders = relationship("Order", back_populates="user")
    reviews = relationship("ProductReview", back_populates="user")


class Product(Base):
    """Product model."""
    
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(Enum('electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'automotive', 'food', name='product_category'), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    compare_price = Column(Numeric(10, 2), nullable=True)
    status = Column(Enum('draft', 'active', 'inactive', 'discontinued', name='product_status'), default='draft')
    sku = Column(String(100), unique=True, nullable=False, index=True)
    barcode = Column(String(50), nullable=True)
    weight = Column(Numeric(8, 2), nullable=True)
    dimensions = Column(JSON, nullable=True)  # {"length": 20.0, "width": 15.0, "height": 8.0}
    images = Column(JSON, default=list)  # List of image URLs
    tags = Column(JSON, default=list)  # List of tags
    inventory_quantity = Column(Integer, default=0)
    track_inventory = Column(Boolean, default=True)
    requires_shipping = Column(Boolean, default=True)
    taxable = Column(Boolean, default=True)
    seo_title = Column(String(60), nullable=True)
    seo_description = Column(String(160), nullable=True)
    featured = Column(Boolean, default=False)
    vendor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Calculated fields
    average_rating = Column(Numeric(3, 2), nullable=True)
    review_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    reviews = relationship("ProductReview", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    vendor = relationship("User", foreign_keys=[vendor_id])


class Order(Base):
    """Order model."""
    
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', name='order_status'), default='pending')
    
    # Pricing
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax_amount = Column(Numeric(10, 2), default=0)
    shipping_cost = Column(Numeric(10, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default='USD')
    
    # Addresses (stored as JSON)
    shipping_address = Column(JSON, nullable=False)
    billing_address = Column(JSON, nullable=False)
    
    # Shipping
    shipping_method = Column(Enum('standard', 'express', 'overnight', 'pickup', 'digital', name='shipping_method'), default='standard')
    tracking_number = Column(String(100), nullable=True)
    estimated_delivery = Column(DateTime, nullable=True)
    shipped_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    
    # Payment
    payment_method = Column(Enum('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cryptocurrency', 'cash_on_delivery', name='payment_method'), nullable=False)
    payment_status = Column(Enum('pending', 'paid', 'failed', 'refunded', 'partially_refunded', name='payment_status'), default='pending')
    payment_transaction_id = Column(String(100), nullable=True)
    payment_gateway_response = Column(JSON, nullable=True)
    payment_processed_at = Column(DateTime, nullable=True)
    
    # Additional information
    notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    coupon_code = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """Order item model."""
    
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(200), nullable=False)  # Snapshot of product name
    product_sku = Column(String(100), nullable=False)  # Snapshot of product SKU
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    product_image = Column(String(500), nullable=True)  # Snapshot of product image
    product_variant = Column(JSON, nullable=True)  # Product variant information
    
    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class ProductReview(Base):
    """Product review model."""
    
    __tablename__ = "product_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(200), nullable=False)
    comment = Column(Text, nullable=False)
    verified_purchase = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
