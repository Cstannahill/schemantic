"""
FastAPI Edge Cases Example

This example demonstrates complex FastAPI/Pydantic patterns that type-sync handles
better than generic OpenAPI generators:

1. Discriminated Unions (oneOf/anyOf)
2. Complex Inheritance (allOf)
3. Nullable vs Optional distinctions
4. Nested discriminated unions
5. Generic response models
6. Enum handling
7. Complex nested objects
"""

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field, validator
from typing import Union, Literal, Optional, List, Generic, TypeVar, Dict, Any
from enum import Enum
from datetime import datetime
from uuid import UUID, uuid4

app = FastAPI(
    title="Edge Cases API",
    description="Demonstrates complex FastAPI patterns for type-sync",
    version="1.0.0",
)

# =====================================================
# 1. DISCRIMINATED UNIONS (oneOf/anyOf)
# =====================================================


class NotificationType(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    WEBHOOK = "webhook"


class BaseNotification(BaseModel):
    id: UUID
    created_at: datetime
    message: str


class EmailNotification(BaseNotification):
    type: Literal["email"]
    email_address: str
    subject: str
    html_content: Optional[str] = None


class SMSNotification(BaseNotification):
    type: Literal["sms"]
    phone_number: str
    country_code: str = "+1"


class PushNotification(BaseNotification):
    type: Literal["push"]
    device_id: str
    badge_count: Optional[int] = None
    sound: Optional[str] = "default"


class WebhookNotification(BaseNotification):
    type: Literal["webhook"]
    webhook_url: str
    headers: Dict[str, str] = {}
    retry_count: int = 3


# Discriminated union
Notification = Union[
    EmailNotification, SMSNotification, PushNotification, WebhookNotification
]

# =====================================================
# 2. COMPLEX INHERITANCE (allOf)
# =====================================================


class BaseUser(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    is_active: bool = True


class UserProfile(BaseModel):
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


class UserPreferences(BaseModel):
    timezone: str = "UTC"
    language: str = "en"
    notifications_enabled: bool = True
    theme: Literal["light", "dark", "auto"] = "auto"


class RegularUser(BaseUser):
    profile: UserProfile
    preferences: UserPreferences
    subscription_tier: Literal["free", "premium"] = "free"


class AdminUser(BaseUser):
    profile: UserProfile
    preferences: UserPreferences
    permissions: List[str]
    last_login: Optional[datetime] = None


class SystemUser(BaseUser):
    """System users don't have profiles"""

    api_key: str
    rate_limit: int = 1000
    allowed_scopes: List[str]


# Another discriminated union
User = Union[RegularUser, AdminUser, SystemUser]

# =====================================================
# 3. NULLABLE VS OPTIONAL DISTINCTIONS
# =====================================================


class ProductStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    OUT_OF_STOCK = "out_of_stock"


class Product(BaseModel):
    id: UUID
    name: str  # Required
    description: Optional[str]  # Optional (can be undefined)
    price: float | None  # Required but nullable
    sale_price: Optional[float | None]  # Optional AND nullable
    status: ProductStatus
    image_url: Optional[str] = None  # Optional with default
    metadata: Dict[str, Any] = {}  # Required with default
    tags: List[str] = []  # Required list, can be empty
    created_at: datetime
    updated_at: Optional[datetime] = None


# =====================================================
# 4. NESTED DISCRIMINATED UNIONS
# =====================================================


class PaymentMethodType(str, Enum):
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"
    DIGITAL_WALLET = "digital_wallet"
    CRYPTO = "crypto"


class CreditCardPayment(BaseModel):
    type: Literal["credit_card"]
    card_number: str = Field(..., pattern=r"\d{16}")
    expiry_month: int = Field(..., ge=1, le=12)
    expiry_year: int = Field(..., ge=2024)
    cvv: str = Field(..., pattern=r"\d{3,4}")
    cardholder_name: str


class BankTransferPayment(BaseModel):
    type: Literal["bank_transfer"]
    account_number: str
    routing_number: str
    bank_name: str
    account_holder_name: str


class DigitalWalletType(str, Enum):
    PAYPAL = "paypal"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"


class DigitalWalletPayment(BaseModel):
    type: Literal["digital_wallet"]
    wallet_type: DigitalWalletType
    wallet_id: str


class CryptoCurrency(str, Enum):
    BITCOIN = "bitcoin"
    ETHEREUM = "ethereum"
    LITECOIN = "litecoin"


class CryptoPayment(BaseModel):
    type: Literal["crypto"]
    currency: CryptoCurrency
    wallet_address: str
    network: str = "mainnet"


PaymentMethod = Union[
    CreditCardPayment, BankTransferPayment, DigitalWalletPayment, CryptoPayment
]


class Order(BaseModel):
    id: UUID
    user_id: UUID
    products: List[Product]
    payment_method: PaymentMethod  # Nested discriminated union
    notifications: List[Notification]  # List of discriminated unions
    total_amount: float
    status: Literal["pending", "processing", "shipped", "delivered", "cancelled"]
    created_at: datetime
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


# =====================================================
# 5. GENERIC RESPONSE MODELS
# =====================================================

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool


class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    message: str = ""
    errors: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =====================================================
# 6. COMPLEX NESTED OBJECTS
# =====================================================


class Address(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str
    country: str = "US"
    coordinates: Optional[Dict[str, float]] = None  # {"lat": 40.7128, "lng": -74.0060}


class Company(BaseModel):
    id: UUID
    name: str
    domain: str
    industry: Optional[str] = None
    headquarters: Address
    offices: List[Address] = []
    employees: List[User] = []
    metadata: Dict[str, Any] = {}


# =====================================================
# API ENDPOINTS
# =====================================================


@app.get("/notifications", response_model=PaginatedResponse[Notification])
async def get_notifications(
    page: int = 1, size: int = 20, notification_type: Optional[NotificationType] = None
):
    """Get paginated notifications with discriminated union responses"""
    # Mock data - in reality would query database
    notifications = [
        EmailNotification(
            id=uuid4(),
            created_at=datetime.utcnow(),
            message="Welcome to our platform!",
            type="email",
            email_address="user@example.com",
            subject="Welcome!",
        ),
        SMSNotification(
            id=uuid4(),
            created_at=datetime.utcnow(),
            message="Your order has shipped",
            type="sms",
            phone_number="555-0123",
        ),
    ]

    return PaginatedResponse(
        items=notifications,
        total=len(notifications),
        page=page,
        size=size,
        pages=1,
        has_next=False,
        has_prev=False,
    )


@app.post("/notifications", response_model=APIResponse[Notification])
async def create_notification(notification: Notification):
    """Create a notification using discriminated union input"""
    # Process based on notification type
    if notification.type == "email":
        # Handle email notification
        pass
    elif notification.type == "sms":
        # Handle SMS notification
        pass
    # etc.

    return APIResponse(
        success=True, data=notification, message="Notification created successfully"
    )


@app.get("/users", response_model=PaginatedResponse[User])
async def get_users(
    page: int = 1,
    size: int = 20,
    user_type: Optional[Literal["regular", "admin", "system"]] = None,
):
    """Get users with complex inheritance patterns"""
    users = []  # Mock data
    return PaginatedResponse(
        items=users,
        total=0,
        page=page,
        size=size,
        pages=0,
        has_next=False,
        has_prev=False,
    )


@app.get("/users/{user_id}", response_model=APIResponse[User])
async def get_user(user_id: UUID):
    """Get single user - demonstrates nullable vs optional"""
    # Mock user data
    user = RegularUser(
        id=user_id,
        email="user@example.com",
        created_at=datetime.utcnow(),
        profile=UserProfile(first_name="John", last_name="Doe"),
        preferences=UserPreferences(),
    )

    return APIResponse(success=True, data=user)


@app.get("/products", response_model=PaginatedResponse[Product])
async def get_products(
    page: int = 1,
    size: int = 20,
    status: Optional[ProductStatus] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
):
    """Get products with nullable/optional field handling"""
    products = []  # Mock data
    return PaginatedResponse(
        items=products,
        total=0,
        page=page,
        size=size,
        pages=0,
        has_next=False,
        has_prev=False,
    )


@app.post("/orders", response_model=APIResponse[Order])
async def create_order(order: Order):
    """Create order with nested discriminated unions"""
    return APIResponse(success=True, data=order, message="Order created successfully")


@app.get("/companies/{company_id}", response_model=APIResponse[Company])
async def get_company(company_id: UUID):
    """Get company with complex nested structures"""
    # Mock data
    company = Company(
        id=company_id,
        name="Example Corp",
        domain="example.com",
        headquarters=Address(
            street="123 Main St", city="New York", state="NY", zip_code="10001"
        ),
    )

    return APIResponse(success=True, data=company)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Simple health check"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
