import { z } from 'zod';

/**
 * Supported image formats with their canonical extensions.
 */
export enum ImageFormat {
  PNG = "png",
  JPEG = "jpeg",
  JPG = "jpg",
  WEBP = "webp",
  AVIF = "avif",
  TIFF = "tiff",
  TIF = "tif",
  ICO = "ico",
  HEIC = "heic",
  HEIF = "heif",
  BMP = "bmp",
  SVG = "svg"
}
export type ImageFormatValues = "png" | "jpeg" | "jpg" | "webp" | "avif" | "tiff" | "tif" | "ico" | "heic" | "heif" | "bmp" | "svg";


/**
 * Zod validation schema for ImageFormat
 */
export const ImageFormatSchema = z.enum(["png", "jpeg", "jpg", "webp", "avif", "tiff", "tif", "ico", "heic", "heif", "bmp", "svg"]);

/**
 * Validate ImageFormat data with detailed error reporting
 */
export function validateImageFormat(data: unknown): { success: true; data: ImageFormat } | { success: false; errors: string[] } {
  const result = ImageFormatSchema.safeParse(data);

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

  return { success: true, data: result.data as ImageFormat };
}

/**
 * Parse ImageFormat data with exception on validation failure
 */
export function parseImageFormat(data: unknown): ImageFormat {
  return ImageFormatSchema.parse(data) as ImageFormat;
}

/**
 * Branded type for ImageFormat with compile-time guarantees
 */
export type BrandedImageFormat = ImageFormat & { __brand: 'ImageFormat' };

/**
 * Create a branded ImageFormat instance
 */
export function createBrandedImageFormat(data: ImageFormat): BrandedImageFormat {
  return data as BrandedImageFormat;
}
/**
 * Runtime type guard for ImageFormat
 */
export function isImageFormat(value: unknown): value is ImageFormat {
  return ImageFormatSchema.safeParse(value).success;
}

export interface BodyBatchConvertImagesConvertBatchPost {
  /**
 * Image files to convert
 */
files: string[];
  targetFormat: ImageFormat;
  /**
 * Quality (1-100) for lossy formats
 */
quality?: number | null | undefined;
  /**
 * Preserve original filenames
 */
preserveNames?: boolean | undefined;
}



/**
 * Zod validation schema for BodyBatchConvertImagesConvertBatchPost
 */
export const BodyBatchConvertImagesConvertBatchPostSchema = z.object({
  files: z.array(z.string()),
  target_format: ImageFormatSchema,
  quality: z.unknown().optional(),
  preserve_names: z.boolean().optional()
}).strict().transform((val: Record<string, unknown>) => ({
  targetFormat: val["target_format"],
  preserveNames: val["preserve_names"]
}));

/**
 * Validate BodyBatchConvertImagesConvertBatchPost data with detailed error reporting
 */
export function validateBodyBatchConvertImagesConvertBatchPost(data: unknown): { success: true; data: BodyBatchConvertImagesConvertBatchPost } | { success: false; errors: string[] } {
  const result = BodyBatchConvertImagesConvertBatchPostSchema.safeParse(data);

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

  return { success: true, data: result.data as BodyBatchConvertImagesConvertBatchPost };
}

/**
 * Parse BodyBatchConvertImagesConvertBatchPost data with exception on validation failure
 */
export function parseBodyBatchConvertImagesConvertBatchPost(data: unknown): BodyBatchConvertImagesConvertBatchPost {
  return BodyBatchConvertImagesConvertBatchPostSchema.parse(data) as BodyBatchConvertImagesConvertBatchPost;
}

/**
 * Branded type for BodyBatchConvertImagesConvertBatchPost with compile-time guarantees
 */
export type BrandedBodyBatchConvertImagesConvertBatchPost = BodyBatchConvertImagesConvertBatchPost & { __brand: 'BodyBatchConvertImagesConvertBatchPost' };

/**
 * Create a branded BodyBatchConvertImagesConvertBatchPost instance
 */
export function createBrandedBodyBatchConvertImagesConvertBatchPost(data: BodyBatchConvertImagesConvertBatchPost): BrandedBodyBatchConvertImagesConvertBatchPost {
  return data as BrandedBodyBatchConvertImagesConvertBatchPost;
}
/**
 * Runtime type guard for BodyBatchConvertImagesConvertBatchPost
 */
export function isBodyBatchConvertImagesConvertBatchPost(value: unknown): value is BodyBatchConvertImagesConvertBatchPost {
  return BodyBatchConvertImagesConvertBatchPostSchema.safeParse(value).success;
}

export interface BodyConvertImageConvertPost {
  /**
 * Image file to convert
 */
file: string;
  targetFormat: ImageFormat;
  /**
 * Quality (1-100) for lossy formats
 */
quality?: number | null | undefined;
  /**
 * Target width in pixels
 */
width?: number | null | undefined;
  /**
 * Target height in pixels
 */
height?: number | null | undefined;
  /**
 * DPI for SVG-to-raster conversion
 */
dpi?: number | null | undefined;
  /**
 * Scale factor for SVG-to-raster
 */
scale?: number | null | undefined;
}



/**
 * Zod validation schema for BodyConvertImageConvertPost
 */
export const BodyConvertImageConvertPostSchema = z.object({
  file: z.string(),
  target_format: ImageFormatSchema,
  quality: z.unknown().optional(),
  width: z.unknown().optional(),
  height: z.unknown().optional(),
  dpi: z.unknown().optional(),
  scale: z.unknown().optional()
}).strict().transform((val: Record<string, unknown>) => ({
  targetFormat: val["target_format"]
}));

