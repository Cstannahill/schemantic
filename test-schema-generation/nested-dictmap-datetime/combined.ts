// Combined TypeScript Module
// Generated: 2025-09-14T06:14:31.625Z
// Source Directory: nested-dictmap-datetime
// Architecture: Modular API client with hooks and type definitions
// api-client
import { APIReport } from "./types";

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export class NestedDataApiClient {
  private baseUrl: string;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  async listReports(options?: RequestInit): Promise<APIReport[]> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/reports`, {})}`);

    const requestOptions: RequestInit = {
      method: "GET",
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    return this.request<APIReport[]>(url.toString(), requestOptions);
  }

  private buildPath(
    template: string,
    params: Record<string, string | number>
  ): string {
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      const value = params[key];
      if (value === undefined) {
        throw new Error("Missing required path parameter: " + key);
      }
      return String(value);
    });
  }

  private toFormData(input: any): FormData {
    const form = new FormData();
    if (input && typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined || value === null) continue;
        if (
          value instanceof Blob ||
          (typeof File !== "undefined" && value instanceof File)
        ) {
          form.append(key, value as any);
        } else if (Array.isArray(value)) {
          for (const v of value) {
            if (
              v instanceof Blob ||
              (typeof File !== "undefined" && v instanceof File)
            )
              form.append(key, v as any);
            else if (typeof v === "object")
              form.append(
                key,
                new Blob([JSON.stringify(v)], { type: "application/json" })
              );
            else form.append(key, String(v));
          }
        } else if (typeof value === "object") {
          form.append(
            key,
            new Blob([JSON.stringify(value)], { type: "application/json" })
          );
        } else {
          form.append(key, String(value));
        }
      }
    }
    return form;
  }

  private async request<T>(url: string, options: RequestInit): Promise<T> {
    let lastError: unknown;
    const retries = this.config.retries ?? 0;
    const delayMs = this.config.retryDelay ?? 0;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = this.config.timeout ?? 0;
        const timer =
          timeout > 0
            ? setTimeout(() => controller.abort(), timeout)
            : undefined;
        // Link external AbortSignal if provided
        if (options.signal) {
          const ext = options.signal;
          if (ext.aborted) controller.abort();
          else
            ext.addEventListener("abort", () => controller.abort(), {
              once: true,
            });
        }
        const { signal: _omit, ...rest } = options as any;
        const response = await fetch(url, {
          ...rest,
          signal: controller.signal,
        });
        if (timer) clearTimeout(timer);
        if (!response.ok) {
          throw new ApiClientError(
            "Request failed: " + response.status + " " + response.statusText,
            response.status,
            response
          );
        }
        if (response.status === 204 || options.method === "HEAD") {
          return undefined as unknown as T;
        }
        return (await response.json()) as T;
      } catch (err) {
        lastError = err;
        if (attempt < retries && delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        throw lastError;
      }
    }
    throw lastError as Error;
  }

  // Convenience helpers for bearer auth
  public setAuthToken(token: string) {
    this.config.headers = {
      ...(this.config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  public clearAuthToken() {
    if (this.config.headers)
      delete (this.config.headers as any)["Authorization"];
  }
}

/**
 * Validation middleware for API requests and responses
 */
export class ValidationError extends Error {
  constructor(public errors: string[], public data: unknown) {
    super(`Validation failed: ${errors.join(", ")}`);
    this.name = "ValidationError";
  }
}

/**
 * Validate request data before sending
 */
export function validateRequest<T>(data: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(
      result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
      data
    );
  }

  return result.data;
}

/**
 * Validate response data after receiving
 */
export function validateResponse<T>(data: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    console.warn("Response validation failed:", result.error.errors);
    throw new ValidationError(
      result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
      data
    );
  }

  return result.data;
}

/**
 * Utility functions for validation operations
 */

/**
 * Create a validation pipeline for multiple schemas
 */
export function createValidationPipeline<T>(
  ...schemas: ZodType<unknown>[]
): ZodType<T> {
  return schemas.reduce((acc, schema) => acc.pipe(schema)) as ZodType<T>;
}

/**
 * Lazy validation for performance optimization
 */
export function createLazyValidator<T>(schemaFactory: () => ZodType<T>) {
  let schema: ZodType<T> | null = null;

  return (data: unknown): T => {
    if (!schema) {
      schema = schemaFactory();
    }
    return schema.parse(data);
  };
}

// barrel
// Barrel exports for schemantic generated code
export * from "./types";
export * from "./api-client";
export * from "./hooks";

// hooks
import { APIReport } from "./types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NestedDataApiClient, ApiClientError } from "./api-client";

export function createApiHooks(client: NestedDataApiClient) {
  function useListReportsQuery(requestInit?: RequestInit) {
    const [data, setData] = useState<APIReport[] | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.listReports(requestInit);
        setData(result);
      } catch (e) {
        setError(e as ApiClientError);
      } finally {
        setLoading(false);
      }
    }, [client, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  return { useListReportsQuery };
}

