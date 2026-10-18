import { User } from './types';

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
    this.name = 'ApiClientError';
  }
}

export class EdgeApiClient {
  private baseUrl: string;
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

  async getUser(options?: RequestInit): Promise<User> {
    const url = new URL(this.baseUrl + this.buildPath("/user", {  }));

    const headers = new Headers(this.config.headers);
    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
    const requestOptions: RequestInit = {
      ...options,
      method: "GET",
      headers,
    };


    return this.request<User>(url.toString(), requestOptions);
  }

  private buildPath(template: string, params: Record<string, unknown>): string {
    return template.replace(/\{([^}]+)\}/g, (_match, key) => {
      const value = params[key];
      if (value === undefined) {
        throw new Error('Missing required path parameter: ' + key);
      }
      return encodeURIComponent(String(value));
    });
  }

  private toUrlEncoded(input: unknown): URLSearchParams {
    const form = new URLSearchParams();
    if (input && typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined || value === null) continue;
        for (const item of Array.isArray(value) ? value : [value]) form.append(key, String(item));
      }
    }
    return form;
  }

  private toFormData(input: unknown): FormData {
    const form = new FormData();
    if (input && typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined || value === null) continue;
        if (value instanceof Blob || (typeof File !== 'undefined' && value instanceof File)) {
          form.append(key, value);
        } else if (Array.isArray(value)) {
          for (const v of value) {
            if (v instanceof Blob || (typeof File !== 'undefined' && v instanceof File)) form.append(key, v);
            else if (typeof v === 'object') form.append(key, new Blob([JSON.stringify(v)], { type: 'application/json' }));
            else form.append(key, String(v));
          }
        } else if (typeof value === 'object') {
          form.append(key, new Blob([JSON.stringify(value)], { type: 'application/json' }));
        } else {
          form.append(key, String(value));
        }
      }
    }
    return form;
  }

  private async request<T>(url: string, options: RequestInit, emptyResponse = false): Promise<T> {
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
        if (!response.ok) {
          throw new ApiClientError('Request failed: ' + response.status + ' ' + response.statusText, response.status, response);
        }
        if (emptyResponse || response.status === 204 || response.status === 205 || options.method === 'HEAD') return undefined as T;
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('json') || !contentType) return await response.json() as T;
        if (contentType.startsWith('text/')) return await response.text() as T;
        return await response.blob() as T;
      } catch (error) {
        const status = error instanceof ApiClientError ? error.status : undefined;
        const transient = status === undefined || status === 408 || status === 429 || (status !== undefined && status >= 500);
        if (!canRetry || !transient || attempt >= retries || options.signal?.aborted || controller.signal.aborted || error instanceof SyntaxError) throw error;
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
      }
      if (delayMs > 0) {
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); reject(options.signal?.reason || new Error('Request aborted')); };
          const timer = setTimeout(() => { options.signal?.removeEventListener('abort', abort); resolve(); }, delayMs);
          if (options.signal?.aborted) abort();
          else options.signal?.addEventListener('abort', abort, { once: true });
        });
      }
    }
  }

  // Convenience helpers for bearer auth
  public setAuthToken(token: string) {
    this.config.headers = { ...(this.config.headers || {}), Authorization: `Bearer ${token}` };
  }
  public clearAuthToken() {
    if (this.config.headers) delete this.config.headers['Authorization'];
  }}
