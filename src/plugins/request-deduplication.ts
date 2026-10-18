/**
 * Advanced Request Deduplication Plugin
 *
 * Implements intelligent request deduplication at the client level with
 * sophisticated caching strategies, memory management, and performance optimization.
 *
 * Key Features:
 * - Request fingerprinting with content-based hashing
 * - Intelligent cache invalidation strategies
 * - Memory-efficient pending request management
 * - Configurable TTL and size limits
 * - Request coalescing for identical concurrent requests
 * - Stale-while-revalidate patterns
 *
 * Architecture:
 * - Non-blocking request deduplication
 * - LRU cache with TTL support
 * - WeakMap-based cleanup for memory efficiency
 * - Configurable cache policies per endpoint
 */

import {
  SchemanticPlugin,
  GenerationContext,
  GeneratedApiClient,
} from "../types/core";

/**
 * Configuration options for request deduplication plugin
 */
interface RequestDeduplicationOptions {
  /** Enable request deduplication */
  enabled?: boolean;
  /** Default cache TTL in milliseconds */
  defaultTTL?: number;
  /** Maximum cache size (number of entries) */
  maxCacheSize?: number;
  /** Maximum concurrent pending requests */
  maxPendingRequests?: number;
  /** Enable stale-while-revalidate pattern */
  enableStaleWhileRevalidate?: boolean;
  /** Retired generation-time function names. Supply a callback to the generated runtime constructor. */
  customKeyGenerator?: string; // Function name for custom key generation
  /** Per-endpoint cache policies */
  endpointPolicies?: Record<
    string,
    {
      ttl?: number;
      enabled?: boolean;
      staleWhileRevalidate?: boolean;
    }
  >;
  /** Enable request coalescing */
  enableCoalescing?: boolean;
  /** Debug logging */
  enableDebugLogging?: boolean;
}

/**
 * Advanced Request Deduplication Plugin Implementation
 */
export const requestDeduplicationPlugin: SchemanticPlugin = {
  name: "request-deduplication",
  version: "0.1.0",
  description:
    "Advanced request deduplication with intelligent caching and memory management",

  /**
   * Enhance API client with request deduplication capabilities
   */
  afterClientGeneration: async (
    generatedClient: GeneratedApiClient,
    context: GenerationContext
  ) => {
    const options = getPluginOptions(context);

    if (!options.enabled) {
      return;
    }

      // Add deduplication middleware to client
      const deduplicationCode = generateDeduplicationCode(
        generatedClient,
        options
      );
      generatedClient.content += deduplicationCode;

      // Update dependencies


      // Add deduplication exports
      generatedClient.exports.push(
        "RequestDeduplicator",
        "CacheManager",
        "RequestCoalescer",
        "clearRequestCache",
        "getCacheStats", "invalidateCache", "withDeduplication", "DeduplicationRequest", "RequestKeyGenerator"
      );

  },
};

/**
 * Get plugin options from generation context
 */
function getPluginOptions(
  context: GenerationContext
): RequestDeduplicationOptions {
  const pluginConfig = context?.config?.plugins?.find(
    (p) => p.name === "request-deduplication"
  );
  return {
    enabled: true,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxCacheSize: 1000,
    maxPendingRequests: 100,
    enableStaleWhileRevalidate: true,
    enableCoalescing: true,
    enableDebugLogging: false,
    endpointPolicies: {},
    ...((pluginConfig?.options as RequestDeduplicationOptions) || {}),
  };
}

/**
 * Generate request deduplication code for API client
 */
