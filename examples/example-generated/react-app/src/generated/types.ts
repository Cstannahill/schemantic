/**
 * Address schema.
 * @example {"apartment":"Apt 4B","city":"New York","country":"US","postal_code":"10001","state":"NY","street":"123 Main Street"}
 */
export interface APIAddress {
  /**
 * Street address
 */
street: string;
  /**
 * City
 */
city: string;
  /**
 * State/Province
 */
state: string;
  /**
 * Postal code
 */
postalCode: string;
  /**
 * Country code (ISO 3166-1 alpha-2)
 */
country: string;
  /**
 * Apartment/suite number
 */
apartment?: string | null | undefined;
}

export interface APIBodyLoginAuthLoginPost {
  grantType?: string | null | undefined;
  username: string;
  password: string;
  scope?: string | undefined;
  clientId?: string | null | undefined;
  clientSecret?: string | null | undefined;
}

export interface APIHTTPValidationError {
  detail?: APIValidationError[] | undefined;
}

/**
 * Health check response schema.
 * @example {"database_status":"connected","environment":"development","status":"healthy","timestamp":"2023-12-01T10:00:00Z","version":"1.0.0"}
 */
export interface APIHealthCheck {
  /**
 * Service status
 */
status: string;
  /**
 * Check timestamp
 */
timestamp?: string | undefined;
  /**
 * Application version
 */
version: string;
  /**
 * Environment name
 */
environment: string;
  /**
 * Database connection status
 */
databaseStatus: string;
}

/**
 * Order creation schema.
 * @example {"items":[{"product_id":1,"product_name":"Wireless Bluetooth Headphones","product_sku":"WBH-001","quantity":1,"total_price":99.99,"unit_price":99.99}],"notes":"Please deliver during business hours","payment_method":"credit_card","shipping_address":{"city":"New York","country":"US","postal_code":"10001","state":"NY","street":"123 Main Street"},"shipping_method":"standard"}
 */
export interface APIOrderCreate {
  /**
 * Order items
 */
items: APIOrderItemInput[];
  shippingAddress: APIAddress;
  /**
 * Billing address (defaults to shipping)
 */
billingAddress?: APIAddress | null | undefined;
  shippingMethod?: APIShippingMethod | undefined;
  paymentMethod: APIPaymentMethod;
  /**
 * Order notes
 */
notes?: string | null | undefined;
  /**
 * Coupon code
 */
couponCode?: string | null | undefined;
}

/**
 * Order item schema.
 * @example {"product_id":1,"product_image":"https://example.com/image1.jpg","product_name":"Wireless Bluetooth Headphones","product_sku":"WBH-001","product_variant":{"color":"black","size":"large"},"quantity":2,"total_price":199.98,"unit_price":99.99}
 */
export interface APIOrderItemInput {
  /**
 * Product ID
 */
productId: number;
  /**
 * Product name
 */
productName: string;
  /**
 * Product SKU
 */
productSku: string;
  /**
 * Item quantity
 */
quantity: number;
  /**
 * Unit price
 */
unitPrice: number | string;
  /**
 * Total price for this item
 */
totalPrice: number | string;
  /**
 * Product image URL
 */
productImage?: string | null | undefined;
  /**
 * Product variant information
 */
productVariant?: Record<string, unknown> | null | undefined;
}

/**
 * Order item schema.
 * @example {"product_id":1,"product_image":"https://example.com/image1.jpg","product_name":"Wireless Bluetooth Headphones","product_sku":"WBH-001","product_variant":{"color":"black","size":"large"},"quantity":2,"total_price":199.98,"unit_price":99.99}
 */
export interface APIOrderItemOutput {
  /**
 * Product ID
 */
productId: number;
  /**
 * Product name
 */
productName: string;
  /**
 * Product SKU
 */
productSku: string;
  /**
 * Item quantity
 */
quantity: number;
  /**
 * Unit price
 */
unitPrice: string;
  /**
 * Total price for this item
 */
totalPrice: string;
  /**
 * Product image URL
 */
productImage?: string | null | undefined;
  /**
 * Product variant information
 */
productVariant?: Record<string, unknown> | null | undefined;
}

