# E-Commerce FastAPI Application

A comprehensive e-commerce API built with FastAPI for testing the `type-sync` package. This application demonstrates real-world scenarios with complex schemas, authentication, file uploads, and various data types.

## Features

### 🔐 Authentication & Authorization

- JWT-based authentication
- Role-based access control (Admin, Vendor, Customer, Moderator)
- Password hashing with bcrypt
- User registration and login

### 👥 User Management

- User CRUD operations
- User profiles with preferences
- Role management
- User status tracking

### 🛍️ Product Catalog

- Product CRUD operations
- Advanced search and filtering
- Product categories and tags
- Inventory management
- Product reviews and ratings
- Image uploads

### 📦 Order Management

- Order creation and tracking
- Order status management
- Payment processing simulation
- Shipping address management
- Order history

### 📁 File Management

- File upload functionality
- Image validation
- Static file serving

### 🏥 Health Monitoring

- Health check endpoints
- Database connectivity checks
- Readiness and liveness probes

## API Structure

```
/api
├── /auth          # Authentication endpoints
├── /users         # User management
├── /products      # Product catalog
├── /orders        # Order management
├── /health        # Health checks
└── /files         # File serving
```

## Database Models

- **User**: User accounts with profiles and preferences
- **Product**: Product catalog with inventory tracking
- **Order**: Order management with items
- **OrderItem**: Individual order items
- **ProductReview**: Product reviews and ratings

## Schema Types

### User Schemas

- `UserCreate`: User registration
- `UserUpdate`: User profile updates
- `UserResponse`: User data response
- `UserLogin`: Login credentials
- `UserProfile`: Profile information
- `UserPreferences`: User settings

### Product Schemas

- `ProductCreate`: Product creation
- `ProductUpdate`: Product updates
- `ProductResponse`: Product data response
- `ProductSearch`: Search parameters
- `ProductFilter`: Filtering options
- `ProductReview`: Review data

### Order Schemas

- `OrderCreate`: Order creation
- `OrderUpdate`: Order updates
- `OrderResponse`: Order data response
- `OrderItem`: Order item details
- `PaymentInfo`: Payment information
- `Address`: Shipping/billing addresses

### Common Schemas

- `ErrorResponse`: Standard error format
- `SuccessResponse`: Success responses
- `PaginatedResponse`: Paginated data
- `FileUpload`: File upload responses
- `HealthCheck`: Health status

## Getting Started

### Prerequisites

- Python 3.8+
- Virtual environment (recommended)

### Installation

1. **Clone and navigate to the directory:**

   ```bash
   cd local-test/fast-api-app
   ```

2. **Create and activate virtual environment:**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**

   ```bash
   python main.py
   ```

   Or with uvicorn directly:

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Environment Configuration

Create a `.env` file in the project root:

```env
# API Configuration
API_TITLE=E-Commerce API
API_DESCRIPTION=A comprehensive e-commerce API
API_VERSION=1.0.0
DEBUG=true

# Server Configuration
HOST=127.0.0.1
PORT=8000

# Database Configuration
DATABASE_URL=sqlite:///./test.db

# Security Configuration
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=["image/jpeg", "image/png", "image/gif"]
```

## API Documentation

Once the application is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### Exporting the Schema for Type-Sync

You can point Type-Sync directly at the running app URL, or export a local snapshot:

```bash
# From the repo root, generate directly from URL
node dist/cli/index.js generate --url http://localhost:8000/openapi.json -o local-test/react-app/src/generated --client --types

# Or export a snapshot JSON file first
curl -s http://localhost:8000/openapi.json -o local-test/react-app/openapi-schema.json
node dist/cli/index.js generate local-test/react-app/openapi-schema.json -o local-test/react-app/src/generated --client --types
```

## Testing with type-sync

This FastAPI application is designed to test the `type-sync` package's ability to:

1. **Parse complex OpenAPI schemas** with nested objects, unions, and enums
2. **Generate TypeScript types** for all request/response models
3. **Create API clients** with proper typing for all endpoints
4. **Handle authentication** with JWT tokens
5. **Support file uploads** and complex data structures
6. **Generate React hooks** for state management

### Key Testing Scenarios

- **Complex nested objects** with optional properties
- **Enum types** for status fields and categories
- **Union types** for flexible data structures
- **Array handling** with proper typing
- **Authentication flows** with protected routes
- **File upload endpoints** with validation
- **Pagination** with generic types
- **Error handling** with standardized responses

## Sample API Calls

### Register a user

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "profile": {
      "first_name": "John",
      "last_name": "Doe"
    }
  }'
```

### Login

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=SecurePass123"
```

### Create a product (requires admin token)

```bash
curl -X POST "http://localhost:8000/products" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "A test product",
    "category": "electronics",
    "price": 99.99,
    "sku": "TEST-001"
  }'
```

## Database

The application uses SQLite by default for simplicity. In production, you would typically use PostgreSQL or MySQL. The database schema is automatically created when the application starts.

## Development

### Project Structure

```
fast-api-app/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── core/                  # Core configuration
│   ├── __init__.py
│   └── config.py          # Application settings
├── db/                    # Database models and connection
│   ├── __init__.py
│   ├── database.py        # Database configuration
│   └── models.py          # SQLAlchemy models
├── schemas/               # Pydantic schemas
│   ├── __init__.py
│   ├── common.py          # Common schemas
│   ├── user.py            # User schemas
│   ├── product.py         # Product schemas
│   └── order.py           # Order schemas
├── services/              # Business logic
│   ├── __init__.py
│   ├── user_service.py    # User operations
│   ├── product_service.py # Product operations
│   ├── order_service.py   # Order operations
│   ├── auth_service.py    # Authentication
│   └── file_service.py    # File handling
└── api/                   # API routes
    ├── __init__.py
    ├── auth.py            # Authentication routes
    ├── users.py           # User routes
    ├── products.py        # Product routes
    ├── orders.py          # Order routes
    └── health.py          # Health check routes
```

### Adding New Features

1. **Add new models** in `db/models.py`
2. **Create schemas** in `schemas/`
3. **Implement business logic** in `services/`
4. **Define API routes** in `api/`
5. **Register routes** in `main.py`

This application provides a comprehensive testbed for the `type-sync` package with real-world complexity and various data types that will thoroughly test the package's capabilities.
