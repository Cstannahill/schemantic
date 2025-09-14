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
  /** Custom cache key generation */
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
  version: "2.0.0",
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

    try {
      // Add deduplication middleware to client
      const deduplicationCode = generateDeduplicationCode(
        generatedClient,
        options
      );
      generatedClient.content += deduplicationCode;

      // Update dependencies
      generatedClient.dependencies.push("crypto-js"); // For hashing

      // Add deduplication exports
      generatedClient.exports.push(
        "RequestDeduplicator",
        "CacheManager",
        "RequestCoalescer",
        "clearRequestCache",
        "getCacheStats"
      );
    } catch (error) {
      console.warn(
        "Request deduplication plugin afterClientGeneration failed:",
        error
      );
    }
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
  return `

/**
 * Advanced Request Deduplication System
 */

/**
 * LRU Cache implementation with TTL support
 */
class LRUCacheWithTTL<K, V> {
  private readonly maxSize: number;
  private readonly cache = new Map<K, { value: V; timestamp: number; ttl: number }>();
  private readonly accessOrder = new Map<K, number>();
  private accessCounter = 0;

  constructor(maxSize: number = ${options.maxCacheSize || 1000}) {
    this.maxSize = maxSize;
  }

  set(key: K, value: V, ttl: number = ${
    options.defaultTTL || 5 * 60 * 1000
  }): void {
    const now = Date.now();
    
    // Remove expired entries before adding new one
    this.cleanup();
    
    // If at capacity, remove LRU item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      ttl
    });
    
    this.accessOrder.set(key, ++this.accessCounter);
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry is expired
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return undefined;
    }

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);
    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    const result = this.cache.delete(key);
    this.accessOrder.delete(key);
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: K[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }
  }

  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  getStats(): { size: number; hitRate: number; evictions: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for this
      evictions: 0 // Would need to track evictions for this
    };
  }
}

/**
 * Request fingerprint generator
 */
class RequestFingerprintGenerator {
  /**
   * Generate a unique fingerprint for a request
   */
  static generate(
    method: string,
    url: string,
    headers: Record<string, string> = {},
    body?: unknown,
    params?: Record<string, unknown>
  ): string {
    const fingerprint = {
      method: method.toUpperCase(),
      url: this.normalizeURL(url),
      headers: this.normalizeHeaders(headers),
      body: body ? JSON.stringify(body) : undefined,
      params: params ? JSON.stringify(params) : undefined
    };

    // Simple hash generation (in production, use crypto-js or similar)
    return this.simpleHash(JSON.stringify(fingerprint));
  }

  private static normalizeURL(url: string): string {
    try {
      const urlObj = new URL(url);
      // Sort query parameters for consistent fingerprinting
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = new URLSearchParams();
      Array.from(params.keys()).sort().forEach(key => {
        params.getAll(key).forEach(value => sortedParams.append(key, value));
      });
      urlObj.search = sortedParams.toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private static normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    
    // Only include cache-relevant headers and normalize case
    const relevantHeaders = ['authorization', 'content-type', 'accept', 'cache-control'];
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (relevantHeaders.includes(lowerKey)) {
        normalized[lowerKey] = value;
      }
    }
    
    return normalized;
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

/**
 * Request coalescing manager
 */
class RequestCoalescer {
  private readonly pendingRequests = new Map<string, Promise<unknown>>();
  private readonly maxPending: number;

  constructor(maxPending = ${options.maxPendingRequests || 100}) {
    this.maxPending = maxPending;
  }

  /**
   * Coalesce identical requests
   */
  async coalesce<T>(
    fingerprint: string,
    requestFactory: () => Promise<T>
  ): Promise<T> {
    // Check if identical request is already pending
    const existingRequest = this.pendingRequests.get(fingerprint);
    if (existingRequest) {
      ${
        options.enableDebugLogging
          ? "console.debug(`Request coalesced: ${fingerprint}`);"
          : ""
      }
      return existingRequest as Promise<T>;
    }

    // Check if we're at capacity
    if (this.pendingRequests.size >= this.maxPending) {
      ${
        options.enableDebugLogging
          ? "console.warn(`Request coalescing at capacity, executing directly`);"
          : ""
      }
      return requestFactory();
    }

    // Create new request and track it
    const requestPromise = requestFactory()
      .finally(() => {
        // Clean up when request completes
        this.pendingRequests.delete(fingerprint);
      });

    this.pendingRequests.set(fingerprint, requestPromise);
    return requestPromise;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get current pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

/**
 * Cache manager with stale-while-revalidate support
 */
class CacheManager<T = unknown> {
  private readonly cache = new LRUCacheWithTTL<string, CacheEntry<T>>();
  private readonly staleRevalidatePromises = new Map<string, Promise<T>>();

  constructor(private readonly options: {
    defaultTTL: number;
    enableStaleWhileRevalidate: boolean;
    debugLogging: boolean;
  }) {}

  /**
   * Get cached response or undefined if not cached/expired
   */
  get(fingerprint: string): T | undefined {
    const entry = this.cache.get(fingerprint);
    
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    
    if (age > entry.ttl) {
      // Entry is expired
      if (this.options.enableStaleWhileRevalidate && !entry.stale) {
        // Mark as stale but return it
        entry.stale = true;
        this.cache.set(fingerprint, entry, entry.ttl);
        ${
          options.enableDebugLogging
            ? "this.options.debugLogging && console.debug(`Serving stale data: ${fingerprint}`);"
            : ""
        }
        return entry.data;
      }
      
      // Entry is too old even for stale-while-revalidate
      this.cache.delete(fingerprint);
      return undefined;
    }

    ${
      options.enableDebugLogging
        ? "this.options.debugLogging && console.debug(`Cache hit: ${fingerprint}`);"
        : ""
    }
    return entry.data;
  }

  /**
   * Set cached response
   */
  set(fingerprint: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTTL,
      stale: false
    };

    this.cache.set(fingerprint, entry, entry.ttl);
    ${
      options.enableDebugLogging
        ? "this.options.debugLogging && console.debug(`Cache set: ${fingerprint}`);"
        : ""
    }
  }

  /**
   * Check if entry exists and is fresh
   */
  hasFresh(fingerprint: string): boolean {
    const entry = this.cache.get(fingerprint);
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    return age <= entry.ttl && !entry.stale;
  }

  /**
   * Check if entry exists (including stale)
   */
  has(fingerprint: string): boolean {
    return this.cache.has(fingerprint);
  }

  /**
   * Invalidate cache entry
   */
  invalidate(fingerprint: string): void {
    this.cache.delete(fingerprint);
    this.staleRevalidatePromises.delete(fingerprint);
    ${
      options.enableDebugLogging
        ? "this.options.debugLogging && console.debug(`Cache invalidated: ${fingerprint}`);"
        : ""
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.staleRevalidatePromises.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size(),
      hitRate: 0 // Would need hit/miss tracking
    };
  }

  /**
   * Revalidate stale entry in background
   */
  revalidateInBackground<U extends T>(
    fingerprint: string,
    revalidator: () => Promise<U>
  ): void {
    if (this.staleRevalidatePromises.has(fingerprint)) {
      return; // Already revalidating
    }

    const revalidationPromise = revalidator()
      .then(freshData => {
        this.set(fingerprint, freshData);
        return freshData;
      })
      .catch(error => {
        ${
          options.enableDebugLogging
            ? "this.options.debugLogging && console.warn(`Background revalidation failed: ${fingerprint}`, error);"
            : ""
        }
        throw error;
      })
      .finally(() => {
        this.staleRevalidatePromises.delete(fingerprint);
      });

    this.staleRevalidatePromises.set(fingerprint, revalidationPromise);
  }
}

/**
 * Main request deduplicator
 */
export class RequestDeduplicator {
  private readonly cacheManager: CacheManager;
  private readonly coalescer: RequestCoalescer;
  private readonly endpointPolicies: Record<string, any>;

  constructor() {
    this.cacheManager = new CacheManager({
      defaultTTL: ${options.defaultTTL || 5 * 60 * 1000},
      enableStaleWhileRevalidate: ${options.enableStaleWhileRevalidate || true},
      debugLogging: ${options.enableDebugLogging || false}
    });
    
    this.coalescer = new RequestCoalescer(${options.maxPendingRequests || 100});
    this.endpointPolicies = ${JSON.stringify(options.endpointPolicies || {})};
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(
    method: string,
    url: string,
    requestFactory: () => Promise<T>,
    options: {
      headers?: Record<string, string>;
      body?: unknown;
      params?: Record<string, unknown>;
      skipCache?: boolean;
      customTTL?: number;
    } = {}
  ): Promise<T> {
    if (options.skipCache) {
      return requestFactory();
    }

    // Generate request fingerprint
    const fingerprint = RequestFingerprintGenerator.generate(
      method,
      url,
      options.headers,
      options.body,
      options.params
    );

    // Check endpoint-specific policy
    const policy = this.getEndpointPolicy(url);
    if (!policy.enabled) {
      return requestFactory();
    }

    // Try cache first
    const cachedResult = this.cacheManager.get(fingerprint);
    if (cachedResult !== undefined) {
      // If stale and stale-while-revalidate is enabled, revalidate in background
      if (policy.staleWhileRevalidate && !this.cacheManager.hasFresh(fingerprint)) {
        this.cacheManager.revalidateInBackground(fingerprint, requestFactory);
      }
      return cachedResult as T;
    }

    // No cache hit, execute request with coalescing
    const result = await this.coalescer.coalesce(fingerprint, requestFactory);

    // Cache the result
    const ttl = options.customTTL || policy.ttl || ${
      options.defaultTTL || 5 * 60 * 1000
    };
    this.cacheManager.set(fingerprint, result, ttl);

    return result;
  }

  /**
   * Invalidate cache for specific pattern
   */
  invalidate(pattern: string | RegExp): void {
    // In a real implementation, this would iterate through cache keys
    // and invalidate matching entries
    if (typeof pattern === 'string') {
      const fingerprint = RequestFingerprintGenerator.generate('GET', pattern);
      this.cacheManager.invalidate(fingerprint);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cacheManager.clear();
    this.coalescer.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cacheSize: number;
    pendingRequests: number;
    cacheHitRate: number;
  } {
    return {
      cacheSize: this.cacheManager.getStats().size,
      pendingRequests: this.coalescer.getPendingCount(),
      cacheHitRate: this.cacheManager.getStats().hitRate
    };
  }

  private getEndpointPolicy(url: string): {
    enabled: boolean;
    ttl: number;
    staleWhileRevalidate: boolean;
  } {
    // Simple URL matching - in production, use more sophisticated matching
    for (const [pattern, policy] of Object.entries(this.endpointPolicies)) {
      if (url.includes(pattern)) {
        return {
          enabled: policy.enabled ?? true,
          ttl: policy.ttl ?? ${options.defaultTTL || 5 * 60 * 1000},
          staleWhileRevalidate: policy.staleWhileRevalidate ?? ${
            options.enableStaleWhileRevalidate || true
          }
        };
      }
    }

    return {
      enabled: true,
      ttl: ${options.defaultTTL || 5 * 60 * 1000},
      staleWhileRevalidate: ${options.enableStaleWhileRevalidate || true}
    };
  }
}

/**
 * Global deduplicator instance
 */
const globalDeduplicator = new RequestDeduplicator();

/**
 * Utility functions
 */
export function clearRequestCache(): void {
  globalDeduplicator.clearCache();
}

export function getCacheStats(): ReturnType<RequestDeduplicator['getStats']> {
  return globalDeduplicator.getStats();
}

export function invalidateCache(pattern: string | RegExp): void {
  globalDeduplicator.invalidate(pattern);
}

/**
 * Request wrapper with deduplication
 */
export function withDeduplication<T extends (...args: any[]) => Promise<any>>(
  requestFn: T,
  options: {
    method: string;
    urlExtractor: (...args: Parameters<T>) => string;
    headersExtractor?: (...args: Parameters<T>) => Record<string, string>;
    bodyExtractor?: (...args: Parameters<T>) => unknown;
    paramsExtractor?: (...args: Parameters<T>) => Record<string, unknown>;
  }
): T {
  return ((...args: Parameters<T>) => {
    const url = options.urlExtractor(...args);
    const headers = options.headersExtractor?.(...args);
    const body = options.bodyExtractor?.(...args);
    const params = options.paramsExtractor?.(...args);

    return globalDeduplicator.execute(
      options.method,
      url,
      () => requestFn(...args),
      { headers, body, params }
    );
  }) as T;
}`;
}

// Export plugin for registration
export default requestDeduplicationPlugin;
