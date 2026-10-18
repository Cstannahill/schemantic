import { z } from 'zod';
import type { ZodType } from 'zod';
import { serializeValue, deserializeValue } from './conversion.js';
import type { HealthResponse, BodyConvertImageConvertPostBinary, BodyBatchConvertImagesConvertBatchPostBinary, HTTPValidationError } from './types.js';

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: RequestInit['headers'];
  retries?: number;
  retryDelay?: number;
}

export class ApiClientError extends globalThis.Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ImageManipulationApiClient {
  public readonly baseUrl: string;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  async healthCheckHealthGet(options?: RequestInit): Promise<HealthResponse> {
    const url = new URL(this.baseUrl + this.buildPath("/health", {  }, {}));

    const headers = new Headers(this.config.headers);
    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
    const requestOptions: RequestInit = {
      ...options,
      method: "GET",
      headers,
    };


    return this.request<HealthResponse>(url.toString(), requestOptions, [{"status":"200","contentType":"application/json","schema":{"$ref":"#/components/schemas/HealthResponse"},"mode":"json"}]);
  }

  async convertImageConvertPost(body: BodyConvertImageConvertPostBinary | globalThis.FormData, options?: RequestInit): Promise<unknown> {
    const url = new URL(this.baseUrl + this.buildPath("/convert/", {  }, {}));

    const headers = new Headers(this.config.headers);
    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
    const requestOptions: RequestInit = {
      ...options,
      method: "POST",
      headers,
      ...(body !== undefined ? { body: (body instanceof globalThis.FormData ? body : this.toFormData(serializeValue(body, {"$ref":"#/components/schemas/Body_convert_image_convert__postBinary"}))) } : {}),
    };


    return this.request<unknown>(url.toString(), requestOptions, [{"status":"200","contentType":"application/json","schema":{},"mode":"json"},{"status":"200","contentType":"image/*","mode":"blob"},{"status":"400","mode":"empty"},{"status":"413","mode":"empty"},{"status":"422","mode":"empty"}]);
  }

  async batchConvertImagesConvertBatchPost(body: BodyBatchConvertImagesConvertBatchPostBinary | globalThis.FormData, options?: RequestInit): Promise<unknown | globalThis.Blob> {
    const url = new URL(this.baseUrl + this.buildPath("/convert/batch", {  }, {}));

    const headers = new Headers(this.config.headers);
    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
    const requestOptions: RequestInit = {
      ...options,
      method: "POST",
      headers,
      ...(body !== undefined ? { body: (body instanceof globalThis.FormData ? body : this.toFormData(serializeValue(body, {"$ref":"#/components/schemas/Body_batch_convert_images_convert_batch_postBinary"}))) } : {}),
    };


    return this.request<unknown | globalThis.Blob>(url.toString(), requestOptions, [{"status":"200","contentType":"application/json","schema":{},"mode":"json"},{"status":"200","contentType":"application/zip","mode":"blob"},{"status":"400","mode":"empty"},{"status":"413","mode":"empty"},{"status":"422","contentType":"application/json","schema":{"$ref":"#/components/schemas/HTTPValidationError"},"mode":"json"}]);
  }

  async listFormatsConvertFormatsGet(options?: RequestInit): Promise<Record<string, unknown>> {
    const url = new URL(this.baseUrl + this.buildPath("/convert/formats", {  }, {}));

    const headers = new Headers(this.config.headers);
    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
    const requestOptions: RequestInit = {
      ...options,
      method: "GET",
      headers,
    };


    return this.request<Record<string, unknown>>(url.toString(), requestOptions, [{"status":"200","contentType":"application/json","schema":{"additionalProperties":true,"type":"object","title":"Response List Formats Convert Formats Get"},"mode":"json"}]);
  }

  async rootGet(options?: RequestInit): Promise<unknown> {
    const url = new URL(this.baseUrl + this.buildPath("/", {  }, {}));

    const headers = new Headers(this.config.headers);
    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
    const requestOptions: RequestInit = {
      ...options,
      method: "GET",
      headers,
    };


    return this.request<unknown>(url.toString(), requestOptions, [{"status":"200","contentType":"application/json","schema":{},"mode":"json"}]);
  }

