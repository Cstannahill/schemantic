"""
Product-related schemas for request/response validation.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator
from enum import Enum


class ProductStatus(str, Enum):
    """Product status enumeration."""
    
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"


class ProductCategory(str, Enum):
    """Product category enumeration."""
    
    ELECTRONICS = "electronics"
    CLOTHING = "clothing"
    BOOKS = "books"
    HOME = "home"
    SPORTS = "sports"
    BEAUTY = "beauty"
    AUTOMOTIVE = "automotive"
    FOOD = "food"


class ProductReview(BaseModel):
    """Product review schema."""
    
    id: int = Field(..., description="Review ID")
    user_id: int = Field(..., description="User ID who wrote the review")
    user_name: str = Field(..., description="User name")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    title: str = Field(..., max_length=200, description="Review title")
    comment: str = Field(..., max_length=1000, description="Review comment")
    verified_purchase: bool = Field(default=False, description="Whether user purchased the product")
    helpful_count: int = Field(default=0, description="Number of helpful votes")
    created_at: datetime = Field(..., description="Review creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 123,
                "user_name": "John Doe",
                "rating": 5,
                "title": "Great product!",
                "comment": "This product exceeded my expectations. Highly recommended!",
                "verified_purchase": True,
                "helpful_count": 15,
                "created_at": "2023-12-01T10:00:00Z",
                "updated_at": "2023-12-01T10:00:00Z"
            }
        }


class ProductSearch(BaseModel):
    """Product search parameters."""
    
    query: Optional[str] = Field(None, description="Search query")
    category: Optional[ProductCategory] = Field(None, description="Product category")
    min_price: Optional[Decimal] = Field(None, ge=0, description="Minimum price")
    max_price: Optional[Decimal] = Field(None, ge=0, description="Maximum price")
    min_rating: Optional[int] = Field(None, ge=1, le=5, description="Minimum rating")
    in_stock: Optional[bool] = Field(None, description="Filter by stock availability")
    tags: Optional[List[str]] = Field(None, description="Product tags")
    
    @model_validator(mode='after')
    def validate_price_range(self):
        """Validate price range."""
        if self.max_price is not None and self.min_price is not None:
            if self.max_price < self.min_price:
                raise ValueError('max_price must be greater than min_price')
        return self
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "wireless headphones",
                "category": "electronics",
                "min_price": 50.00,
                "max_price": 200.00,
                "min_rating": 4,
                "in_stock": True,
                "tags": ["wireless", "bluetooth", "audio"]
            }
        }


class ProductFilter(BaseModel):
    """Product filter parameters."""
    
    status: Optional[ProductStatus] = Field(None, description="Product status")
    category: Optional[ProductCategory] = Field(None, description="Product category")
    vendor_id: Optional[int] = Field(None, description="Vendor ID")
    featured: Optional[bool] = Field(None, description="Featured products only")
    on_sale: Optional[bool] = Field(None, description="Products on sale")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "active",
                "category": "electronics",
                "featured": True,
                "on_sale": False
            }
        }


class ProductCreate(BaseModel):
    """Product creation schema."""
    
    name: str = Field(..., min_length=1, max_length=200, description="Product name")
    description: str = Field(..., min_length=10, max_length=2000, description="Product description")
    category: ProductCategory = Field(..., description="Product category")
    price: Decimal = Field(..., gt=0, decimal_places=2, description="Product price")
    compare_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2, description="Compare at price")
    sku: str = Field(..., min_length=1, max_length=100, description="Product SKU")
    barcode: Optional[str] = Field(None, description="Product barcode")
    weight: Optional[Decimal] = Field(None, ge=0, decimal_places=2, description="Product weight in kg")
    dimensions: Optional[Dict[str, Decimal]] = Field(None, description="Product dimensions")
    images: List[HttpUrl] = Field(default_factory=list, description="Product image URLs")
    tags: List[str] = Field(default_factory=list, description="Product tags")
    inventory_quantity: int = Field(default=0, ge=0, description="Inventory quantity")
    track_inventory: bool = Field(default=True, description="Whether to track inventory")
    requires_shipping: bool = Field(default=True, description="Whether product requires shipping")
    taxable: bool = Field(default=True, description="Whether product is taxable")
    seo_title: Optional[str] = Field(None, max_length=60, description="SEO title")
    seo_description: Optional[str] = Field(None, max_length=160, description="SEO description")
    vendor_id: Optional[int] = Field(None, description="Vendor ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Wireless Bluetooth Headphones",
                "description": "High-quality wireless headphones with noise cancellation",
                "category": "electronics",
                "price": 99.99,
                "compare_price": 149.99,
                "sku": "WBH-001",
                "barcode": "1234567890123",
                "weight": 0.3,
                "dimensions": {"length": 20.0, "width": 15.0, "height": 8.0},
                "images": ["https://example.com/image1.jpg"],
                "tags": ["wireless", "bluetooth", "audio", "headphones"],
                "inventory_quantity": 100,
                "track_inventory": True,
                "requires_shipping": True,
                "taxable": True,
                "seo_title": "Wireless Bluetooth Headphones - Premium Audio",
                "seo_description": "Experience premium audio with our wireless Bluetooth headphones",
                "vendor_id": 1
            }
        }


class ProductUpdate(BaseModel):
    """Product update schema."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Product name")
    description: Optional[str] = Field(None, min_length=10, max_length=2000, description="Product description")
    category: Optional[ProductCategory] = Field(None, description="Product category")
    price: Optional[Decimal] = Field(None, gt=0, decimal_places=2, description="Product price")
    compare_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2, description="Compare at price")
    status: Optional[ProductStatus] = Field(None, description="Product status")
    sku: Optional[str] = Field(None, min_length=1, max_length=100, description="Product SKU")
    barcode: Optional[str] = Field(None, description="Product barcode")
    weight: Optional[Decimal] = Field(None, ge=0, decimal_places=2, description="Product weight in kg")
    dimensions: Optional[Dict[str, Decimal]] = Field(None, description="Product dimensions")
    images: Optional[List[HttpUrl]] = Field(None, description="Product image URLs")
    tags: Optional[List[str]] = Field(None, description="Product tags")
    inventory_quantity: Optional[int] = Field(None, ge=0, description="Inventory quantity")
    track_inventory: Optional[bool] = Field(None, description="Whether to track inventory")
    requires_shipping: Optional[bool] = Field(None, description="Whether product requires shipping")
    taxable: Optional[bool] = Field(None, description="Whether product is taxable")
    seo_title: Optional[str] = Field(None, max_length=60, description="SEO title")
    seo_description: Optional[str] = Field(None, max_length=160, description="SEO description")
    featured: Optional[bool] = Field(None, description="Whether product is featured")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Updated Wireless Bluetooth Headphones",
                "price": 89.99,
                "status": "active",
                "featured": True
            }
        }