/**
 * Order response schema.
 * @example {"billing_address":{"city":"New York","country":"US","postal_code":"10001","state":"NY","street":"123 Main Street"},"created_at":"2023-12-01T10:00:00Z","currency":"USD","discount_amount":0,"estimated_delivery":"2023-12-05T18:00:00Z","id":1,"items":[{"product_id":1,"product_name":"Wireless Bluetooth Headphones","product_sku":"WBH-001","quantity":1,"total_price":99.99,"unit_price":99.99}],"notes":"Please deliver during business hours","order_number":"ORD-2023-001","payment_info":{"amount":117.98,"currency":"USD","method":"credit_card","status":"paid","transaction_id":"txn_123456789"},"shipped_at":"2023-12-02T10:00:00Z","shipping_address":{"city":"New York","country":"US","postal_code":"10001","state":"NY","street":"123 Main Street"},"shipping_cost":9.99,"shipping_method":"standard","status":"shipped","subtotal":99.99,"tax_amount":8,"total_amount":117.98,"tracking_number":"1Z999AA1234567890","updated_at":"2023-12-02T10:00:00Z","user_id":123}
 */
export interface APIOrderResponse {
  /**
 * Order ID
 */
id: number;
  /**
 * Order number
 */
orderNumber: string;
  /**
 * User ID
 */
userId: number;
  status: APIOrderStatus;
  /**
 * Order items
 */
items: APIOrderItemOutput[];
  /**
 * Order subtotal
 */
subtotal: string;
  /**
 * Tax amount
 */
taxAmount: string;
  /**
 * Shipping cost
 */
shippingCost: string;
  /**
 * Discount amount
 */
discountAmount?: string | undefined;
  /**
 * Total amount
 */
totalAmount: string;
  /**
 * Order currency
 */
currency?: string | undefined;
  shippingAddress: APIAddress;
  billingAddress: APIAddress;
  shippingMethod: APIShippingMethod;
  /**
 * Shipping tracking number
 */
trackingNumber?: string | null | undefined;
  paymentInfo: APIPaymentInfo;
  /**
 * Order notes
 */
notes?: string | null | undefined;
  /**
 * Internal order notes
 */
internalNotes?: string | null | undefined;
  /**
 * Applied coupon code
 */
couponCode?: string | null | undefined;
  /**
 * Estimated delivery date
 */
estimatedDelivery?: string | null | undefined;
  /**
 * Shipping timestamp
 */
shippedAt?: string | null | undefined;
  /**
 * Delivery timestamp
 */
deliveredAt?: string | null | undefined;
  /**
 * Order creation timestamp
 */
createdAt: string;
  /**
 * Last update timestamp
 */
updatedAt: string;
}

/**
 * Order status enumeration.
 */
export enum APIOrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded"
}
export type APIOrderStatusValues = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

/**
 * Order update schema.
 * @example {"notes":"Package delivered successfully","status":"shipped","tracking_number":"1Z999AA1234567890"}
 */
export interface APIOrderUpdate {
  /**
 * Order status
 */
status?: APIOrderStatus | null | undefined;
  /**
 * Shipping address
 */
shippingAddress?: APIAddress | null | undefined;
  /**
 * Billing address
 */
billingAddress?: APIAddress | null | undefined;
  /**
 * Shipping method
 */
shippingMethod?: APIShippingMethod | null | undefined;
  /**
 * Shipping tracking number
 */
trackingNumber?: string | null | undefined;
  /**
 * Order notes
 */
notes?: string | null | undefined;
  /**
 * Internal order notes
 */
internalNotes?: string | null | undefined;
}

/**
 * @example {"has_next":true,"has_prev":false,"items":[],"page":1,"pages":5,"size":20,"total":100}
 */
export interface APIPaginatedResponseOrderResponse {
  /**
 * List of items
 */
items: APIOrderResponse[];
  /**
 * Total number of items
 */
total: number;
  /**
 * Current page number
 */
page: number;
  /**
 * Page size
 */
size: number;
  /**
 * Total number of pages
 */
pages: number;
  /**
 * Whether there is a next page
 */
hasNext: boolean;
  /**
 * Whether there is a previous page
 */
hasPrev: boolean;
}

/**
 * @example {"has_next":true,"has_prev":false,"items":[],"page":1,"pages":5,"size":20,"total":100}
 */
export interface APIPaginatedResponseProductResponse {
  /**
 * List of items
 */
items: APIProductResponse[];
  /**
 * Total number of items
 */
total: number;
  /**
 * Current page number
 */
page: number;
  /**
 * Page size
 */
size: number;
  /**
 * Total number of pages
 */
pages: number;
  /**
 * Whether there is a next page
 */
hasNext: boolean;
  /**
 * Whether there is a previous page
 */
hasPrev: boolean;
}

/**
 * @example {"has_next":true,"has_prev":false,"items":[],"page":1,"pages":5,"size":20,"total":100}
 */