  private buildPath(template: string, params: Record<string, unknown>, metadata: Record<string, { explode?: boolean }> = {}): string {
    return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
      const value = params[key];
      if (value === undefined) throw new Error('Missing required path parameter: ' + key);
      if (Array.isArray(value)) return value.map(item => encodeURIComponent(String(item))).join(',');
      if (value !== null && typeof value === 'object') return Object.entries(value).map(([name, item]) =>
        encodeURIComponent(name) + (metadata[key]?.explode ? '=' : ',') + encodeURIComponent(String(item))).join(',');
      return encodeURIComponent(String(value));
    });
  }

  private toFormData(input: unknown): globalThis.FormData {
    const form = new globalThis.FormData();
    if (input && typeof input === 'object') for (const [key, value] of Object.entries(input)) {
      if (value === undefined || value === null) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item instanceof globalThis.Blob) form.append(key, item);
        else if (typeof item === 'object') form.append(key, new globalThis.Blob([JSON.stringify(item)], { type: 'application/json' }));
        else form.append(key, String(item));
      }
    }
    return form;
  }

  private async request<T>(url: string, options: RequestInit, responses: Array<{ status: string; contentType?: string; schema?: unknown; mode: 'json' | 'text' | 'blob' | 'empty' }>): Promise<T> {
    const retries = this.config.retries ?? 0;
    const delayMs = this.config.retryDelay ?? 0;
    const canRetry = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(options.method || 'GET');
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timeout = this.config.timeout ?? 0;
      const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;
      const onAbort = () => controller.abort();
      if (options.signal?.aborted) controller.abort();
      else options.signal?.addEventListener('abort', onAbort, { once: true });
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) throw new ApiClientError('Request failed: ' + response.status + ' ' + response.statusText, response.status, response);
        if (response.status === 204 || response.status === 205 || options.method === 'HEAD') return undefined as T;
        let candidates = responses.filter(item => item.status === String(response.status));
        if (!candidates.length) candidates = responses.filter(item => item.status.toUpperCase() === Math.floor(response.status / 100) + 'XX');
        if (!candidates.length) candidates = responses.filter(item => item.status === 'default');
        const contentType = (response.headers.get('Content-Type') || '').split(';')[0]!.trim().toLowerCase();
        const declared = candidates.find(item => item.contentType?.toLowerCase() === contentType) || candidates[0];
        if (declared?.mode === 'empty') return undefined as T;
        const mode = contentType ? /(?:\/json|\+json)$/.test(contentType) ? 'json' : contentType.startsWith('text/') || /(?:\/xml|\+xml)$/.test(contentType) || contentType === 'application/x-www-form-urlencoded' ? 'text' : 'blob' : declared?.mode || 'json';
        if (mode === 'json') return deserializeValue(await response.json(), declared?.schema) as T;
        if (mode === 'text') return await response.text() as T;
        return await response.blob() as T;
      } catch (error) {
        const status = error instanceof ApiClientError ? error.status : undefined;
        const transient = status === undefined || status === 408 || status === 429 || (status !== undefined && status >= 500);
        if (!canRetry || !transient || attempt >= retries || options.signal?.aborted || controller.signal.aborted || error instanceof SyntaxError) throw error;
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
      }
      if (delayMs > 0) await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); reject(options.signal?.reason || new Error('Request aborted')); };
        const timer = setTimeout(() => { options.signal?.removeEventListener('abort', abort); resolve(); }, delayMs);
        if (options.signal?.aborted) abort(); else options.signal?.addEventListener('abort', abort, { once: true });
      });
    }
  }

  public setDefaultHeader(name: string, value: string): void {
    const headers = new globalThis.Headers(this.config.headers); headers.set(name, value); this.config.headers = headers;
  }
  public removeDefaultHeader(name: string): void {
    const headers = new globalThis.Headers(this.config.headers); headers.delete(name); this.config.headers = headers;
  }
  public setAuthToken(token: string): void { this.setDefaultHeader('Authorization', 'Bearer ' + token); }
  public clearAuthToken(): void { this.removeDefaultHeader('Authorization'); }
}



/**
 * Validation middleware for API requests and responses
 */
export class ResponseValidationError extends Error {
  public issues: readonly z.core.$ZodIssue[];
  constructor(issues: readonly z.core.$ZodIssue[], public data: unknown) {
    const message = issues
      .map((iss) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
      .join('; ');
    super('Validation failed: ' + message);
    this.name = 'ResponseValidationError';
    this.issues = issues;
    Object.setPrototypeOf(this, ResponseValidationError.prototype);
  }
}

/**
 * Validate request data before sending
 */
export function validateRequest<T>(data: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    // Use Zod v4 core issue type
    throw new ResponseValidationError(issues as readonly z.core.$ZodIssue[], data);
  }

  return result.data;
}

/**
 * Validate response data after receiving
 */
export function validateResponse<T>(data: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    console.warn('Response validation failed:', issues);
    throw new ResponseValidationError(result.error?.issues ?? [], data);
  }

  return result.data;
}


/**
 * Utility functions for validation operations
 */

/**
 * Create a validation pipeline for multiple schemas
 */
export function createValidationPipeline<T>(...schemas: ZodType<unknown>[]): ZodType<T> {
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