class ProductResponse(BaseModel):
    """Product response schema."""
    
    id: int = Field(..., description="Product ID")
    name: str = Field(..., description="Product name")
    description: str = Field(..., description="Product description")
    category: ProductCategory = Field(..., description="Product category")
    price: Decimal = Field(..., description="Product price")
    compare_price: Optional[Decimal] = Field(None, description="Compare at price")
    status: ProductStatus = Field(..., description="Product status")
    sku: str = Field(..., description="Product SKU")
    barcode: Optional[str] = Field(None, description="Product barcode")
    weight: Optional[Decimal] = Field(None, description="Product weight in kg")
    dimensions: Optional[Dict[str, Decimal]] = Field(None, description="Product dimensions")
    images: List[HttpUrl] = Field(..., description="Product image URLs")
    tags: List[str] = Field(..., description="Product tags")
    inventory_quantity: int = Field(..., description="Inventory quantity")
    track_inventory: bool = Field(..., description="Whether to track inventory")
    requires_shipping: bool = Field(..., description="Whether product requires shipping")
    taxable: bool = Field(..., description="Whether product is taxable")
    seo_title: Optional[str] = Field(None, description="SEO title")
    seo_description: Optional[str] = Field(None, description="SEO description")
    featured: bool = Field(default=False, description="Whether product is featured")
    average_rating: Optional[Decimal] = Field(None, description="Average rating")
    review_count: int = Field(default=0, description="Number of reviews")
    vendor_id: Optional[int] = Field(None, description="Vendor ID")
    created_at: datetime = Field(..., description="Product creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Wireless Bluetooth Headphones",
                "description": "High-quality wireless headphones with noise cancellation",
                "category": "electronics",
                "price": 99.99,
                "compare_price": 149.99,
                "status": "active",
                "sku": "WBH-001",
                "barcode": "1234567890123",
                "weight": 0.3,
                "dimensions": {"length": 20.0, "width": 15.0, "height": 8.0},
                "images": ["https://example.com/image1.jpg"],
                "tags": ["wireless", "bluetooth", "audio", "headphones"],
                "inventory_quantity": 100,
                "track_inventory": True,
                "requires_shipping": True,
                "taxable": True,
                "seo_title": "Wireless Bluetooth Headphones - Premium Audio",
                "seo_description": "Experience premium audio with our wireless Bluetooth headphones",
                "featured": True,
                "average_rating": 4.5,
                "review_count": 25,
                "vendor_id": 1,
                "created_at": "2023-12-01T10:00:00Z",
                "updated_at": "2023-12-01T10:00:00Z"
            }
        }
