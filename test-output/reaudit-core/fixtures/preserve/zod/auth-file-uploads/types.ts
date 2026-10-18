import { z } from 'zod';

export interface LoginRequest {
  username: string;
  password: string;
}



/**
 * Zod validation schema for LoginRequest
 */
export const LoginRequestSchema: z.ZodType = z.object({
  username: z.string(),
  password: z.string()
}).strict();

/**
 * Validate LoginRequest data with detailed error reporting
 */
export function validateLoginRequest(data: unknown): { success: true; data: LoginRequest } | { success: false; errors: string[] } {
  const result = LoginRequestSchema.safeParse(data);

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

  return { success: true, data: result.data as LoginRequest };
}

/**
 * Parse LoginRequest data with exception on validation failure
 */
export function parseLoginRequest(data: unknown): LoginRequest {
  return LoginRequestSchema.parse(data) as LoginRequest;
}

/**
 * Branded type for LoginRequest with compile-time guarantees
 */
export type BrandedLoginRequest = LoginRequest & { __brand: 'LoginRequest' };

/**
 * Create a branded LoginRequest instance
 */
export function createBrandedLoginRequest(data: LoginRequest): BrandedLoginRequest {
  return data as BrandedLoginRequest;
}
/**
 * Runtime type guard for LoginRequest
 */
export function isLoginRequest(value: unknown): value is LoginRequest {
  return LoginRequestSchema.safeParse(value).success;
}

export interface LoginResponse {
  token: string;
}



/**
 * Zod validation schema for LoginResponse
 */
export const LoginResponseSchema: z.ZodType = z.object({
  token: z.string()
}).strict();

/**
 * Validate LoginResponse data with detailed error reporting
 */
export function validateLoginResponse(data: unknown): { success: true; data: LoginResponse } | { success: false; errors: string[] } {
  const result = LoginResponseSchema.safeParse(data);

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

  return { success: true, data: result.data as LoginResponse };
}

/**
 * Parse LoginResponse data with exception on validation failure
 */
export function parseLoginResponse(data: unknown): LoginResponse {
  return LoginResponseSchema.parse(data) as LoginResponse;
}

/**
 * Branded type for LoginResponse with compile-time guarantees
 */
export type BrandedLoginResponse = LoginResponse & { __brand: 'LoginResponse' };

/**
 * Create a branded LoginResponse instance
 */
export function createBrandedLoginResponse(data: LoginResponse): BrandedLoginResponse {
  return data as BrandedLoginResponse;
}
/**
 * Runtime type guard for LoginResponse
 */
export function isLoginResponse(value: unknown): value is LoginResponse {
  return LoginResponseSchema.safeParse(value).success;
}

export interface FileUploadResponse {
  file_id: string;
  url: string;
}



/**
 * Zod validation schema for FileUploadResponse
 */
export const FileUploadResponseSchema: z.ZodType = z.object({
  file_id: z.string(),
  url: z.string()
}).strict();

/**
 * Validate FileUploadResponse data with detailed error reporting
 */
export function validateFileUploadResponse(data: unknown): { success: true; data: FileUploadResponse } | { success: false; errors: string[] } {
  const result = FileUploadResponseSchema.safeParse(data);

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

  return { success: true, data: result.data as FileUploadResponse };
}

/**
 * Parse FileUploadResponse data with exception on validation failure
 */
export function parseFileUploadResponse(data: unknown): FileUploadResponse {
  return FileUploadResponseSchema.parse(data) as FileUploadResponse;
}

/**
 * Branded type for FileUploadResponse with compile-time guarantees
 */
export type BrandedFileUploadResponse = FileUploadResponse & { __brand: 'FileUploadResponse' };

/**
 * Create a branded FileUploadResponse instance
 */
export function createBrandedFileUploadResponse(data: FileUploadResponse): BrandedFileUploadResponse {
  return data as BrandedFileUploadResponse;
}
/**
 * Runtime type guard for FileUploadResponse
 */
export function isFileUploadResponse(value: unknown): value is FileUploadResponse {
  return FileUploadResponseSchema.safeParse(value).success;
}