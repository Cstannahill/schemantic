"""
Order-related schemas for request/response validation.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum


class OrderStatus(str, Enum):
    """Order status enumeration."""
    
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    """Payment status enumeration."""
    
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class PaymentMethod(str, Enum):
    """Payment method enumeration."""
    
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    CRYPTOCURRENCY = "cryptocurrency"
    CASH_ON_DELIVERY = "cash_on_delivery"


class ShippingMethod(str, Enum):
    """Shipping method enumeration."""
    
    STANDARD = "standard"
    EXPRESS = "express"
    OVERNIGHT = "overnight"
    PICKUP = "pickup"
    DIGITAL = "digital"


class Address(BaseModel):
    """Address schema."""
    
    street: str = Field(..., min_length=1, max_length=200, description="Street address")
    city: str = Field(..., min_length=1, max_length=100, description="City")
    state: str = Field(..., min_length=1, max_length=100, description="State/Province")
    postal_code: str = Field(..., min_length=1, max_length=20, description="Postal code")
    country: str = Field(..., min_length=2, max_length=2, description="Country code (ISO 3166-1 alpha-2)")
    apartment: Optional[str] = Field(None, max_length=50, description="Apartment/suite number")
    
    class Config:
        json_schema_extra = {
            "example": {
                "street": "123 Main Street",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "US",
                "apartment": "Apt 4B"
            }
        }


class PaymentInfo(BaseModel):
    """Payment information schema."""
    
    method: PaymentMethod = Field(..., description="Payment method")
    status: PaymentStatus = Field(default=PaymentStatus.PENDING, description="Payment status")
    transaction_id: Optional[str] = Field(None, description="Payment transaction ID")
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Payment amount")
    currency: str = Field(default="USD", description="Payment currency")
    processed_at: Optional[datetime] = Field(None, description="Payment processing timestamp")
    gateway_response: Optional[Dict[str, Any]] = Field(None, description="Payment gateway response")
    
    class Config:
        json_schema_extra = {
            "example": {
                "method": "credit_card",
                "status": "paid",
                "transaction_id": "txn_123456789",
                "amount": 99.99,
                "currency": "USD",
                "processed_at": "2023-12-01T10:00:00Z",
                "gateway_response": {"status": "success", "code": "0000"}
            }
        }


class OrderItem(BaseModel):
    """Order item schema."""
    
    product_id: int = Field(..., description="Product ID")
    product_name: str = Field(..., description="Product name")
    product_sku: str = Field(..., description="Product SKU")
    quantity: int = Field(..., gt=0, description="Item quantity")
    unit_price: Decimal = Field(..., gt=0, decimal_places=2, description="Unit price")
    total_price: Decimal = Field(..., gt=0, decimal_places=2, description="Total price for this item")
    product_image: Optional[str] = Field(None, description="Product image URL")
    product_variant: Optional[Dict[str, Any]] = Field(None, description="Product variant information")
    
    @model_validator(mode='after')
    def validate_total_price(self):
        """Validate total price matches quantity * unit_price."""
        expected_total = self.quantity * self.unit_price
        if abs(self.total_price - expected_total) > Decimal('0.01'):
            raise ValueError('total_price must equal quantity * unit_price')
        return self
    
    class Config:
        json_schema_extra = {
            "example": {
                "product_id": 1,
                "product_name": "Wireless Bluetooth Headphones",
                "product_sku": "WBH-001",
                "quantity": 2,
                "unit_price": 99.99,
                "total_price": 199.98,
                "product_image": "https://example.com/image1.jpg",
                "product_variant": {"color": "black", "size": "large"}
            }
        }


class OrderCreate(BaseModel):
    """Order creation schema."""
    
    items: List[OrderItem] = Field(..., min_items=1, description="Order items")
    shipping_address: Address = Field(..., description="Shipping address")
    billing_address: Optional[Address] = Field(None, description="Billing address (defaults to shipping)")
    shipping_method: ShippingMethod = Field(default=ShippingMethod.STANDARD, description="Shipping method")
    payment_method: PaymentMethod = Field(..., description="Payment method")
    notes: Optional[str] = Field(None, max_length=500, description="Order notes")
    coupon_code: Optional[str] = Field(None, description="Coupon code")
    
    @field_validator('items')
    @classmethod
    def validate_items(cls, v):
        """Validate order items."""
        if not v:
            raise ValueError('Order must have at least one item')
        return v
    
    @model_validator(mode='after')
    def set_billing_address(self):
        """Set billing address to shipping address if not provided."""
        if self.billing_address is None:
            self.billing_address = self.shipping_address
        return self
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [
                    {
                        "product_id": 1,
                        "product_name": "Wireless Bluetooth Headphones",
                        "product_sku": "WBH-001",
                        "quantity": 1,
                        "unit_price": 99.99,
                        "total_price": 99.99
                    }
                ],
                "shipping_address": {
                    "street": "123 Main Street",
                    "city": "New York",
                    "state": "NY",
                    "postal_code": "10001",
                    "country": "US"
                },
                "shipping_method": "standard",
                "payment_method": "credit_card",
                "notes": "Please deliver during business hours"
            }
        }


class OrderUpdate(BaseModel):
    """Order update schema."""
    
    status: Optional[OrderStatus] = Field(None, description="Order status")
    shipping_address: Optional[Address] = Field(None, description="Shipping address")
    billing_address: Optional[Address] = Field(None, description="Billing address")
    shipping_method: Optional[ShippingMethod] = Field(None, description="Shipping method")
    tracking_number: Optional[str] = Field(None, description="Shipping tracking number")
    notes: Optional[str] = Field(None, max_length=500, description="Order notes")
    internal_notes: Optional[str] = Field(None, max_length=1000, description="Internal order notes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "shipped",
                "tracking_number": "1Z999AA1234567890",
                "notes": "Package delivered successfully"
            }
        }


class OrderResponse(BaseModel):
    """Order response schema."""
    
    id: int = Field(..., description="Order ID")
    order_number: str = Field(..., description="Order number")
    user_id: int = Field(..., description="User ID")
    status: OrderStatus = Field(..., description="Order status")
    items: List[OrderItem] = Field(..., description="Order items")
    subtotal: Decimal = Field(..., description="Order subtotal")
    tax_amount: Decimal = Field(..., description="Tax amount")
    shipping_cost: Decimal = Field(..., description="Shipping cost")
    discount_amount: Decimal = Field(default=Decimal('0'), description="Discount amount")
    total_amount: Decimal = Field(..., description="Total amount")
    currency: str = Field(default="USD", description="Order currency")
    shipping_address: Address = Field(..., description="Shipping address")
    billing_address: Address = Field(..., description="Billing address")
    shipping_method: ShippingMethod = Field(..., description="Shipping method")
    tracking_number: Optional[str] = Field(None, description="Shipping tracking number")
    payment_info: PaymentInfo = Field(..., description="Payment information")
    notes: Optional[str] = Field(None, description="Order notes")
    internal_notes: Optional[str] = Field(None, description="Internal order notes")
    coupon_code: Optional[str] = Field(None, description="Applied coupon code")
    estimated_delivery: Optional[datetime] = Field(None, description="Estimated delivery date")
    shipped_at: Optional[datetime] = Field(None, description="Shipping timestamp")
    delivered_at: Optional[datetime] = Field(None, description="Delivery timestamp")
    created_at: datetime = Field(..., description="Order creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "order_number": "ORD-2023-001",
                "user_id": 123,
                "status": "shipped",
                "items": [
                    {
                        "product_id": 1,
                        "product_name": "Wireless Bluetooth Headphones",
                        "product_sku": "WBH-001",
                        "quantity": 1,
                        "unit_price": 99.99,
                        "total_price": 99.99
                    }
                ],
                "subtotal": 99.99,
                "tax_amount": 8.00,
                "shipping_cost": 9.99,
                "discount_amount": 0.00,
                "total_amount": 117.98,
                "currency": "USD",
                "shipping_address": {
                    "street": "123 Main Street",
                    "city": "New York",
                    "state": "NY",
                    "postal_code": "10001",
                    "country": "US"
                },
                "billing_address": {
                    "street": "123 Main Street",
                    "city": "New York",
                    "state": "NY",
                    "postal_code": "10001",
                    "country": "US"
                },
                "shipping_method": "standard",
                "tracking_number": "1Z999AA1234567890",
                "payment_info": {
                    "method": "credit_card",
                    "status": "paid",
                    "transaction_id": "txn_123456789",
                    "amount": 117.98,
                    "currency": "USD"
                },
                "notes": "Please deliver during business hours",
                "estimated_delivery": "2023-12-05T18:00:00Z",
                "shipped_at": "2023-12-02T10:00:00Z",
                "created_at": "2023-12-01T10:00:00Z",
                "updated_at": "2023-12-02T10:00:00Z"
            }
        }
