// Combined TypeScript Module
// Generated: 2025-09-14T06:14:31.389Z
// Source Directory: allof-inher-union
// Architecture: Modular API client with hooks and type definitions
// api-client
import { APIPetResponse } from "./types";

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

export class InheritanceApiClient {
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

  async getPet(pet_id: number, options?: RequestInit): Promise<APIPetResponse> {
    const url = new URL(
      `${this.baseUrl}${this.buildPath(`/pets/${pet_id}`, { pet_id })}`
    );

    const requestOptions: RequestInit = {
      method: "GET",
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    return this.request<APIPetResponse>(url.toString(), requestOptions);
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
import { APIPetResponse } from "./types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InheritanceApiClient, ApiClientError } from "./api-client";

export function createApiHooks(client: InheritanceApiClient) {
  function useGetPetQuery(
    args: { path: { pet_id: number } },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<APIPetResponse | undefined>(undefined);
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
        const result = await client.getPet(args!.path.pet_id, requestInit);
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
  return { useGetPetQuery };
}

// index
export type {
  APIBasePet,
  BrandedAPIBasePet,
  APIBasePetSchema,
  validateAPIBasePet,
  parseAPIBasePet,
  isAPIBasePet,
} from "./types";
export { InheritanceApiClient } from "./api-client";
export { createApiHooks } from "./hooks";

// types
import { z } from "zod";

export interface APIBasePet {
  id: number;
  name: string;
  age?: number | undefined;
}

/**
 * Zod validation schema for APIBasePet
 */
export const APIBasePetSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    age: z.number().int().optional(),
  })
  .strict();

/**
 * Validate APIBasePet data with detailed error reporting
 */
export function validateAPIBasePet(
  data: unknown
): { success: true; data: APIBasePet } | { success: false; errors: string[] } {
  const result = APIBasePetSchema.safeParse(data);

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
 * Parse APIBasePet data with exception on validation failure
 */
export function parseAPIBasePet(data: unknown): APIBasePet {
  return APIBasePetSchema.parse(data);
}
/**
 * Branded type for APIBasePet with compile-time guarantees
 */
export type BrandedAPIBasePet = APIBasePet & { __brand: "APIBasePet" };

/**
 * Create a branded APIBasePet instance
 */
export function createBrandedAPIBasePet(data: APIBasePet): BrandedAPIBasePet {
  return data as BrandedAPIBasePet;
}
/**
 * Runtime type guard for APIBasePet
 */
export function isAPIBasePet(value: unknown): value is APIBasePet {
  return APIBasePetSchema.safeParse(value).success;
}
