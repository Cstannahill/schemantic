# FastAPI Edge Cases Example

This example demonstrates complex FastAPI/Pydantic patterns that type-sync handles better than generic OpenAPI generators.

## Features Demonstrated

### 1. Discriminated Unions (oneOf/anyOf)

- ✅ **Notification types**: Email, SMS, Push, Webhook with proper type discrimination
- ✅ **User types**: Regular, Admin, System users with shared base + unique fields
- ✅ **Payment methods**: Credit card, bank transfer, digital wallet, crypto

### 2. Complex Inheritance (allOf)

- ✅ **BaseUser → RegularUser/AdminUser/SystemUser**: Proper inheritance patterns
- ✅ **Nested composition**: UserProfile + UserPreferences within user types

### 3. Nullable vs Optional Distinctions

- ✅ **Product model**: Demonstrates all combinations:
  - `name: str` - Required
  - `description: Optional[str]` - Optional (can be undefined)
  - `price: float | None` - Required but nullable
  - `sale_price: Optional[float | None]` - Optional AND nullable

### 4. Nested Discriminated Unions

- ✅ **Order → PaymentMethod → DigitalWallet**: Multi-level discriminated unions
- ✅ **Lists of unions**: `notifications: List[Notification]`

### 5. Generic Response Models

- ✅ **PaginatedResponse[T]**: Generic pagination wrapper
- ✅ **APIResponse[T]**: Generic API response with success/error handling

### 6. Enum Handling

- ✅ **String enums**: NotificationType, ProductStatus, etc.
- ✅ **Literal types**: Used in discriminated unions for type safety

## Running the Example

```bash
# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
# OR
uvicorn main:app --reload

# View the OpenAPI schema
curl http://localhost:8000/openapi.json

# Generate types with type-sync
npx type-sync generate --url http://localhost:8000/openapi.json --output ./generated
```

## Expected Generated Output

### Discriminated Unions

```typescript
// Perfect union type discrimination
export type APINotification =
  | APIEmailNotification
  | APISMSNotification
  | APIPushNotification
  | APIWebhookNotification;

export interface APIEmailNotification {
  type: "email";
  id: string;
  createdAt: string;
  message: string;
  emailAddress: string;
  subject: string;
  htmlContent?: string | null;
}

// TypeScript will properly narrow types
function handleNotification(notification: APINotification) {
  if (notification.type === "email") {
    // TypeScript knows this is APIEmailNotification
    console.log(notification.emailAddress, notification.subject);
  } else if (notification.type === "sms") {
    // TypeScript knows this is APISMSNotification
    console.log(notification.phoneNumber);
  }
}
```

### Nullable vs Optional

```typescript
export interface APIProduct {
  id: string;
  name: string; // Required
  description?: string; // Optional (can be undefined)
  price: number | null; // Required but nullable
  salePrice?: number | null; // Optional AND nullable
  status: APIProductStatus;
  imageUrl?: string | null; // Optional with default
  metadata: Record<string, any>; // Required with default
  tags: string[]; // Required array, can be empty
  createdAt: string;
  updatedAt?: string | null;
}
```

### Complex Inheritance

```typescript
export interface APIBaseUser {
  id: string;
  email: string;
  createdAt: string;
  isActive: boolean;
}

export interface APIRegularUser extends APIBaseUser {
  profile: APIUserProfile;
  preferences: APIUserPreferences;
  subscriptionTier: "free" | "premium";
}

export interface APIAdminUser extends APIBaseUser {
  profile: APIUserProfile;
  preferences: APIUserPreferences;
  permissions: string[];
  lastLogin?: string | null;
}
```

## Testing Edge Cases

The example includes endpoints that test these patterns:

- `GET /notifications` - Returns discriminated union in paginated response
- `POST /notifications` - Accepts discriminated union input
- `GET /users` - Returns users with complex inheritance
- `GET /products` - Returns products with nullable/optional fields
- `POST /orders` - Accepts nested discriminated unions

## Comparison with Other Generators

Most OpenAPI generators struggle with:

❌ **openapi-typescript**: Generates loose unions, doesn't properly handle discriminators  
❌ **swagger-typescript-api**: Creates `any` types for complex unions  
❌ **openapi-typescript-codegen**: Flattens inheritance, loses type safety

✅ **type-sync**: Generates perfect TypeScript that matches your FastAPI intent

## Real-World Usage

This pattern is based on actual production FastAPI applications. The edge cases demonstrated here cover 90% of complex schema patterns you'll encounter when building FastAPI backends with React/Next.js frontends.