export interface APIPaginatedResponseUserResponse {
  /**
 * List of items
 */
items: APIUserResponse[];
  /**
 * Total number of items
 */
total: number;
  /**
 * Current page number
 */
page: number;
  /**
 * Page size
 */
size: number;
  /**
 * Total number of pages
 */
pages: number;
  /**
 * Whether there is a next page
 */
hasNext: boolean;
  /**
 * Whether there is a previous page
 */
hasPrev: boolean;
}

/**
 * Payment information schema.
 * @example {"amount":99.99,"currency":"USD","gateway_response":{"code":"0000","status":"success"},"method":"credit_card","processed_at":"2023-12-01T10:00:00Z","status":"paid","transaction_id":"txn_123456789"}
 */
export interface APIPaymentInfo {
  method: APIPaymentMethod;
  status?: APIPaymentStatus | undefined;
  /**
 * Payment transaction ID
 */
transactionId?: string | null | undefined;
  /**
 * Payment amount
 */
amount: string;
  /**
 * Payment currency
 */
currency?: string | undefined;
  /**
 * Payment processing timestamp
 */
processedAt?: string | null | undefined;
  /**
 * Payment gateway response
 */
gatewayResponse?: Record<string, unknown> | null | undefined;
}

/**
 * Payment method enumeration.
 */
export enum APIPaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  PAYPAL = "paypal",
  BANK_TRANSFER = "bank_transfer",
  CRYPTOCURRENCY = "cryptocurrency",
  CASH_ON_DELIVERY = "cash_on_delivery"
}
export type APIPaymentMethodValues = "credit_card" | "debit_card" | "paypal" | "bank_transfer" | "cryptocurrency" | "cash_on_delivery";

/**
 * Payment status enumeration.
 */
export enum APIPaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded"
}
export type APIPaymentStatusValues = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";

/**
 * Product category enumeration.
 */
export enum APIProductCategory {
  ELECTRONICS = "electronics",
  CLOTHING = "clothing",
  BOOKS = "books",
  HOME = "home",
  SPORTS = "sports",
  BEAUTY = "beauty",
  AUTOMOTIVE = "automotive",
  FOOD = "food"
}
export type APIProductCategoryValues = "electronics" | "clothing" | "books" | "home" | "sports" | "beauty" | "automotive" | "food";

/**
 * Product creation schema.
 * @example {"barcode":"1234567890123","category":"electronics","compare_price":149.99,"description":"High-quality wireless headphones with noise cancellation","dimensions":{"height":8,"length":20,"width":15},"images":["https://example.com/image1.jpg"],"inventory_quantity":100,"name":"Wireless Bluetooth Headphones","price":99.99,"requires_shipping":true,"seo_description":"Experience premium audio with our wireless Bluetooth headphones","seo_title":"Wireless Bluetooth Headphones - Premium Audio","sku":"WBH-001","tags":["wireless","bluetooth","audio","headphones"],"taxable":true,"track_inventory":true,"vendor_id":1,"weight":0.3}
 */
export interface APIProductCreate {
  /**
 * Product name
 */
name: string;
  /**
 * Product description
 */
description: string;
  category: APIProductCategory;
  /**
 * Product price
 */
price: number | string;
  /**
 * Compare at price
 */
comparePrice?: number | string | null | undefined;
  /**
 * Product SKU
 */
sku: string;
  /**
 * Product barcode
 */
barcode?: string | null | undefined;
  /**
 * Product weight in kg
 */
weight?: number | string | null | undefined;
  /**
 * Product dimensions
 */
dimensions?: Record<string, unknown> | null | undefined;
  /**
 * Product image URLs
 */
images?: string[] | undefined;
  /**
 * Product tags
 */
tags?: string[] | undefined;
  /**
 * Inventory quantity
 */
inventoryQuantity?: number | undefined;
  /**
 * Whether to track inventory
 */
trackInventory?: boolean | undefined;
  /**
 * Whether product requires shipping
 */
requiresShipping?: boolean | undefined;
  /**
 * Whether product is taxable
 */
taxable?: boolean | undefined;
  /**
 * SEO title
 */
seoTitle?: string | null | undefined;
  /**
 * SEO description
 */
seoDescription?: string | null | undefined;
  /**
 * Vendor ID
 */
vendorId?: number | null | undefined;
}

