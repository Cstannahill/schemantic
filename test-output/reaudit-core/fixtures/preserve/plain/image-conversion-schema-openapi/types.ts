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

export interface BodyBatchConvertImagesConvertBatchPost {
  /**
 * Image files to convert
 */
files: string[];
  target_format: ImageFormat;
  /**
 * Quality (1-100) for lossy formats
 */
quality?: number | null | undefined;
  /**
 * Preserve original filenames
 */
preserve_names?: boolean | undefined;
}

export interface BodyConvertImageConvertPost {
  /**
 * Image file to convert
 */
file: string;
  target_format: ImageFormat;
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

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail?: ValidationError[] | undefined;
}

/**
 * Health check response schema.
 */
export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
}

export interface BodyBatchConvertImagesConvertBatchPostBinary {
  /**
 * Image files to convert
 */
files: globalThis.Blob[];
  target_format: ImageFormat;
  /**
 * Quality (1-100) for lossy formats
 */
quality?: number | null | undefined;
  /**
 * Preserve original filenames
 */
preserve_names?: boolean | undefined;
}

export interface BodyConvertImageConvertPostBinary {
  /**
 * Image file to convert
 */
file: globalThis.Blob;
  target_format: ImageFormat;
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