import { z } from 'zod';

export enum UserRole {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER"
}
export type UserRoleValues = "ADMIN" | "EDITOR" | "VIEWER";


/**
 * Zod validation schema for UserRole
 */
export const UserRoleSchema: z.ZodType = z.intersection(z.union([z.literal("ADMIN"), z.literal("EDITOR"), z.literal("VIEWER")]), z.string());

/**
 * Validate UserRole data with detailed error reporting
 */
export function validateUserRole(data: unknown): { success: true; data: UserRole } | { success: false; errors: string[] } {
  const result = UserRoleSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    console.warn('Response validation failed:', issues);
    // Return a structured failure result so consumers can handle errors without requiring a runtime ValidationError class
    return {
      success: false,
      errors: issues.length > 0
        ? issues.map((iss: z.core.$ZodIssue) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
        : []
    };
  }

  return { success: true, data: result.data as UserRole };
}

/**
 * Parse UserRole data with exception on validation failure
 */
export function parseUserRole(data: unknown): UserRole {
  return UserRoleSchema.parse(data) as UserRole;
}

/**
 * Branded type for UserRole with compile-time guarantees
 */
export type BrandedUserRole = UserRole & { __brand: 'UserRole' };

/**
 * Create a branded UserRole instance
 */
export function createBrandedUserRole(data: UserRole): BrandedUserRole {
  return data as BrandedUserRole;
}
/**
 * Runtime type guard for UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  return UserRoleSchema.safeParse(value).success;
}

export interface UserProfile {
  bio?: string | null | undefined;
  social?: string[] | undefined;
}



/**
 * Zod validation schema for UserProfile
 */
export const UserProfileSchema: z.ZodType = z.object({
  bio: z.string().nullable().optional(),
  social: z.array(z.string()).optional()
}).strict();

/**
 * Validate UserProfile data with detailed error reporting
 */
export function validateUserProfile(data: unknown): { success: true; data: UserProfile } | { success: false; errors: string[] } {
  const result = UserProfileSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    console.warn('Response validation failed:', issues);
    // Return a structured failure result so consumers can handle errors without requiring a runtime ValidationError class
    return {
      success: false,
      errors: issues.length > 0
        ? issues.map((iss: z.core.$ZodIssue) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
        : []
    };
  }

  return { success: true, data: result.data as UserProfile };
}

/**
 * Parse UserProfile data with exception on validation failure
 */
export function parseUserProfile(data: unknown): UserProfile {
  return UserProfileSchema.parse(data) as UserProfile;
}

/**
 * Branded type for UserProfile with compile-time guarantees
 */
export type BrandedUserProfile = UserProfile & { __brand: 'UserProfile' };

/**
 * Create a branded UserProfile instance
 */
export function createBrandedUserProfile(data: UserProfile): BrandedUserProfile {
  return data as BrandedUserProfile;
}
/**
 * Runtime type guard for UserProfile
 */
export function isUserProfile(value: unknown): value is UserProfile {
  return UserProfileSchema.safeParse(value).success;
}

export interface UserResponse {
  id: number;
  name: string;
  role: UserRole;
  profile?: UserProfile | undefined;
}



/**
 * Zod validation schema for UserResponse
 */
export const UserResponseSchema: z.ZodType = z.object({
  id: z.number().int(),
  name: z.string(),
  role: z.lazy(() => UserRoleSchema),
  profile: z.lazy(() => UserProfileSchema).optional()
}).strict();

/**
 * Validate UserResponse data with detailed error reporting
 */
export function validateUserResponse(data: unknown): { success: true; data: UserResponse } | { success: false; errors: string[] } {
  const result = UserResponseSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    console.warn('Response validation failed:', issues);
    // Return a structured failure result so consumers can handle errors without requiring a runtime ValidationError class
    return {
      success: false,
      errors: issues.length > 0
        ? issues.map((iss: z.core.$ZodIssue) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
        : []
    };
  }

  return { success: true, data: result.data as UserResponse };
}

/**
 * Parse UserResponse data with exception on validation failure
 */
export function parseUserResponse(data: unknown): UserResponse {
  return UserResponseSchema.parse(data) as UserResponse;
}

/**
 * Branded type for UserResponse with compile-time guarantees
 */
export type BrandedUserResponse = UserResponse & { __brand: 'UserResponse' };

/**
 * Create a branded UserResponse instance
 */
export function createBrandedUserResponse(data: UserResponse): BrandedUserResponse {
  return data as BrandedUserResponse;
}
/**
 * Runtime type guard for UserResponse
 */
export function isUserResponse(value: unknown): value is UserResponse {
  return UserResponseSchema.safeParse(value).success;
}

export interface Book {
  type: "book";
  title: string;
  author: string;
}



/**
 * Zod validation schema for Book
 */
export const BookSchema: z.ZodType = z.object({
  type: z.intersection(z.literal("book"), z.string()),
  title: z.string(),
  author: z.string()
}).strict();

/**
 * Validate Book data with detailed error reporting
 */
export function validateBook(data: unknown): { success: true; data: Book } | { success: false; errors: string[] } {
  const result = BookSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    console.warn('Response validation failed:', issues);
    // Return a structured failure result so consumers can handle errors without requiring a runtime ValidationError class
    return {
      success: false,
      errors: issues.length > 0
        ? issues.map((iss: z.core.$ZodIssue) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
        : []
    };
  }

  return { success: true, data: result.data as Book };
}