/**
 * Product response schema.
 * @example {"average_rating":4.5,"barcode":"1234567890123","category":"electronics","compare_price":149.99,"created_at":"2023-12-01T10:00:00Z","description":"High-quality wireless headphones with noise cancellation","dimensions":{"height":8,"length":20,"width":15},"featured":true,"id":1,"images":["https://example.com/image1.jpg"],"inventory_quantity":100,"name":"Wireless Bluetooth Headphones","price":99.99,"requires_shipping":true,"review_count":25,"seo_description":"Experience premium audio with our wireless Bluetooth headphones","seo_title":"Wireless Bluetooth Headphones - Premium Audio","sku":"WBH-001","status":"active","tags":["wireless","bluetooth","audio","headphones"],"taxable":true,"track_inventory":true,"updated_at":"2023-12-01T10:00:00Z","vendor_id":1,"weight":0.3}
 */
export interface APIProductResponse {
  /**
 * Product ID
 */
id: number;
  /**
 * Product name
 */
name: string;
  /**
 * Product description
 */
description: string;
  category: APIProductCategory;
  /**
 * Product price
 */
price: string;
  /**
 * Compare at price
 */
comparePrice?: string | null | undefined;
  status: APIProductStatus;
  /**
 * Product SKU
 */
sku: string;
  /**
 * Product barcode
 */
barcode?: string | null | undefined;
  /**
 * Product weight in kg
 */
weight?: string | null | undefined;
  /**
 * Product dimensions
 */
dimensions?: Record<string, unknown> | null | undefined;
  /**
 * Product image URLs
 */
images: string[];
  /**
 * Product tags
 */
tags: string[];
  /**
 * Inventory quantity
 */
inventoryQuantity: number;
  /**
 * Whether to track inventory
 */
trackInventory: boolean;
  /**
 * Whether product requires shipping
 */
requiresShipping: boolean;
  /**
 * Whether product is taxable
 */
taxable: boolean;
  /**
 * SEO title
 */
seoTitle?: string | null | undefined;
  /**
 * SEO description
 */
seoDescription?: string | null | undefined;
  /**
 * Whether product is featured
 */
featured?: boolean | undefined;
  /**
 * Average rating
 */
averageRating?: string | null | undefined;
  /**
 * Number of reviews
 */
reviewCount?: number | undefined;
  /**
 * Vendor ID
 */
vendorId?: number | null | undefined;
  /**
 * Product creation timestamp
 */
createdAt: string;
  /**
 * Last update timestamp
 */
updatedAt: string;
}

/**
 * Product status enumeration.
 */
export enum APIProductStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  INACTIVE = "inactive",
  DISCONTINUED = "discontinued"
}
export type APIProductStatusValues = "draft" | "active" | "inactive" | "discontinued";

/**
 * Product update schema.
 * @example {"featured":true,"name":"Updated Wireless Bluetooth Headphones","price":89.99,"status":"active"}
 */
export interface APIProductUpdate {
  /**
 * Product name
 */
name?: string | null | undefined;
  /**
 * Product description
 */
description?: string | null | undefined;
  /**
 * Product category
 */
category?: APIProductCategory | null | undefined;
  /**
 * Product price
 */
price?: number | string | null | undefined;
  /**
 * Compare at price
 */
comparePrice?: number | string | null | undefined;
  /**
 * Product status
 */
status?: APIProductStatus | null | undefined;
  /**
 * Product SKU
 */
sku?: string | null | undefined;
  /**
 * Product barcode
 */
barcode?: string | null | undefined;
  /**
 * Product weight in kg
 */
weight?: number | string | null | undefined;
  /**
 * Product dimensions
 */
dimensions?: Record<string, unknown> | null | undefined;
  /**
 * Product image URLs
 */
images?: string[] | null | undefined;
  /**
 * Product tags
 */
tags?: string[] | null | undefined;
  /**
 * Inventory quantity
 */
inventoryQuantity?: number | null | undefined;
  /**
 * Whether to track inventory
 */
trackInventory?: boolean | null | undefined;
  /**
 * Whether product requires shipping
 */
requiresShipping?: boolean | null | undefined;
  /**
 * Whether product is taxable
 */
taxable?: boolean | null | undefined;
  /**
 * SEO title
 */
seoTitle?: string | null | undefined;
  /**
 * SEO description
 */
seoDescription?: string | null | undefined;
  /**
 * Whether product is featured
 */
featured?: boolean | null | undefined;
}

/**
 * Shipping method enumeration.
 */