function generateDeduplicationCode(
  _generatedClient: GeneratedApiClient,
  options: RequestDeduplicationOptions
): string {
  if (options.customKeyGenerator !== undefined) {
    throw new Error("Generation-time customKeyGenerator names are unsupported; pass a callback to the runtime RequestDeduplicator constructor");
  }
  return `
/** Request identity includes all supplied headers. For implicit cookie/session credentials,
 * supply cacheScope, create one deduplicator per session, or use skipCache. Keys are never logged. */
export interface DeduplicationRequest {
  method: string; url: string; headers: Record<string, string>; body?: unknown;
  params?: Record<string, unknown>; cacheScope?: string;
}
export type RequestKeyGenerator = (request: DeduplicationRequest) => string;
function canonicalRequestValue(value: unknown, seen = new Set<unknown>()): string {
  if (value === null) return 'null';
  if (typeof value !== 'object') {
    if (typeof value === 'function' || typeof value === 'symbol') throw new Error('Unsupported cache identity');
    return typeof value + ':' + JSON.stringify(typeof value === 'number' && Object.is(value, -0) ? '-0' : String(value));
  }
  if (seen.has(value)) throw new Error('Cyclic cache identity');
  seen.add(value);
  try {
    if (value instanceof Date) return 'date:' + value.toISOString();
    if (Array.isArray(value)) return '[' + Array.from(value, item => canonicalRequestValue(item, seen)).join(',') + ']';
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('Unsupported cache identity');
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalRequestValue((value as Record<string, unknown>)[key], seen)).join(',') + '}';
  } finally { seen.delete(value); }
}
function requestIdentity(request: DeduplicationRequest): string {
  const headers: Record<string, string> = {};
  new Headers(request.headers).forEach((value, key) => { headers[key] = value; });
  // Preserve URL query ordering: repeated/order-sensitive query values can affect server responses.
  return canonicalRequestValue({ ...request, method: request.method.toUpperCase(), headers });
}
export class RequestCoalescer {
  private readonly pending = new Map<string, Promise<unknown>>();
  constructor(private readonly maxPending = ${options.maxPendingRequests ?? 100}) {}
  async coalesce<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;
    if (this.pending.size >= this.maxPending) return factory();
    const promise = Promise.resolve().then(factory).finally(() => {
      if (this.pending.get(key) === promise) this.pending.delete(key);
    });
    this.pending.set(key, promise); return promise;
  }
  clear(): void { this.pending.clear(); }
  getPendingCount(): number { return this.pending.size; }
}
interface CacheEntry<T> { data: T; timestamp: number; ttl: number; staleWhileRevalidate: boolean; }
export class CacheManager<T = unknown> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly revalidations = new Map<string, Promise<unknown>>();
  private hits = 0; private misses = 0; private evictions = 0;
  constructor(private readonly options: { defaultTTL: number; enableStaleWhileRevalidate: boolean; debugLogging: boolean; maxSize?: number }) {}
  get(key: string, allowStale = this.options.enableStaleWhileRevalidate): T | undefined {
    const entry = this.cache.get(key);
    if (!entry || (Date.now() - entry.timestamp >= entry.ttl && !(allowStale && entry.staleWhileRevalidate))) {
      this.misses++; if (entry) this.cache.delete(key); return undefined;
    }
    this.hits++; this.cache.delete(key); this.cache.set(key, entry); return entry.data;
  }
  set(key: string, data: T, ttl = this.options.defaultTTL, staleWhileRevalidate = this.options.enableStaleWhileRevalidate): void {
    if ((this.options.maxSize ?? ${options.maxCacheSize ?? 1000}) <= 0) return;
    this.cache.delete(key);
    if (this.cache.size >= (this.options.maxSize ?? ${options.maxCacheSize ?? 1000})) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) { this.cache.delete(oldest); this.evictions++; }
    }
    this.cache.set(key, { data, ttl, timestamp: Date.now(), staleWhileRevalidate });
  }
  hasFresh(key: string): boolean { const e = this.cache.get(key); return !!e && Date.now() - e.timestamp < e.ttl; }
  has(key: string): boolean { return this.cache.has(key); }
  invalidate(key: string): void { this.cache.delete(key); this.revalidations.delete(key); }
  clear(): void { this.cache.clear(); this.revalidations.clear(); this.hits = 0; this.misses = 0; this.evictions = 0; }
  keys(): IterableIterator<string> { return this.cache.keys(); }
  getStats(): { size: number; hitRate: number; hits: number; misses: number; evictions: number } {
    for (const [key, entry] of this.cache) if (!entry.staleWhileRevalidate && Date.now() - entry.timestamp >= entry.ttl) this.cache.delete(key);
    return { size: this.cache.size, hitRate: this.hits + this.misses ? this.hits / (this.hits + this.misses) : 0, hits: this.hits, misses: this.misses, evictions: this.evictions };
  }
  revalidateInBackground<U extends T>(key: string, factory: () => Promise<U>, ttl = this.options.defaultTTL, staleWhileRevalidate = this.options.enableStaleWhileRevalidate): void {
    if (this.revalidations.has(key)) return;
    let refresh: Promise<U>; try { refresh = factory(); } catch { return; }
    const promise = refresh.then(data => {
      // Invalidation or clear revokes pending writes.
      if (this.revalidations.get(key) === promise) this.set(key, data, ttl, staleWhileRevalidate);
    }).catch(() => undefined).finally(() => { if (this.revalidations.get(key) === promise) this.revalidations.delete(key); });
    this.revalidations.set(key, promise);
  }
}
export class RequestDeduplicator {
  private readonly cacheManager = new CacheManager({ defaultTTL: ${options.defaultTTL ?? 300000}, enableStaleWhileRevalidate: ${options.enableStaleWhileRevalidate ?? true}, debugLogging: ${options.enableDebugLogging ?? false}, maxSize: ${options.maxCacheSize ?? 1000} });
  private readonly coalescer = new RequestCoalescer();
  private readonly urls = new Map<string, Set<string>>();
  private epoch = 0;
  private readonly endpointPolicies: Record<string, { enabled?: boolean; ttl?: number; staleWhileRevalidate?: boolean }> = ${JSON.stringify(options.endpointPolicies ?? {})};
  constructor(private readonly runtimeOptions: { customKeyGenerator?: RequestKeyGenerator } = {}) {}
  async execute<T>(method: string, url: string, factory: () => Promise<T>, options: { headers?: Record<string, string>; body?: unknown; params?: Record<string, unknown>; cacheScope?: string; skipCache?: boolean; customTTL?: number } = {}): Promise<T> {
    if (options.skipCache || !['GET', 'HEAD'].includes(method.toUpperCase())) return factory();
    const policy = this.getEndpointPolicy(url); if (!policy.enabled) return factory();
    const request: DeduplicationRequest = { method: method.toUpperCase(), url, headers: options.headers ?? {}, ...(options.body !== undefined ? { body: options.body } : {}), ...(options.params !== undefined ? { params: options.params } : {}), ...(options.cacheScope !== undefined ? { cacheScope: options.cacheScope } : {}) };
    const keyGenerator = this.runtimeOptions.customKeyGenerator;
    let key: string;
    if (keyGenerator) key = keyGenerator(request);
    else { try { key = requestIdentity(request); } catch { return factory(); } }
    const ttl = options.customTTL ?? policy.ttl;
    const cached = this.cacheManager.get(key, policy.staleWhileRevalidate);
    if (cached !== undefined || this.cacheManager.has(key)) {
      if (policy.staleWhileRevalidate && !this.cacheManager.hasFresh(key)) this.cacheManager.revalidateInBackground(key, factory, ttl, policy.staleWhileRevalidate);
      return cached as T;
    }
    const epoch = this.epoch;
    const result = ${options.enableCoalescing ?? true} ? await this.coalescer.coalesce(key, factory) : await factory();
    if (epoch === this.epoch) {
      this.cacheManager.set(key, result, ttl, policy.staleWhileRevalidate);
      const urls = this.urls.get(key) ?? new Set<string>(); urls.add(url); this.urls.set(key, urls);
      for (const known of this.urls.keys()) if (!this.cacheManager.has(known)) this.urls.delete(known);
    }
    return result;
  }
  invalidate(pattern: string | RegExp): void {
    this.epoch++; this.coalescer.clear();
    for (const [key, urls] of this.urls) {
      const matches = Array.from(urls).some(url => { if (typeof pattern === 'string') return url.includes(pattern); pattern.lastIndex = 0; return pattern.test(url); });
      if (matches) { this.cacheManager.invalidate(key); this.urls.delete(key); }
    }
  }
  clearCache(): void { this.epoch++; this.cacheManager.clear(); this.coalescer.clear(); this.urls.clear(); }
  getStats(): { cacheSize: number; pendingRequests: number; cacheHitRate: number; hits: number; misses: number; evictions: number } {
    const stats = this.cacheManager.getStats(); return { cacheSize: stats.size, pendingRequests: this.coalescer.getPendingCount(), cacheHitRate: stats.hitRate, hits: stats.hits, misses: stats.misses, evictions: stats.evictions };
  }
  private getEndpointPolicy(url: string): { enabled: boolean; ttl: number; staleWhileRevalidate: boolean } {
    const match = Object.entries(this.endpointPolicies).find(([pattern]) => url.includes(pattern));
    const policy = match?.[1]; return { enabled: policy?.enabled ?? true, ttl: policy?.ttl ?? ${options.defaultTTL ?? 300000}, staleWhileRevalidate: policy?.staleWhileRevalidate ?? ${options.enableStaleWhileRevalidate ?? true} };
  }
}
const globalDeduplicator = new RequestDeduplicator();
export function clearRequestCache(): void { globalDeduplicator.clearCache(); }
export function getCacheStats(): ReturnType<RequestDeduplicator['getStats']> { return globalDeduplicator.getStats(); }
export function invalidateCache(pattern: string | RegExp): void { globalDeduplicator.invalidate(pattern); }
export function withDeduplication<T extends (...args: any[]) => Promise<any>>(requestFn: T, options: { method: string; urlExtractor: (...args: Parameters<T>) => string; headersExtractor?: (...args: Parameters<T>) => Record<string, string>; bodyExtractor?: (...args: Parameters<T>) => unknown; paramsExtractor?: (...args: Parameters<T>) => Record<string, unknown>; cacheScopeExtractor?: (...args: Parameters<T>) => string }): T {
  return ((...args: Parameters<T>) => {
    const headers = options.headersExtractor?.(...args); const body = options.bodyExtractor?.(...args); const params = options.paramsExtractor?.(...args); const cacheScope = options.cacheScopeExtractor?.(...args);
    return globalDeduplicator.execute(options.method, options.urlExtractor(...args), () => requestFn(...args), { ...(headers !== undefined ? { headers } : {}), ...(body !== undefined ? { body } : {}), ...(params !== undefined ? { params } : {}), ...(cacheScope !== undefined ? { cacheScope } : {}) });
  }) as T;
}
`;
}
export default requestDeduplicationPlugin;