// index
export type {
  APIReport,
  BrandedAPIReport,
  APIReportSchema,
  validateAPIReport,
  parseAPIReport,
  isAPIReport,
  APIEntry,
  BrandedAPIEntry,
  APIEntrySchema,
  validateAPIEntry,
  parseAPIEntry,
  isAPIEntry,
  APISubEntry,
  BrandedAPISubEntry,
  APISubEntrySchema,
  validateAPISubEntry,
  parseAPISubEntry,
  isAPISubEntry,
} from "./types";
export { NestedDataApiClient } from "./api-client";
export { createApiHooks } from "./hooks";

// types
import { z } from "zod";

export interface APIReport {
  id: string;
  createdAt: string;
  metadata?: Record<string, string> | undefined;
  entries: APIEntry[];
}

/**
 * Zod validation schema for APIReport
 */
export const APIReportSchema = z
  .object({
    id: z.string().uuid(),
    created_at: z.string().datetime(),
    metadata: z.object({}).optional(),
    entries: z.array(APIEntrySchema),
  })
  .strict()
  .transform((val) => ({
    id: val["id"],
    createdAt: val["created_at"],
    metadata: val["metadata"],
    entries: val["entries"],
  }));

/**
 * Validate APIReport data with detailed error reporting
 */
export function validateAPIReport(
  data: unknown
): { success: true; data: APIReport } | { success: false; errors: string[] } {
  const result = APIReportSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`
    ),
  };
}

/**
 * Parse APIReport data with exception on validation failure
 */
export function parseAPIReport(data: unknown): APIReport {
  return APIReportSchema.parse(data);
}
/**
 * Branded type for APIReport with compile-time guarantees
 */
export type BrandedAPIReport = APIReport & { __brand: "APIReport" };

/**
 * Create a branded APIReport instance
 */
export function createBrandedAPIReport(data: APIReport): BrandedAPIReport {
  return data as BrandedAPIReport;
}
/**
 * Runtime type guard for APIReport
 */
export function isAPIReport(value: unknown): value is APIReport {
  return APIReportSchema.safeParse(value).success;
}

export interface APIEntry {
  value?: number | undefined;
  tags?: string[] | undefined;
  subentries?: APISubEntry[] | undefined;
}

/**
 * Zod validation schema for APIEntry
 */
export const APIEntrySchema = z
  .object({
    value: z.number().optional(),
    tags: z.array(z.string()).optional(),
    subentries: z.array(APISubEntrySchema).optional(),
  })
  .strict()
  .transform((val) => ({
    value: val["value"],
    tags: val["tags"],
    subentries: val["subentries"],
  }));

/**
 * Validate APIEntry data with detailed error reporting
 */
export function validateAPIEntry(
  data: unknown
): { success: true; data: APIEntry } | { success: false; errors: string[] } {
  const result = APIEntrySchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`
    ),
  };
}

/**
 * Parse APIEntry data with exception on validation failure
 */
export function parseAPIEntry(data: unknown): APIEntry {
  return APIEntrySchema.parse(data);
}
/**
 * Branded type for APIEntry with compile-time guarantees
 */
export type BrandedAPIEntry = APIEntry & { __brand: "APIEntry" };

/**
 * Create a branded APIEntry instance
 */
export function createBrandedAPIEntry(data: APIEntry): BrandedAPIEntry {
  return data as BrandedAPIEntry;
}
/**
 * Runtime type guard for APIEntry
 */
export function isAPIEntry(value: unknown): value is APIEntry {
  return APIEntrySchema.safeParse(value).success;
}

export interface APISubEntry {
  label?: string | undefined;
  dataPoints?:
    | {
        timestamp: string;
        value: number;
      }[]
    | undefined;
}

/**
 * Zod validation schema for APISubEntry
 */
export const APISubEntrySchema = z
  .object({
    label: z.string().optional(),
    data_points: z
      .array(
        z
          .object({
            timestamp: z.string().datetime(),
            value: z.number(),
          })
          .strict()
          .transform((val) => ({
            timestamp: val["timestamp"],
            value: val["value"],
          }))
      )
      .optional(),
  })
  .strict()
  .transform((val) => ({
    label: val["label"],
    dataPoints: val["data_points"],
  }));

/**
 * Validate APISubEntry data with detailed error reporting
 */
export function validateAPISubEntry(
  data: unknown
): { success: true; data: APISubEntry } | { success: false; errors: string[] } {
  const result = APISubEntrySchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`
    ),
  };
}

/**
 * Parse APISubEntry data with exception on validation failure
 */
export function parseAPISubEntry(data: unknown): APISubEntry {
  return APISubEntrySchema.parse(data);
}
/**
 * Branded type for APISubEntry with compile-time guarantees
 */
export type BrandedAPISubEntry = APISubEntry & { __brand: "APISubEntry" };

/**
 * Create a branded APISubEntry instance
 */
export function createBrandedAPISubEntry(
  data: APISubEntry
): BrandedAPISubEntry {
  return data as BrandedAPISubEntry;
}
/**
 * Runtime type guard for APISubEntry
 */
export function isAPISubEntry(value: unknown): value is APISubEntry {
  return APISubEntrySchema.safeParse(value).success;
}