/**
 * Validate BodyConvertImageConvertPost data with detailed error reporting
 */
export function validateBodyConvertImageConvertPost(data: unknown): { success: true; data: BodyConvertImageConvertPost } | { success: false; errors: string[] } {
  const result = BodyConvertImageConvertPostSchema.safeParse(data);

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

  return { success: true, data: result.data as BodyConvertImageConvertPost };
}

/**
 * Parse BodyConvertImageConvertPost data with exception on validation failure
 */
export function parseBodyConvertImageConvertPost(data: unknown): BodyConvertImageConvertPost {
  return BodyConvertImageConvertPostSchema.parse(data) as BodyConvertImageConvertPost;
}

/**
 * Branded type for BodyConvertImageConvertPost with compile-time guarantees
 */
export type BrandedBodyConvertImageConvertPost = BodyConvertImageConvertPost & { __brand: 'BodyConvertImageConvertPost' };

/**
 * Create a branded BodyConvertImageConvertPost instance
 */
export function createBrandedBodyConvertImageConvertPost(data: BodyConvertImageConvertPost): BrandedBodyConvertImageConvertPost {
  return data as BrandedBodyConvertImageConvertPost;
}
/**
 * Runtime type guard for BodyConvertImageConvertPost
 */
export function isBodyConvertImageConvertPost(value: unknown): value is BodyConvertImageConvertPost {
  return BodyConvertImageConvertPostSchema.safeParse(value).success;
}

export interface ValidationError {
  loc: string | number[];
  msg: string;
  type: string;
}



/**
 * Zod validation schema for ValidationError
 */
export const ValidationErrorSchema = z.object({
  loc: z.array(z.unknown()),
  msg: z.string(),
  type: z.string()
}).strict();

/**
 * Validate ValidationError data with detailed error reporting
 */
export function validateValidationError(data: unknown): { success: true; data: ValidationError } | { success: false; errors: string[] } {
  const result = ValidationErrorSchema.safeParse(data);

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

  return { success: true, data: result.data as ValidationError };
}

/**
 * Parse ValidationError data with exception on validation failure
 */
export function parseValidationError(data: unknown): ValidationError {
  return ValidationErrorSchema.parse(data) as ValidationError;
}

/**
 * Branded type for ValidationError with compile-time guarantees
 */
export type BrandedValidationError = ValidationError & { __brand: 'ValidationError' };

/**
 * Create a branded ValidationError instance
 */
export function createBrandedValidationError(data: ValidationError): BrandedValidationError {
  return data as BrandedValidationError;
}
/**
 * Runtime type guard for ValidationError
 */
export function isValidationError(value: unknown): value is ValidationError {
  return ValidationErrorSchema.safeParse(value).success;
}

export interface HTTPValidationError {
  detail?: ValidationError[] | undefined;
}



/**
 * Zod validation schema for HTTPValidationError
 */
export const HTTPValidationErrorSchema = z.object({
  detail: z.array(ValidationErrorSchema).optional()
}).strict();

/**
 * Validate HTTPValidationError data with detailed error reporting
 */
export function validateHTTPValidationError(data: unknown): { success: true; data: HTTPValidationError } | { success: false; errors: string[] } {
  const result = HTTPValidationErrorSchema.safeParse(data);

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

  return { success: true, data: result.data as HTTPValidationError };
}

/**
 * Parse HTTPValidationError data with exception on validation failure
 */
export function parseHTTPValidationError(data: unknown): HTTPValidationError {
  return HTTPValidationErrorSchema.parse(data) as HTTPValidationError;
}

/**
 * Branded type for HTTPValidationError with compile-time guarantees
 */
export type BrandedHTTPValidationError = HTTPValidationError & { __brand: 'HTTPValidationError' };

/**
 * Create a branded HTTPValidationError instance
 */
export function createBrandedHTTPValidationError(data: HTTPValidationError): BrandedHTTPValidationError {
  return data as BrandedHTTPValidationError;
}
/**
 * Runtime type guard for HTTPValidationError
 */
export function isHTTPValidationError(value: unknown): value is HTTPValidationError {
  return HTTPValidationErrorSchema.safeParse(value).success;
}

/**
 * Health check response schema.
 */
export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
}



/**
 * Zod validation schema for HealthResponse
 */
export const HealthResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
  environment: z.string()
}).strict();

/**
 * Validate HealthResponse data with detailed error reporting
 */
export function validateHealthResponse(data: unknown): { success: true; data: HealthResponse } | { success: false; errors: string[] } {
  const result = HealthResponseSchema.safeParse(data);

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

  return { success: true, data: result.data as HealthResponse };
}

/**
 * Parse HealthResponse data with exception on validation failure
 */
export function parseHealthResponse(data: unknown): HealthResponse {
  return HealthResponseSchema.parse(data) as HealthResponse;
}

/**
 * Branded type for HealthResponse with compile-time guarantees
 */
export type BrandedHealthResponse = HealthResponse & { __brand: 'HealthResponse' };

/**
 * Create a branded HealthResponse instance
 */
export function createBrandedHealthResponse(data: HealthResponse): BrandedHealthResponse {
  return data as BrandedHealthResponse;
}
/**
 * Runtime type guard for HealthResponse
 */
export function isHealthResponse(value: unknown): value is HealthResponse {
  return HealthResponseSchema.safeParse(value).success;
}