"""
Product service for business logic.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from decimal import Decimal
from datetime import datetime

from db.models import Product, ProductReview
from schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductSearch, ProductFilter

class ProductService:
    """Product service class."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_product(self, product_data: ProductCreate) -> Product:
        """
        Create a new product.
        
        Args:
            product_data: Product creation data
            
        Returns:
            Created product
        """
        product = Product(
            name=product_data.name,
            description=product_data.description,
            category=product_data.category.value,
            price=product_data.price,
            compare_price=product_data.compare_price,
            sku=product_data.sku,
            barcode=product_data.barcode,
            weight=product_data.weight,
            dimensions=product_data.dimensions,
            images=[str(url) for url in product_data.images],
            tags=product_data.tags,
            inventory_quantity=product_data.inventory_quantity,
            track_inventory=product_data.track_inventory,
            requires_shipping=product_data.requires_shipping,
            taxable=product_data.taxable,
            seo_title=product_data.seo_title,
            seo_description=product_data.seo_description,
            vendor_id=product_data.vendor_id
        )
        
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        
        return product
    
    def get_product_by_id(self, product_id: int) -> Optional[Product]:
        """
        Get product by ID.
        
        Args:
            product_id: Product ID
            
        Returns:
            Product if found, None otherwise
        """
        return self.db.query(Product).filter(Product.id == product_id).first()
    
    def get_product_by_sku(self, sku: str) -> Optional[Product]:
        """
        Get product by SKU.
        
        Args:
            sku: Product SKU
            
        Returns:
            Product if found, None otherwise
        """
        return self.db.query(Product).filter(Product.sku == sku).first()
    
    def get_products(
        self,
        skip: int = 0,
        limit: int = 100,
        filter_params: Optional[ProductFilter] = None,
        search_params: Optional[ProductSearch] = None
    ) -> List[Product]:
        """
        Get list of products with optional filtering and searching.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            filter_params: Product filter parameters
            search_params: Product search parameters
            
        Returns:
            List of products
        """
        query = self.db.query(Product)
        
        # Apply filters
        if filter_params:
            if filter_params.status:
                query = query.filter(Product.status == filter_params.status.value)
            if filter_params.category:
                query = query.filter(Product.category == filter_params.category.value)
            if filter_params.vendor_id:
                query = query.filter(Product.vendor_id == filter_params.vendor_id)
            if filter_params.featured is not None:
                query = query.filter(Product.featured == filter_params.featured)
            if filter_params.on_sale is not None and filter_params.on_sale:
                query = query.filter(Product.compare_price > Product.price)
        
        # Apply search parameters
        if search_params:
            if search_params.query:
                search_term = f"%{search_params.query}%"
                query = query.filter(
                    or_(
                        Product.name.ilike(search_term),
                        Product.description.ilike(search_term),
                        Product.tags.op('?')(search_params.query)  # PostgreSQL JSON operator
                    )
                )
            
            if search_params.category:
                query = query.filter(Product.category == search_params.category.value)
            
            if search_params.min_price is not None:
                query = query.filter(Product.price >= search_params.min_price)
            
            if search_params.max_price is not None:
                query = query.filter(Product.price <= search_params.max_price)
            
            if search_params.min_rating is not None:
                query = query.filter(Product.average_rating >= search_params.min_rating)
            
            if search_params.in_stock is not None and search_params.in_stock:
                query = query.filter(Product.inventory_quantity > 0)
            
            if search_params.tags:
                for tag in search_params.tags:
                    query = query.filter(Product.tags.op('?')(tag))
        
        return query.offset(skip).limit(limit).all()
    
    def update_product(self, product_id: int, product_data: ProductUpdate) -> Optional[Product]:
        """
        Update product.
        
        Args:
            product_id: Product ID
            product_data: Product update data
            
        Returns:
            Updated product if found, None otherwise
        """
        product = self.get_product_by_id(product_id)
        if not product:
            return None
        
        # Update fields
        update_data = product_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "images" and value:
                setattr(product, field, [str(url) for url in value])
            else:
                setattr(product, field, value)
        
        product.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(product)
        
        return product
    
    def delete_product(self, product_id: int) -> bool:
        """
        Delete product.
        
        Args:
            product_id: Product ID
            
        Returns:
            True if deleted, False if not found
        """
        product = self.get_product_by_id(product_id)
        if not product:
            return False
        
        self.db.delete(product)
        self.db.commit()
        
        return True
    
    def update_inventory(self, product_id: int, quantity_change: int) -> bool:
        """
        Update product inventory.
        
        Args:
            product_id: Product ID
            quantity_change: Change in quantity (positive for increase, negative for decrease)
            
        Returns:
            True if successful, False if product not found or insufficient inventory
        """
        product = self.get_product_by_id(product_id)
        if not product:
            return False
        
        new_quantity = product.inventory_quantity + quantity_change
        
        # Check if we're trying to reduce below 0
        if new_quantity < 0:
            return False
        
        product.inventory_quantity = new_quantity
        product.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return True
    
    def update_product_rating(self, product_id: int) -> None:
        """
        Update product average rating and review count.
        
        Args:
            product_id: Product ID
        """
        # Get all reviews for the product
        reviews = self.db.query(ProductReview).filter(ProductReview.product_id == product_id).all()
        
        if reviews:
            total_rating = sum(review.rating for review in reviews)
            average_rating = total_rating / len(reviews)
            review_count = len(reviews)
        else:
            average_rating = None
            review_count = 0
        
        # Update product
        product = self.get_product_by_id(product_id)
        if product:
            product.average_rating = Decimal(str(average_rating)) if average_rating else None
            product.review_count = review_count
            product.updated_at = datetime.utcnow()
            
            self.db.commit()
    
    def get_featured_products(self, limit: int = 10) -> List[Product]:
        """
        Get featured products.
        
        Args:
            limit: Maximum number of products to return
            
        Returns:
            List of featured products
        """
        return (
            self.db.query(Product)
            .filter(Product.featured == True)
            .filter(Product.status == "active")
            .order_by(Product.created_at.desc())
            .limit(limit)
            .all()
        )
    
    def get_product_count(self) -> int:
        """
        Get total number of products.
        
        Returns:
            Total product count
        """
        return self.db.query(Product).count()
    
    def search_products(self, search_params: ProductSearch, skip: int = 0, limit: int = 100) -> List[Product]:
        """
        Search products with advanced filtering.
        
        Args:
            search_params: Search parameters
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of matching products
        """
        return self.get_products(skip=skip, limit=limit, search_params=search_params)
