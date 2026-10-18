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
export const ImageFormatSchema: z.ZodType = z.intersection(z.union([z.literal("png"), z.literal("jpeg"), z.literal("jpg"), z.literal("webp"), z.literal("avif"), z.literal("tiff"), z.literal("tif"), z.literal("ico"), z.literal("heic"), z.literal("heif"), z.literal("bmp"), z.literal("svg")]), z.string());

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
export const BodyBatchConvertImagesConvertBatchPostSchema: z.ZodType = z.object({
  files: z.array(z.string()),
  targetFormat: z.lazy(() => ImageFormatSchema),
  quality: z.intersection(z.union([z.number().int().min(1).max(100), z.null()]), z.unknown()).optional(),
  preserveNames: z.boolean().optional()
}).strict();

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
export const BodyConvertImageConvertPostSchema: z.ZodType = z.object({
  file: z.string(),
  targetFormat: z.lazy(() => ImageFormatSchema),
  quality: z.intersection(z.union([z.number().int().min(1).max(100), z.null()]), z.unknown()).optional(),
  width: z.intersection(z.union([z.number().int().max(10000).gt(0), z.null()]), z.unknown()).optional(),
  height: z.intersection(z.union([z.number().int().max(10000).gt(0), z.null()]), z.unknown()).optional(),
  dpi: z.intersection(z.union([z.number().int().max(600).gt(0), z.null()]), z.unknown()).optional(),
  scale: z.intersection(z.union([z.number().max(10).gt(0), z.null()]), z.unknown()).optional()
}).strict();

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
  loc: (string | number)[];
  msg: string;
  type: string;
}



/**
 * Zod validation schema for ValidationError
 */
export const ValidationErrorSchema: z.ZodType = z.object({
  loc: z.array(z.intersection(z.union([z.string(), z.number().int()]), z.unknown())),
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
export const HTTPValidationErrorSchema: z.ZodType = z.object({
  detail: z.array(z.lazy(() => ValidationErrorSchema)).optional()
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
export const HealthResponseSchema: z.ZodType = z.object({
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

export interface BodyBatchConvertImagesConvertBatchPostBinary {
  /**
 * Image files to convert
 */
files: globalThis.Blob[];
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
 * Zod validation schema for BodyBatchConvertImagesConvertBatchPostBinary
 */
export const BodyBatchConvertImagesConvertBatchPostBinarySchema: z.ZodType = z.object({
  files: z.array(z.instanceof(globalThis.Blob)),
  targetFormat: z.lazy(() => ImageFormatSchema),
  quality: z.intersection(z.union([z.number().int().min(1).max(100), z.null()]), z.unknown()).optional(),
  preserveNames: z.boolean().optional()
}).strict();

/**
 * Validate BodyBatchConvertImagesConvertBatchPostBinary data with detailed error reporting
 */
export function validateBodyBatchConvertImagesConvertBatchPostBinary(data: unknown): { success: true; data: BodyBatchConvertImagesConvertBatchPostBinary } | { success: false; errors: string[] } {
  const result = BodyBatchConvertImagesConvertBatchPostBinarySchema.safeParse(data);

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

  return { success: true, data: result.data as BodyBatchConvertImagesConvertBatchPostBinary };
}

/**
 * Parse BodyBatchConvertImagesConvertBatchPostBinary data with exception on validation failure
 */
export function parseBodyBatchConvertImagesConvertBatchPostBinary(data: unknown): BodyBatchConvertImagesConvertBatchPostBinary {
  return BodyBatchConvertImagesConvertBatchPostBinarySchema.parse(data) as BodyBatchConvertImagesConvertBatchPostBinary;
}

/**
 * Branded type for BodyBatchConvertImagesConvertBatchPostBinary with compile-time guarantees
 */
export type BrandedBodyBatchConvertImagesConvertBatchPostBinary = BodyBatchConvertImagesConvertBatchPostBinary & { __brand: 'BodyBatchConvertImagesConvertBatchPostBinary' };

/**
 * Create a branded BodyBatchConvertImagesConvertBatchPostBinary instance
 */
export function createBrandedBodyBatchConvertImagesConvertBatchPostBinary(data: BodyBatchConvertImagesConvertBatchPostBinary): BrandedBodyBatchConvertImagesConvertBatchPostBinary {
  return data as BrandedBodyBatchConvertImagesConvertBatchPostBinary;
}
/**
 * Runtime type guard for BodyBatchConvertImagesConvertBatchPostBinary
 */
export function isBodyBatchConvertImagesConvertBatchPostBinary(value: unknown): value is BodyBatchConvertImagesConvertBatchPostBinary {
  return BodyBatchConvertImagesConvertBatchPostBinarySchema.safeParse(value).success;
}

export interface BodyConvertImageConvertPostBinary {
  /**
 * Image file to convert
 */
file: globalThis.Blob;
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
 * Zod validation schema for BodyConvertImageConvertPostBinary
 */
export const BodyConvertImageConvertPostBinarySchema: z.ZodType = z.object({
  file: z.instanceof(globalThis.Blob),
  targetFormat: z.lazy(() => ImageFormatSchema),
  quality: z.intersection(z.union([z.number().int().min(1).max(100), z.null()]), z.unknown()).optional(),
  width: z.intersection(z.union([z.number().int().max(10000).gt(0), z.null()]), z.unknown()).optional(),
  height: z.intersection(z.union([z.number().int().max(10000).gt(0), z.null()]), z.unknown()).optional(),
  dpi: z.intersection(z.union([z.number().int().max(600).gt(0), z.null()]), z.unknown()).optional(),
  scale: z.intersection(z.union([z.number().max(10).gt(0), z.null()]), z.unknown()).optional()
}).strict();

/**
 * Validate BodyConvertImageConvertPostBinary data with detailed error reporting
 */
export function validateBodyConvertImageConvertPostBinary(data: unknown): { success: true; data: BodyConvertImageConvertPostBinary } | { success: false; errors: string[] } {
  const result = BodyConvertImageConvertPostBinarySchema.safeParse(data);

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

  return { success: true, data: result.data as BodyConvertImageConvertPostBinary };
}

/**
 * Parse BodyConvertImageConvertPostBinary data with exception on validation failure
 */
export function parseBodyConvertImageConvertPostBinary(data: unknown): BodyConvertImageConvertPostBinary {
  return BodyConvertImageConvertPostBinarySchema.parse(data) as BodyConvertImageConvertPostBinary;
}

/**
 * Branded type for BodyConvertImageConvertPostBinary with compile-time guarantees
 */
export type BrandedBodyConvertImageConvertPostBinary = BodyConvertImageConvertPostBinary & { __brand: 'BodyConvertImageConvertPostBinary' };

/**
 * Create a branded BodyConvertImageConvertPostBinary instance
 */
export function createBrandedBodyConvertImageConvertPostBinary(data: BodyConvertImageConvertPostBinary): BrandedBodyConvertImageConvertPostBinary {
  return data as BrandedBodyConvertImageConvertPostBinary;
}
/**
 * Runtime type guard for BodyConvertImageConvertPostBinary
 */
export function isBodyConvertImageConvertPostBinary(value: unknown): value is BodyConvertImageConvertPostBinary {
  return BodyConvertImageConvertPostBinarySchema.safeParse(value).success;
}