/**
 * Parse Book data with exception on validation failure
 */
export function parseBook(data: unknown): Book {
  return BookSchema.parse(data) as Book;
}

/**
 * Branded type for Book with compile-time guarantees
 */
export type BrandedBook = Book & { __brand: 'Book' };

/**
 * Create a branded Book instance
 */
export function createBrandedBook(data: Book): BrandedBook {
  return data as BrandedBook;
}
/**
 * Runtime type guard for Book
 */
export function isBook(value: unknown): value is Book {
  return BookSchema.safeParse(value).success;
}

export interface Movie {
  type: "movie";
  title: string;
  director: string;
}



/**
 * Zod validation schema for Movie
 */
export const MovieSchema: z.ZodType = z.object({
  type: z.intersection(z.literal("movie"), z.string()),
  title: z.string(),
  director: z.string()
}).strict();

/**
 * Validate Movie data with detailed error reporting
 */
export function validateMovie(data: unknown): { success: true; data: Movie } | { success: false; errors: string[] } {
  const result = MovieSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    console.warn('Response validation failed:', issues);
    // Return a structured failure result so consumers can handle errors without requiring a runtime ValidationError class
    return {
      success: false,
      errors: issues.length > 0
        ? issues.map((iss: z.core.$ZodIssue) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
        : []
    };
  }

  return { success: true, data: result.data as Movie };
}

/**
 * Parse Movie data with exception on validation failure
 */
export function parseMovie(data: unknown): Movie {
  return MovieSchema.parse(data) as Movie;
}

/**
 * Branded type for Movie with compile-time guarantees
 */
export type BrandedMovie = Movie & { __brand: 'Movie' };

/**
 * Create a branded Movie instance
 */
export function createBrandedMovie(data: Movie): BrandedMovie {
  return data as BrandedMovie;
}
/**
 * Runtime type guard for Movie
 */
export function isMovie(value: unknown): value is Movie {
  return MovieSchema.safeParse(value).success;
}

export type CreateItemRequest = Book | Movie;



/**
 * Zod validation schema for CreateItemRequest
 */
export const CreateItemRequestSchema: z.ZodType = z.intersection(z.union([z.lazy(() => BookSchema), z.lazy(() => MovieSchema)]).refine((value: unknown) => [z.lazy(() => BookSchema), z.lazy(() => MovieSchema)].filter(variant => variant.safeParse(value).success).length === 1, { message: "Expected exactly one matching schema" }), z.unknown());

/**
 * Validate CreateItemRequest data with detailed error reporting
 */
export function validateCreateItemRequest(data: unknown): { success: true; data: CreateItemRequest } | { success: false; errors: string[] } {
  const result = CreateItemRequestSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    console.warn('Response validation failed:', issues);
    // Return a structured failure result so consumers can handle errors without requiring a runtime ValidationError class
    return {
      success: false,
      errors: issues.length > 0
        ? issues.map((iss: z.core.$ZodIssue) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
        : []
    };
  }

  return { success: true, data: result.data as CreateItemRequest };
}

/**
 * Parse CreateItemRequest data with exception on validation failure
 */
export function parseCreateItemRequest(data: unknown): CreateItemRequest {
  return CreateItemRequestSchema.parse(data) as CreateItemRequest;
}

/**
 * Branded type for CreateItemRequest with compile-time guarantees
 */
export type BrandedCreateItemRequest = CreateItemRequest & { __brand: 'CreateItemRequest' };

/**
 * Create a branded CreateItemRequest instance
 */
export function createBrandedCreateItemRequest(data: CreateItemRequest): BrandedCreateItemRequest {
  return data as BrandedCreateItemRequest;
}
/**
 * Runtime type guard for CreateItemRequest
 */
export function isCreateItemRequest(value: unknown): value is CreateItemRequest {
  return CreateItemRequestSchema.safeParse(value).success;
}

export interface Item {
  id: number;
  data: CreateItemRequest;
}



/**
 * Zod validation schema for Item
 */
export const ItemSchema: z.ZodType = z.object({
  id: z.number().int(),
  data: z.lazy(() => CreateItemRequestSchema)
}).strict();

/**
 * Validate Item data with detailed error reporting
 */
export function validateItem(data: unknown): { success: true; data: Item } | { success: false; errors: string[] } {
  const result = ItemSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    console.warn('Response validation failed:', issues);
    // Return a structured failure result so consumers can handle errors without requiring a runtime ValidationError class
    return {
      success: false,
      errors: issues.length > 0
        ? issues.map((iss: z.core.$ZodIssue) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
        : []
    };
  }

  return { success: true, data: result.data as Item };
}

/**
 * Parse Item data with exception on validation failure
 */
export function parseItem(data: unknown): Item {
  return ItemSchema.parse(data) as Item;
}

/**
 * Branded type for Item with compile-time guarantees
 */
export type BrandedItem = Item & { __brand: 'Item' };

/**
 * Create a branded Item instance
 */
export function createBrandedItem(data: Item): BrandedItem {
  return data as BrandedItem;
}
/**
 * Runtime type guard for Item
 */
export function isItem(value: unknown): value is Item {
  return ItemSchema.safeParse(value).success;
}