export enum APIShippingMethod {
  STANDARD = "standard",
  EXPRESS = "express",
  OVERNIGHT = "overnight",
  PICKUP = "pickup",
  DIGITAL = "digital"
}
export type APIShippingMethodValues = "standard" | "express" | "overnight" | "pickup" | "digital";

/**
 * Standard success response schema.
 * @example {"data":{"id":1,"name":"Example"},"message":"Operation completed successfully","timestamp":"2023-12-01T10:00:00Z"}
 */
export interface APISuccessResponse {
  /**
 * Success message
 */
message: string;
  /**
 * Response data
 */
data?: unknown | null | undefined;
  /**
 * Response timestamp
 */
timestamp?: string | undefined;
}

/**
 * User creation schema.
 * @example {"email":"john.doe@example.com","password":"SecurePass123","preferences":{"currency":"USD","language":"en","newsletter":true},"profile":{"bio":"Software developer","first_name":"John","last_name":"Doe","phone":"+1234567890"},"role":"customer"}
 */
export interface APIUserCreate {
  /**
 * User email address
 */
email: string;
  /**
 * User password
 */
password: string;
  role?: APIUserRole | undefined;
  profile: APIUserProfile;
  preferences?: APIUserPreferences | undefined;
}

/**
 * User preferences schema.
 * @example {"currency":"USD","language":"en","newsletter":true,"notifications":true,"theme":"dark","timezone":"America/New_York"}
 */
export interface APIUserPreferences {
  /**
 * Newsletter subscription
 */
newsletter?: boolean | undefined;
  /**
 * Push notifications
 */
notifications?: boolean | undefined;
  /**
 * Preferred language
 */
language?: string | undefined;
  /**
 * User timezone
 */
timezone?: string | undefined;
  /**
 * Preferred currency
 */
currency?: string | undefined;
  /**
 * UI theme preference
 */
theme?: string | undefined;
}

/**
 * User profile information schema.
 * @example {"avatar_url":"https://example.com/avatar.jpg","bio":"Software developer and tech enthusiast","date_of_birth":"1990-01-01T00:00:00Z","first_name":"John","last_name":"Doe","phone":"+1234567890"}
 */
export interface APIUserProfile {
  /**
 * First name
 */
firstName: string;
  /**
 * Last name
 */
lastName: string;
  /**
 * Phone number
 */
phone?: string | null | undefined;
  /**
 * Date of birth
 */
dateOfBirth?: string | null | undefined;
  /**
 * User biography
 */
bio?: string | null | undefined;
  /**
 * Avatar image URL
 */
avatarUrl?: string | null | undefined;
}

/**
 * User response schema.
 * @example {"created_at":"2023-12-01T10:00:00Z","email":"john.doe@example.com","id":1,"last_login":"2023-12-01T09:30:00Z","preferences":{"currency":"USD","language":"en","newsletter":true},"profile":{"bio":"Software developer","first_name":"John","last_name":"Doe","phone":"+1234567890"},"role":"customer","status":"active","updated_at":"2023-12-01T10:00:00Z"}
 */
export interface APIUserResponse {
  /**
 * User ID
 */
id: number;
  /**
 * User email address
 */
email: string;
  role: APIUserRole;
  status: APIUserStatus;
  profile: APIUserProfile;
  preferences: APIUserPreferences;
  /**
 * User creation timestamp
 */
createdAt: string;
  /**
 * Last update timestamp
 */
updatedAt: string;
  /**
 * Last login timestamp
 */
lastLogin?: string | null | undefined;
}

/**
 * User role enumeration.
 */
export enum APIUserRole {
  CUSTOMER = "customer",
  ADMIN = "admin",
  MODERATOR = "moderator",
  VENDOR = "vendor"
}
export type APIUserRoleValues = "customer" | "admin" | "moderator" | "vendor";

/**
 * User status enumeration.
 */
export enum APIUserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending"
}
export type APIUserStatusValues = "active" | "inactive" | "suspended" | "pending";

/**
 * User update schema.
 * @example {"email":"newemail@example.com","profile":{"first_name":"Jane","last_name":"Smith"},"status":"active"}
 */
export interface APIUserUpdate {
  /**
 * User email address
 */
email?: string | null | undefined;
  /**
 * User role
 */
role?: APIUserRole | null | undefined;
  /**
 * User status
 */
status?: APIUserStatus | null | undefined;
  /**
 * User profile information
 */
profile?: APIUserProfile | null | undefined;
  /**
 * User preferences
 */
preferences?: APIUserPreferences | null | undefined;
}

export interface APIValidationError {
  loc: string | number[];
  msg: string;
  type: string;
}