// Combined TypeScript Module
// Generated: 2025-09-14T06:14:31.539Z
// Source Directory: edge-case
// Architecture: Modular API client with hooks and type definitions
// api-client
import { z, ZodType } from "zod";
import { APIUserResponse, APIItem, APICreateItemRequest } from "./types";

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

export class SampleApiClient {
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

  async getUser(
    user_id: number,
    verbose?: boolean,
    options?: RequestInit
  ): Promise<APIUserResponse> {
    const url = new URL(
      `${this.baseUrl}${this.buildPath(`/users/${user_id}`, { user_id })}`
    );

    // Add query parameters
    if (verbose !== undefined) {
      url.searchParams.set("verbose", String(verbose));
    }

    const requestOptions: RequestInit = {
      method: "GET",
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    return this.request<APIUserResponse>(url.toString(), requestOptions);
  }

  async createItem(
    body?: APICreateItemRequest,
    options?: RequestInit
  ): Promise<APIItem> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/items`, {})}`);

    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        ...this.config.headers,
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    };

    return this.request<APIItem>(url.toString(), requestOptions);
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
export function validateRequest<T>(data: unknown, schema: ZodType<T>): T {
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
export function validateResponse<T>(data: unknown, schema: ZodType<T>): T {
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
// Barrel exports for sync-type generated code
export * from "./types";
export * from "./api-client";
export * from "./hooks";

// hooks
import { APIUserResponse, APIItem, APICreateItemRequest } from "./types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SampleApiClient, ApiClientError } from "./api-client";

export function createApiHooks(client: SampleApiClient) {
  function useGetUserQuery(
    args: { path: { user_id: number }; query?: { verbose?: boolean } },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<APIUserResponse | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getUser(
          args!.path.user_id,
          args?.query?.verbose,
          requestInit
        );
        setData(result);
      } catch (e) {
        setError(e as ApiClientError);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  function useCreateItemMutation() {
    const [data, setData] = useState<APIItem | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { body?: APICreateItemRequest },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.createItem(payload?.body, requestInit);
          setData(result);
          return result;
        } catch (e) {
          setError(e as ApiClientError);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  return { useGetUserQuery, useCreateItemMutation };
}

// index
export type {
  APIUserResponse,
  BrandedAPIUserResponse,
  APIUserResponseSchema,
  validateAPIUserResponse,
  parseAPIUserResponse,
  isAPIUserResponse,
  APIUserRole,
  APIUserRoleValues,
  BrandedAPIUserRole,
  APIUserRoleSchema,
  validateAPIUserRole,
  parseAPIUserRole,
  isAPIUserRole,
  APIUserProfile,
  BrandedAPIUserProfile,
  APIUserProfileSchema,
  validateAPIUserProfile,
  parseAPIUserProfile,
  isAPIUserProfile,
  APIBook,
  BrandedAPIBook,
  APIBookSchema,
  validateAPIBook,
  parseAPIBook,
  isAPIBook,
  APIMovie,
  BrandedAPIMovie,
  APIMovieSchema,
  validateAPIMovie,
  parseAPIMovie,
  isAPIMovie,
  APIItem,
  BrandedAPIItem,
  APIItemSchema,
  validateAPIItem,
  parseAPIItem,
  isAPIItem,
} from "./types";
export { SampleApiClient } from "./api-client";
export { createApiHooks } from "./hooks";

// types
import { z } from "zod";

export interface APIUserResponse {
  id: number;
  name: string;
  role: APIUserRole;
  profile?: APIUserProfile | undefined;
}

/**
 * Zod validation schema for APIUserResponse
 */
export const APIUserResponseSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    role: APIUserRoleSchema,
    profile: APIUserProfileSchema.optional(),
  })
  .strict();

/**
 * Validate APIUserResponse data with detailed error reporting
 */
export function validateAPIUserResponse(
  data: unknown
):
  | { success: true; data: APIUserResponse }
  | { success: false; errors: string[] } {
  const result = APIUserResponseSchema.safeParse(data);

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
 * Parse APIUserResponse data with exception on validation failure
 */
export function parseAPIUserResponse(data: unknown): APIUserResponse {
  return APIUserResponseSchema.parse(data);
}
/**
 * Branded type for APIUserResponse with compile-time guarantees
 */
export type BrandedAPIUserResponse = APIUserResponse & {
  __brand: "APIUserResponse";
};

/**
 * Create a branded APIUserResponse instance
 */
export function createBrandedAPIUserResponse(
  data: APIUserResponse
): BrandedAPIUserResponse {
  return data as BrandedAPIUserResponse;
}
/**
 * Runtime type guard for APIUserResponse
 */
export function isAPIUserResponse(value: unknown): value is APIUserResponse {
  return APIUserResponseSchema.safeParse(value).success;
}

export enum APIUserRole {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
}
export type APIUserRoleValues = "ADMIN" | "EDITOR" | "VIEWER";

/**
 * Zod validation schema for APIUserRole
 */
export const APIUserRoleSchema = z.enum(["ADMIN", "EDITOR", "VIEWER"]);

/**
 * Validate APIUserRole data with detailed error reporting
 */
export function validateAPIUserRole(
  data: unknown
): { success: true; data: APIUserRole } | { success: false; errors: string[] } {
  const result = APIUserRoleSchema.safeParse(data);

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
 * Parse APIUserRole data with exception on validation failure
 */
export function parseAPIUserRole(data: unknown): APIUserRole {
  return APIUserRoleSchema.parse(data);
}
/**
 * Branded type for APIUserRole with compile-time guarantees
 */
export type BrandedAPIUserRole = APIUserRole & { __brand: "APIUserRole" };

/**
 * Create a branded APIUserRole instance
 */
export function createBrandedAPIUserRole(
  data: APIUserRole
): BrandedAPIUserRole {
  return data as BrandedAPIUserRole;
}
/**
 * Runtime type guard for APIUserRole
 */
export function isAPIUserRole(value: unknown): value is APIUserRole {
  return APIUserRoleSchema.safeParse(value).success;
}

export interface APIUserProfile {
  bio?: string | undefined;
  social?: string[] | undefined;
}

/**
 * Zod validation schema for APIUserProfile
 */
export const APIUserProfileSchema = z
  .object({
    bio: z.string().optional(),
    social: z.array(z.string()).optional(),
  })
  .strict();

/**
 * Validate APIUserProfile data with detailed error reporting
 */
export function validateAPIUserProfile(
  data: unknown
):
  | { success: true; data: APIUserProfile }
  | { success: false; errors: string[] } {
  const result = APIUserProfileSchema.safeParse(data);

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
 * Parse APIUserProfile data with exception on validation failure
 */
export function parseAPIUserProfile(data: unknown): APIUserProfile {
  return APIUserProfileSchema.parse(data);
}
/**
 * Branded type for APIUserProfile with compile-time guarantees
 */
export type BrandedAPIUserProfile = APIUserProfile & {
  __brand: "APIUserProfile";
};

/**
 * Create a branded APIUserProfile instance
 */
export function createBrandedAPIUserProfile(
  data: APIUserProfile
): BrandedAPIUserProfile {
  return data as BrandedAPIUserProfile;
}
/**
 * Runtime type guard for APIUserProfile
 */
export function isAPIUserProfile(value: unknown): value is APIUserProfile {
  return APIUserProfileSchema.safeParse(value).success;
}

export interface APIBook {
  type: string;
  title: string;
  author: string;
}

/**
 * Zod validation schema for APIBook
 */
export const APIBookSchema = z
  .object({
    type: z.literal("book"),
    title: z.string(),
    author: z.string(),
  })
  .strict();

/**
 * Validate APIBook data with detailed error reporting
 */
export function validateAPIBook(
  data: unknown
): { success: true; data: APIBook } | { success: false; errors: string[] } {
  const result = APIBookSchema.safeParse(data);

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
 * Parse APIBook data with exception on validation failure
 */
export function parseAPIBook(data: unknown): APIBook {
  return APIBookSchema.parse(data);
}
/**
 * Branded type for APIBook with compile-time guarantees
 */
export type BrandedAPIBook = APIBook & { __brand: "APIBook" };

/**
 * Create a branded APIBook instance
 */
export function createBrandedAPIBook(data: APIBook): BrandedAPIBook {
  return data as BrandedAPIBook;
}
/**
 * Runtime type guard for APIBook
 */
export function isAPIBook(value: unknown): value is APIBook {
  return APIBookSchema.safeParse(value).success;
}

export interface APIMovie {
  type: string;
  title: string;
  director: string;
}

/**
 * Zod validation schema for APIMovie
 */
export const APIMovieSchema = z
  .object({
    type: z.literal("movie"),
    title: z.string(),
    director: z.string(),
  })
  .strict();

/**
 * Validate APIMovie data with detailed error reporting
 */
export function validateAPIMovie(
  data: unknown
): { success: true; data: APIMovie } | { success: false; errors: string[] } {
  const result = APIMovieSchema.safeParse(data);

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
 * Parse APIMovie data with exception on validation failure
 */
export function parseAPIMovie(data: unknown): APIMovie {
  return APIMovieSchema.parse(data);
}
/**
 * Branded type for APIMovie with compile-time guarantees
 */
export type BrandedAPIMovie = APIMovie & { __brand: "APIMovie" };

/**
 * Create a branded APIMovie instance
 */
export function createBrandedAPIMovie(data: APIMovie): BrandedAPIMovie {
  return data as BrandedAPIMovie;
}
/**
 * Runtime type guard for APIMovie
 */
export function isAPIMovie(value: unknown): value is APIMovie {
  return APIMovieSchema.safeParse(value).success;
}

export interface APIItem {
  id: number;
  data: APICreateItemRequest;
}

/**
 * Zod validation schema for APIItem
 */
export const APIItemSchema = z
  .object({
    id: z.number().int(),
    data: z.discriminatedUnion("type", [APIBookSchema, APIMovieSchema]),
  })
  .strict();

/**
 * Validate APIItem data with detailed error reporting
 */
export function validateAPIItem(
  data: unknown
): { success: true; data: APIItem } | { success: false; errors: string[] } {
  const result = APIItemSchema.safeParse(data);

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
 * Parse APIItem data with exception on validation failure
 */
export function parseAPIItem(data: unknown): APIItem {
  return APIItemSchema.parse(data);
}
/**
 * Branded type for APIItem with compile-time guarantees
 */
export type BrandedAPIItem = APIItem & { __brand: "APIItem" };

/**
 * Create a branded APIItem instance
 */
export function createBrandedAPIItem(data: APIItem): BrandedAPIItem {
  return data as BrandedAPIItem;
}
/**
 * Runtime type guard for APIItem
 */
export function isAPIItem(value: unknown): value is APIItem {
  return APIItemSchema.safeParse(value).success;
}
