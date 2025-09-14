# FastAPI + Type-Sync: Complete Tutorial

This tutorial shows you how to build a complete, type-safe full-stack application using FastAPI, Type-Sync, and React with TypeScript.

## Prerequisites

- Python 3.8+ with pip
- Node.js 16+ with npm
- Basic knowledge of FastAPI and React

## Project Overview

We'll build an e-commerce API with the following features:

- User authentication and management
- Product catalog
- Order management
- Type-safe frontend with generated API client
- React hooks for data fetching

## Part 1: FastAPI Backend Setup

### 1.1 Create the FastAPI Project

```bash
# Create project directory
mkdir fastapi-typesync-demo
cd fastapi-typesync-demo

# Create backend directory
mkdir backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pydantic sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart
```

### 1.2 Create the Database Models

Create `backend/models.py`:

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    orders = relationship("Order", back_populates="user")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    stock_quantity = Column(Integer, default=0)
    image_url = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    order_items = relationship("OrderItem", back_populates="product")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, processing, shipped, delivered, cancelled
    shipping_address = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
```

### 1.3 Create Pydantic Schemas

Create `backend/schemas.py`:

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Optional
from enum import Enum

# Enums
class OrderStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"

class ProductCategory(str, Enum):
    electronics = "electronics"
    clothing = "clothing"
    books = "books"
    home = "home"
    sports = "sports"

# Base schemas
class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    full_name: Optional[str] = Field(None, max_length=100, description="User's full name")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="User's password (min 8 characters)")

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = Field(None, description="Updated email address")
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Updated username")
    full_name: Optional[str] = Field(None, max_length=100, description="Updated full name")
    is_active: Optional[bool] = Field(None, description="Whether user is active")

class User(UserBase):
    id: int = Field(..., description="Unique user identifier")
    is_active: bool = Field(..., description="Whether user is active")
    is_admin: bool = Field(..., description="Whether user has admin privileges")
    created_at: datetime = Field(..., description="User creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True

# Product schemas
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Product name")
    description: Optional[str] = Field(None, max_length=1000, description="Product description")
    price: float = Field(..., gt=0, description="Product price (must be positive)")
    category: ProductCategory = Field(..., description="Product category")
    stock_quantity: int = Field(0, ge=0, description="Available stock quantity")
    image_url: Optional[str] = Field(None, description="Product image URL")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Updated product name")
    description: Optional[str] = Field(None, max_length=1000, description="Updated description")
    price: Optional[float] = Field(None, gt=0, description="Updated price")
    category: Optional[ProductCategory] = Field(None, description="Updated category")
    stock_quantity: Optional[int] = Field(None, ge=0, description="Updated stock quantity")
    image_url: Optional[str] = Field(None, description="Updated image URL")
    is_active: Optional[bool] = Field(None, description="Whether product is active")

class Product(ProductBase):
    id: int = Field(..., description="Unique product identifier")
    is_active: bool = Field(..., description="Whether product is active")
    created_at: datetime = Field(..., description="Product creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True

# Order schemas
class OrderItemBase(BaseModel):
    product_id: int = Field(..., description="Product identifier")
    quantity: int = Field(..., gt=0, description="Quantity ordered")

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int = Field(..., description="Unique order item identifier")
    unit_price: float = Field(..., description="Price per unit at time of order")
    product: Product = Field(..., description="Product details")

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    shipping_address: str = Field(..., min_length=10, max_length=500, description="Shipping address")

class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = Field(..., min_items=1, description="List of items to order")

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = Field(None, description="Updated order status")
    shipping_address: Optional[str] = Field(None, min_length=10, max_length=500, description="Updated shipping address")

class Order(OrderBase):
    id: int = Field(..., description="Unique order identifier")
    user_id: int = Field(..., description="User who placed the order")
    total_amount: float = Field(..., description="Total order amount")
    status: OrderStatus = Field(..., description="Current order status")
    created_at: datetime = Field(..., description="Order creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    items: List[OrderItem] = Field(..., description="List of ordered items")
    user: User = Field(..., description="User details")

    class Config:
        from_attributes = True

# Authentication schemas
class Token(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")

# API Response schemas
class APIResponse(BaseModel):
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    data: Optional[dict] = Field(None, description="Response data")

class PaginatedResponse(BaseModel):
    items: List[dict] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    pages: int = Field(..., description="Total number of pages")

# Health check schema
class HealthCheck(BaseModel):
    status: str = Field("healthy", description="Service health status")
    timestamp: datetime = Field(..., description="Health check timestamp")
    version: str = Field("1.0.0", description="API version")
```

### 1.4 Create the FastAPI Application

Create `backend/main.py`:

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import uvicorn

from models import Base, User, Product, Order, OrderItem
from schemas import (
    User as UserSchema, UserCreate, UserUpdate,
    Product as ProductSchema, ProductCreate, ProductUpdate,
    Order as OrderSchema, OrderCreate, OrderUpdate,
    Token, LoginRequest, HealthCheck, APIResponse, PaginatedResponse,
    OrderStatus, ProductCategory
)
from database import engine, get_db
from auth import authenticate_user, create_access_token, get_current_user, get_password_hash

# Create database tables
Base.metadata.create_all(bind=engine)

# FastAPI app configuration
app = FastAPI(
    title="E-Commerce API",
    description="A comprehensive e-commerce API built with FastAPI and Type-Sync",
    version="1.0.0",
    contact={
        "name": "API Support",
        "email": "support@ecommerce-api.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Health check endpoint
@app.get("/health", response_model=HealthCheck, tags=["Health"])
async def health_check():
    """Check the health status of the API"""
    return HealthCheck(timestamp=datetime.utcnow())

# Authentication endpoints
@app.post("/auth/register", response_model=UserSchema, tags=["Authentication"])
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account"""
    # Check if user already exists
    db_user = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()

    if db_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email or username already exists"
        )

    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

@app.post("/auth/login", response_model=Token, tags=["Authentication"])
async def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=UserSchema, tags=["Authentication"])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user

# User management endpoints
@app.get("/users", response_model=List[UserSchema], tags=["Users"])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of users (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    users = db.query(User).offset(skip).limit(limit).all()
    return users

@app.get("/users/{user_id}", response_model=UserSchema, tags=["Users"])
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user

@app.put("/users/{user_id}", response_model=UserSchema, tags=["Users"])
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user information"""
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return user

# Product endpoints
@app.get("/products", response_model=List[ProductSchema], tags=["Products"])
async def get_products(
    skip: int = 0,
    limit: int = 100,
    category: Optional[ProductCategory] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of products with optional filtering"""
    query = db.query(Product).filter(Product.is_active == True)

    if category:
        query = query.filter(Product.category == category)

    if search:
        query = query.filter(Product.name.contains(search))

    products = query.offset(skip).limit(limit).all()
    return products

@app.get("/products/{product_id}", response_model=ProductSchema, tags=["Products"])
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get product by ID"""
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return product

@app.post("/products", response_model=ProductSchema, tags=["Products"])
async def create_product(
    product: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    return db_product

@app.put("/products/{product_id}", response_model=ProductSchema, tags=["Products"])
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update product (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)

    return product

# Order endpoints
@app.get("/orders", response_model=List[OrderSchema], tags=["Orders"])
async def get_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[OrderStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's orders"""
    query = db.query(Order).filter(Order.user_id == current_user.id)

    if status:
        query = query.filter(Order.status == status)

    orders = query.offset(skip).limit(limit).all()
    return orders

@app.get("/orders/{order_id}", response_model=OrderSchema, tags=["Orders"])
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order by ID"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return order

@app.post("/orders", response_model=OrderSchema, tags=["Orders"])
async def create_order(
    order: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order"""
    total_amount = 0
    order_items = []

    # Calculate total and validate products
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id, Product.is_active == True).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        if product.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for product {product.name}")

        item_total = product.price * item.quantity
        total_amount += item_total

        order_items.append(OrderItem(
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=product.price
        ))

    # Create order
    db_order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        shipping_address=order.shipping_address,
        items=order_items
    )

    # Update product stock
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        product.stock_quantity -= item.quantity

    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    return db_order

@app.put("/orders/{order_id}", response_model=OrderSchema, tags=["Orders"])
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update order status (admin only for status changes)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check permissions
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Only admins can change status
    if order_update.status and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can change order status")

    update_data = order_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)

    return order

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 1.5 Create Database Configuration

Create `backend/database.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./ecommerce.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 1.6 Create Authentication System

Create `backend/auth.py`:

```python
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from models import User
from schemas import TokenData
from database import get_db

# Configuration
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()

    if not user or not verify_password(password, user.hashed_password):
        return False

    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception

    return user
```

### 1.7 Run the FastAPI Server

```bash
cd backend
uvicorn main:app --reload
```

Your API will be available at http://localhost:8000, with interactive docs at http://localhost:8000/docs.

## Part 2: Generate TypeScript Types with Type-Sync

### 2.1 Install Type-Sync

```bash
# Go back to project root
cd ..

# Install Type-Sync
npm install -g type-sync
```

### 2.2 Generate Types and API Client

```bash
# Create output directory
mkdir frontend/src/generated

# Generate types and API client with React hooks
npx type-sync generate \
  --url http://localhost:8000/openapi.json \
  --output ./frontend/src/generated \
  --hooks \
  --naming camelCase \
  --prefix "API"

# Generated files:
# - types.ts (TypeScript interfaces)
# - api-client.ts (API client class)
# - hooks.ts (React hooks)
# - index.ts (barrel exports)
```

### 2.3 Verify Generated Types

Check the generated files:

```typescript
// frontend/src/generated/types.ts
export interface APIUser {
  id: number;
  email: string;
  username: string;
  fullName?: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface APIProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  category: APIProductCategory;
  stockQuantity: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum APIProductCategory {
  ELECTRONICS = "electronics",
  CLOTHING = "clothing",
  BOOKS = "books",
  HOME = "home",
  SPORTS = "sports",
}

export enum APIOrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

// ... many more types
```

## Part 3: React Frontend Setup

### 3.1 Create React Application

```bash
# Create React app with TypeScript
npx create-react-app frontend --template typescript
cd frontend

# Install additional dependencies
npm install @tanstack/react-query axios react-router-dom @types/react-router-dom
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

### 3.2 Configure API Client

Create `frontend/src/api/client.ts`:

```typescript
import { ECommerceApiClient } from "../generated";

// Create API client instance
export const apiClient = new ECommerceApiClient({
  baseUrl: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add authentication token to requests
export const setAuthToken = (token: string) => {
  apiClient.setDefaultHeader("Authorization", `Bearer ${token}`);
};

export const clearAuthToken = () => {
  apiClient.removeDefaultHeader("Authorization");
};
```

### 3.3 Setup React Query and Hooks

Create `frontend/src/hooks/api.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { createApiHooks } from "../generated";

// Create typed hooks
export const apiHooks = createApiHooks(apiClient);

// Export specific hooks for easy use
export const {
  // Authentication hooks
  useAuthRegisterMutation,
  useAuthLoginMutation,
  useAuthMeQuery,

  // User hooks
  useUsersQuery,
  useUsersUserIdQuery,
  useUsersUserIdMutation,

  // Product hooks
  useProductsQuery,
  useProductsProductIdQuery,
  useProductsMutation,
  useProductsProductIdMutation,

  // Order hooks
  useOrdersQuery,
  useOrdersOrderIdQuery,
  useOrdersMutation,
  useOrdersOrderIdMutation,
} = apiHooks;

// Custom hooks for common patterns
export const useAuth = () => {
  const queryClient = useQueryClient();

  const loginMutation = useAuthLoginMutation({
    onSuccess: (data) => {
      localStorage.setItem("token", data.accessToken);
      queryClient.invalidateQueries(["auth", "me"]);
    },
  });

  const logout = () => {
    localStorage.removeItem("token");
    queryClient.clear();
  };

  return {
    login: loginMutation.mutate,
    logout,
    isLoading: loginMutation.isLoading,
    error: loginMutation.error,
  };
};

export const useProducts = (filters?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useProductsQuery({
    query: {
      skip: ((filters?.page || 1) - 1) * (filters?.limit || 20),
      limit: filters?.limit || 20,
      category: filters?.category,
      search: filters?.search,
    },
  });
};

export const useUserOrders = (userId?: number) => {
  return useOrdersQuery({
    enabled: !!userId,
  });
};
```

### 3.4 Create React Components

Create `frontend/src/components/ProductList.tsx`:

```typescript
import React, { useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { APIProduct, APIProductCategory } from "../generated";
import { useProducts } from "../hooks/api";

interface ProductListProps {
  onAddToCart?: (product: APIProduct) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onAddToCart }) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<APIProductCategory | "">("");
  const [page, setPage] = useState(1);

  const {
    data: products,
    isLoading,
    error,
  } = useProducts({
    search: search || undefined,
    category: category || undefined,
    page,
    limit: 12,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">Failed to load products: {error.message}</Alert>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          label="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as APIProductCategory)}
            label="Category"
          >
            <MenuItem value="">All Categories</MenuItem>
            {Object.values(APIProductCategory).map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Product Grid */}
      <Grid container spacing={3}>
        {products?.map((product) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
            <Card>
              {product.imageUrl && (
                <CardMedia
                  component="img"
                  height="200"
                  image={product.imageUrl}
                  alt={product.name}
                />
              )}

              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  {product.name}
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                  {product.description}
                </Typography>

                <Typography variant="h6" color="primary" gutterBottom>
                  ${product.price.toFixed(2)}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Stock: {product.stockQuantity}
                </Typography>

                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={product.stockQuantity === 0}
                  onClick={() => onAddToCart?.(product)}
                >
                  {product.stockQuantity === 0 ? "Out of Stock" : "Add to Cart"}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
```

Create `frontend/src/components/UserProfile.tsx`:

```typescript
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useAuthMeQuery } from "../hooks/api";

export const UserProfile: React.FC = () => {
  const { data: user, isLoading, error } = useAuthMeQuery();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load user profile: {error.message}
      </Alert>
    );
  }

  if (!user) {
    return <Alert severity="info">Please log in to view your profile.</Alert>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h1" gutterBottom>
          User Profile
        </Typography>

        <Box display="flex" flexDirection="column" gap={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Username:
            </Typography>
            <Typography>{user.username}</Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Email:
            </Typography>
            <Typography>{user.email}</Typography>
          </Box>

          {user.fullName && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Full Name:
              </Typography>
              <Typography>{user.fullName}</Typography>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Status:
            </Typography>
            <Box display="flex" gap={1}>
              <Chip
                label={user.isActive ? "Active" : "Inactive"}
                color={user.isActive ? "success" : "error"}
                size="small"
              />
              {user.isAdmin && (
                <Chip label="Admin" color="primary" size="small" />
              )}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Member Since:
            </Typography>
            <Typography>
              {new Date(user.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          sx={{ mt: 3 }}
          onClick={() => {
            // Handle edit profile
          }}
        >
          Edit Profile
        </Button>
      </CardContent>
    </Card>
  );
};
```

Create `frontend/src/components/OrderHistory.tsx`:

```typescript
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { APIOrderStatus } from "../generated";
import { useOrdersQuery } from "../hooks/api";

const getStatusColor = (status: APIOrderStatus) => {
  switch (status) {
    case APIOrderStatus.PENDING:
      return "warning";
    case APIOrderStatus.PROCESSING:
      return "info";
    case APIOrderStatus.SHIPPED:
      return "primary";
    case APIOrderStatus.DELIVERED:
      return "success";
    case APIOrderStatus.CANCELLED:
      return "error";
    default:
      return "default";
  }
};

export const OrderHistory: React.FC = () => {
  const { data: orders, isLoading, error } = useOrdersQuery();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">Failed to load orders: {error.message}</Alert>
    );
  }

  if (!orders || orders.length === 0) {
    return <Alert severity="info">You haven't placed any orders yet.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        Order History
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>#{order.id}</TableCell>
                <TableCell>
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                </TableCell>
                <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={order.status.toUpperCase()}
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
```

### 3.5 Setup App with React Query

Update `frontend/src/App.tsx`:

```typescript
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ProductList } from "./components/ProductList";
import { UserProfile } from "./components/UserProfile";
import { OrderHistory } from "./components/OrderHistory";

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<ProductList />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/orders" element={<OrderHistory />} />
            </Routes>
          </div>
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
```

## Part 4: Run the Complete Application

### 4.1 Start the Backend

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload
```

### 4.2 Start the Frontend

```bash
cd frontend
npm start
```

### 4.3 Test the Integration

1. **Visit the API docs**: http://localhost:8000/docs
2. **Visit the React app**: http://localhost:3000
3. **Test the type safety**: Try modifying API responses and see TypeScript errors in the frontend

## Part 5: Advanced Features

### 5.1 Regenerate Types on API Changes

Create `scripts/update-types.sh`:

```bash
#!/bin/bash
echo "🔄 Updating TypeScript types from API..."

# Check if API is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "❌ API server is not running. Please start it first."
    exit 1
fi

# Generate new types
npx type-sync generate \
  --url http://localhost:8000/openapi.json \
  --output ./frontend/src/generated \
  --hooks \
  --naming camelCase \
  --prefix "API"

echo "✅ Types updated successfully!"
echo "🏗️ Building frontend to verify types..."

cd frontend
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend builds successfully with new types!"
else
    echo "❌ Frontend build failed. Please check for type errors."
    exit 1
fi
```

### 5.2 Add Type-Safe Error Handling

Create `frontend/src/utils/errors.ts`:

```typescript
import { APIResponse } from "../generated";

export class APIError extends Error {
  constructor(message: string, public status: number, public response?: any) {
    super(message);
    this.name = "APIError";
  }
}

export const handleAPIError = (error: any): string => {
  if (error instanceof APIError) {
    return `API Error (${error.status}): ${error.message}`;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  return error.message || "An unexpected error occurred";
};
```

### 5.3 Add Real-time Updates with WebSockets

The generated types can also be used with WebSocket events:

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useState } from "react";
import { APIOrder } from "../generated";

export const useOrderUpdates = (userId: number) => {
  const [orders, setOrders] = useState<APIOrder[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/orders/${userId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Type-safe handling of WebSocket messages
      if (data.type === "order_update") {
        const updatedOrder: APIOrder = data.order;
        setOrders((prev) =>
          prev.map((order) =>
            order.id === updatedOrder.id ? updatedOrder : order
          )
        );
      }
    };

    return () => ws.close();
  }, [userId]);

  return orders;
};
```

## Conclusion

You now have a complete, type-safe full-stack application with:

1. ✅ **FastAPI backend** with comprehensive API
2. ✅ **Generated TypeScript types** that match your API exactly
3. ✅ **Type-safe API client** with error handling
4. ✅ **React hooks** for data fetching with React Query
5. ✅ **Full type safety** from database to UI
6. ✅ **Automatic synchronization** between backend and frontend types

### Key Benefits

- **Type Safety**: Catch API integration errors at compile time
- **Developer Experience**: Auto-completion and IntelliSense for API calls
- **Maintainability**: Types automatically update when API changes
- **Performance**: Optimized data fetching with React Query
- **Scalability**: Clean separation of concerns and modular architecture

### Next Steps

1. **Add authentication persistence** with localStorage
2. **Implement real-time features** with WebSockets
3. **Add comprehensive error handling** throughout the app
4. **Set up automated type generation** in your CI/CD pipeline
5. **Add testing** with the generated types for both frontend and backend

This tutorial demonstrates the power of Type-Sync in creating maintainable, type-safe full-stack applications where the frontend and backend always stay in sync!
