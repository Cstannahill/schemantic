/**
 * Advanced Zod Validation Plugin
 *
 * Generates Zod schemas from OpenAPI specifications for runtime validation.
 * Implements sophisticated type-level validation mapping with performance optimizations.
 *
 * Key Features:
 * - Type-safe request/response validation pipelines
 * - Performance-optimized validation caching
 * - Branded type integration for compile-time safety
 * - Runtime type guard generation
 *
 * Architecture:
 * - Schema transformation with memoization
 * - Lazy evaluation for expensive operations
 * - Memory-efficient validation cache management
 */

import {
  SchemanticPlugin,
  GenerationContext,
  GeneratedType,
  GeneratedApiClient,
} from "../types/core";
import {
  ResolvedSchema,
  isOpenAPISchemaObject,
  ExtendedSchemaObject,
} from "../types/schema";

// Type-only reference to Zod - user must install zod as a dependency
type ZodType<T = unknown> = {
  parse(data: unknown): T;
  safeParse(data: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: {
          errors: Array<{ path: (string | number)[]; message: string }>;
        };
      };
  pipe<U>(schema: ZodType<U>): ZodType<U>;
};

/**
 * Configuration options for Zod validation plugin
 */
interface ZodValidationOptions {
  /** Enable strict mode validation */
  strictMode?: boolean;
  /** Cache generated schemas for performance */
  cacheSchemas?: boolean;
  /** Generate branded types for compile-time safety */
  generateBrandedTypes?: boolean;
  /** Generate runtime type guards */
  generateTypeGuards?: boolean;
  /** Optimize bundle size by tree-shaking */
  optimizeBundle?: boolean;
  /** Custom validation error messages */
  customErrorMessages?: Record<string, string>;
}

/**
 * Schema cache for performance optimization
 */
const schemaCache = new Map<string, string>();

/**
 * Memoized schema transformation for performance
 */
const memoizedSchemaTransform = new Map<string, ResolvedSchema>();

/**
 * Performance metric recording
 */
const performanceMetrics = new Map<string, number[]>();

function recordPerformanceMetric(operation: string, duration: number): void {
  if (!performanceMetrics.has(operation)) {
    performanceMetrics.set(operation, []);
  }
  performanceMetrics.get(operation)!.push(duration);

  // Keep only last 100 measurements
  const measurements = performanceMetrics.get(operation)!;
  if (measurements.length > 100) {
    measurements.splice(0, measurements.length - 100);
  }
}

/**
 * Advanced Zod Validation Plugin Implementation
 */
export const zodValidationPlugin: SchemanticPlugin = {
  name: "zod-validation",
  version: "2.0.0",
  description:
    "Advanced Zod schema generation with performance optimizations and type safety enhancements",

  /**
   * Transform schema to include Zod validation metadata
   */
  transformSchema: (
    schema: ResolvedSchema,
    context: GenerationContext
  ): ResolvedSchema => {
    const startTime = performance.now();

    try {
      const options = getPluginOptions(context);
      const schemaKey = generateSchemaKey(schema);

      // Use memoized transformation for performance
      if (options.cacheSchemas && memoizedSchemaTransform.has(schemaKey)) {
        return memoizedSchemaTransform.get(schemaKey)!;
      }

      const transformedSchema = transformSchemaForZod(schema, options);

      if (options.cacheSchemas) {
        memoizedSchemaTransform.set(schemaKey, transformedSchema);
      }

      return transformedSchema;
    } catch (error) {
      console.warn(`Zod validation plugin transformSchema failed:`, error);
      return schema;
    } finally {
      const endTime = performance.now();
      recordPerformanceMetric("transformSchema", endTime - startTime);
    }
  },

  /**
   * Enhance type generation with Zod schemas
   */
  afterTypeGeneration: async (
    typeName: string,
    generatedType: GeneratedType,
    context: GenerationContext
  ) => {
    const startTime = performance.now();

    try {
      const options = getPluginOptions(context);

      // Build schema using core builder that handles unions/objects/primitives
      const srcSchema = generatedType.sourceSchema;
      const zodSchema = await generateZodSchema(
        typeName,
        srcSchema,
        options,
        context
      );

      // Generate branded type if enabled
      const brandedType = options.generateBrandedTypes
        ? generateBrandedType(typeName, generatedType)
        : "";

      // Generate type guard if enabled
      const typeGuard = options.generateTypeGuards
        ? generateTypeGuard(typeName, zodSchema)
        : "";

      // Add Zod imports and schemas
      const zodImports = generateZodImports(options);
      const validationModule = generateValidationModule(
        typeName,
        zodSchema,
        brandedType,
        typeGuard,
        options
      );

      // Update generated type content
      generatedType.content = [
        zodImports,
        generatedType.content,
        validationModule,
      ]
        .filter(Boolean)
        .join("\n\n");

      // Update dependencies
      generatedType.dependencies.push("zod");

      // Add branded type exports if enabled
      if (options.generateBrandedTypes) {
        generatedType.exports.push(`Branded${typeName}`);
      }

      // Add validation exports
      generatedType.exports.push(
        `${typeName}Schema`,
        `validate${typeName}`,
        `parse${typeName}`
      );

      if (options.generateTypeGuards) {
        generatedType.exports.push(`is${typeName}`);
      }
    } catch (error) {
      console.warn(
        `Zod validation plugin afterTypeGeneration failed for ${typeName}:`,
        error
      );
    } finally {
      const endTime = performance.now();
      recordPerformanceMetric("afterTypeGeneration", endTime - startTime);
    }
  },

  /**
   * Enhance API client with validation integration
   */
  afterClientGeneration: async (
    generatedClient: GeneratedApiClient,
    context: GenerationContext
  ) => {
    const startTime = performance.now();

    try {
      const options = getPluginOptions(context);

      // Add validation middleware to client
      const validationMiddleware = generateValidationMiddleware(
        generatedClient,
        context,
        options
      );

      // Add request/response validation helpers
      const validationHelpers = generateValidationHelpers(options);

      // Update client content with validation integration
      generatedClient.content = [
        generatedClient.content,
        validationMiddleware,
        validationHelpers,
      ]
        .filter(Boolean)
        .join("\n\n");

      // Update dependencies
      if (!generatedClient.dependencies.includes("zod")) {
        generatedClient.dependencies.push("zod");
      }

      // Add validation exports
      generatedClient.exports.push(
        "validateRequest",
        "validateResponse",
        "ValidationError"
      );
    } catch (error) {
      console.warn(
        `Zod validation plugin afterClientGeneration failed:`,
        error
      );
    } finally {
      const endTime = performance.now();
      recordPerformanceMetric("afterClientGeneration", endTime - startTime);
    }
  },
};

/**
 * Get plugin options from generation context
 */
function getPluginOptions(context: GenerationContext): ZodValidationOptions {
  const pluginConfig = context.config.plugins?.find(
    (p) => p.name === "zod-validation"
  );
  return {
    strictMode: true,
    cacheSchemas: true,
    generateBrandedTypes: true,
    generateTypeGuards: true,
    optimizeBundle: true,
    customErrorMessages: {},
    ...((pluginConfig?.options as ZodValidationOptions) || {}),
  };
}

/**
 * Generate a unique key for schema caching
 */
function generateSchemaKey(schema: ResolvedSchema): string {
  return JSON.stringify(schema);
}

/**
 * Transform schema to include Zod validation metadata
 */
function transformSchemaForZod(
  schema: ResolvedSchema,
  options: ZodValidationOptions
): ResolvedSchema {
  if (!isOpenAPISchemaObject(schema)) {
    return schema;
  }

  const transformedSchema = { ...schema } as ExtendedSchemaObject;

  // Add Zod validation metadata
  transformedSchema._zodValidation = {
    strictMode: options.strictMode,
    customMessages: options.customErrorMessages,
    generated: true,
  };

  // Process properties recursively
  if (schema.properties) {
    transformedSchema.properties = {};
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (typeof propSchema === "object" && propSchema !== null) {
        transformedSchema.properties[propName] = transformSchemaForZod(
          propSchema as ResolvedSchema,
          options
        );
      } else {
        transformedSchema.properties[propName] = propSchema;
      }
    }
  }

  return transformedSchema;
}

/**
 * Generate Zod schema for a type
 */
async function generateZodSchema(
  typeName: string,
  schema: ResolvedSchema,
  options: ZodValidationOptions,
  context?: GenerationContext
): Promise<string> {
  const cacheKey = `${typeName}-${generateSchemaKey(schema)}`;

  if (options.cacheSchemas && schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  const zodSchema = buildZodSchema(schema, options, 0, context);

  if (options.cacheSchemas) {
    schemaCache.set(cacheKey, zodSchema);
  }

  return zodSchema;
}

/**
 * Build Zod schema from OpenAPI schema
 */
function buildZodSchema(
  schema: ResolvedSchema,
  options: ZodValidationOptions,
  depth = 0,
  context?: GenerationContext
): string {
  // Handle oneOf/discriminated unions early
  if (isOpenAPISchemaObject(schema)) {
    const obj = schema as ExtendedSchemaObject;
    if (Array.isArray(obj.oneOf) && obj.oneOf.length > 0) {
      return buildOneOfSchema(obj, options, context);
    }
  }
  // Handle schema references first
  if (
    typeof schema === "object" &&
    schema !== null &&
    "$ref" in schema &&
    schema.$ref
  ) {
    // Extract type name from reference and generate schema reference
    const refPath = schema.$ref as string;
    const typeName = refPath.split("/").pop();
    // Try to resolve and inline if it's a union (oneOf)
    if (context?.schemaResolver) {
      const resolved = context.schemaResolver(refPath);
      if (resolved && isOpenAPISchemaObject(resolved)) {
        const obj = resolved as ExtendedSchemaObject;
        if (Array.isArray(obj.oneOf) && obj.oneOf.length > 0) {
          return buildOneOfSchema(obj, options, context);
        }
      }
    }
    if (typeName) {
      const formattedTypeName = formatTypeName(typeName);
      return `${formattedTypeName}Schema`;
    }
  }

  if (!isOpenAPISchemaObject(schema)) {
    return "z.unknown()";
  }

  // Prevent infinite recursion
  if (depth > 10) {
    return "z.unknown()";
  }

  switch (schema.type) {
    case "string":
      return buildStringSchema(schema, options);
    case "number":
    case "integer":
      return buildNumberSchema(schema, options);
    case "boolean":
      return "z.boolean()";
    case "array": {
      const itemSchema = schema.items
        ? buildZodSchema(
            schema.items as ResolvedSchema,
            options,
            depth + 1,
            context
          )
        : "z.unknown()";
      return `z.array(${itemSchema})`;
    }
    case "object":
      return buildObjectSchema(schema, options, depth, context);
    default:
      return "z.unknown()";
  }
}

/**
 * Helper function to format type names consistently
 */
function formatTypeName(name: string): string {
  // Convert to PascalCase and add API prefix if not present.
  // Preserve internal capitalization (e.g., UserRole -> UserRole).
  const tokens = name.split(/[-_\s]+/).filter(Boolean);
  const pascalCase = tokens
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join("");

  return pascalCase.startsWith("API") ? pascalCase : `API${pascalCase}`;
}

/**
 * Build Zod string schema with validation rules
 */
function buildStringSchema(
  schema: ExtendedSchemaObject,
  _options: ZodValidationOptions
): string {
  let zodSchema = "z.string()";

  if (schema.minLength !== undefined) {
    zodSchema += `.min(${schema.minLength})`;
  }

  if (schema.maxLength !== undefined) {
    zodSchema += `.max(${schema.maxLength})`;
  }

  if (schema.pattern) {
    zodSchema += `.regex(/${schema.pattern}/)`;
  }

  if (schema.format) {
    switch (schema.format) {
      case "email":
        zodSchema += ".email()";
        break;
      case "uri":
      case "url":
        zodSchema += ".url()";
        break;
      case "uuid":
        zodSchema += ".uuid()";
        break;
      case "date-time":
        zodSchema += ".datetime()";
        break;
    }
  }

  if (schema.enum && Array.isArray(schema.enum)) {
    if (schema.enum.length === 1) {
      zodSchema = `z.literal(${JSON.stringify(schema.enum[0])})`;
    } else {
      const enumValues = schema.enum
        .map((val) => JSON.stringify(val))
        .join(", ");
      zodSchema = `z.enum([${enumValues}])`;
    }
  }

  // Add custom error messages if configured
  if (_options.customErrorMessages && schema.description) {
    const customMessage = _options.customErrorMessages[schema.description];
    if (customMessage) {
      zodSchema += `.describe("${customMessage}")`;
    }
  }

  return zodSchema;
}

/**
 * Build Zod number schema with validation rules
 */
function buildNumberSchema(
  schema: ExtendedSchemaObject,
  _options: ZodValidationOptions
): string {
  let zodSchema = schema.type === "integer" ? "z.number().int()" : "z.number()";

  if (schema.minimum !== undefined) {
    zodSchema += `.min(${schema.minimum})`;
  }

  if (schema.maximum !== undefined) {
    zodSchema += `.max(${schema.maximum})`;
  }

  if (schema.multipleOf !== undefined) {
    zodSchema += `.multipleOf(${schema.multipleOf})`;
  }

  return zodSchema;
}

/**
 * Build Zod object schema
 */
function buildObjectSchema(
  schema: ExtendedSchemaObject,
  options: ZodValidationOptions,
  depth: number,
  context?: GenerationContext
): string {
  if (!schema.properties) {
    return "z.object({})";
  }

  const properties: string[] = [];
  const required = schema.required || [];
  const transformPairs: string[] = [];
  const wantsCamel = context?.config?.namingConvention === "camelCase";

  // Helper: convert prop name to camelCase similar to generator
  const toCamel = (str: string): string => {
    if (!str) return str;
    // sanitize: collapse non-alnum into underscore, trim
    const sanitized = str
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
    const parts = sanitized.split(/_+/).filter(Boolean);
    if (parts.length === 0) return "";
    const head = parts[0] ?? "";
    const tail = parts.slice(1);
    const camelHead = head ? head.charAt(0).toLowerCase() + head.slice(1) : "";
    const camelTail = tail.map((p) =>
      p ? p.charAt(0).toUpperCase() + p.slice(1) : ""
    );
    return camelHead + camelTail.join("");
  };

  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    if (typeof propSchema === "object" && propSchema !== null) {
      let propZodSchema = buildZodSchema(
        propSchema as ResolvedSchema,
        options,
        depth + 1,
        context
      );

      if (!required.includes(propName)) {
        propZodSchema += ".optional()";
      }

      properties.push(`  ${propName}: ${propZodSchema}`);

      if (wantsCamel) {
        const camel = toCamel(propName);
        if (camel !== propName) {
          transformPairs.push(`  ${camel}: val[${JSON.stringify(propName)}]`);
        }
      }
    }
  }

  const strictMode = options.strictMode ? ".strict()" : "";
  const base = `z.object({\n${properties.join(",\n")}\n})${strictMode}`;
  if (wantsCamel && transformPairs.length > 0) {
    return `${base}.transform((val) => ({\n${transformPairs.join(",\n")}\n}))`;
  }
  return base;
}

/**
 * Build Zod union/discriminatedUnion schema for oneOf
 */
function buildOneOfSchema(
  schema: ExtendedSchemaObject,
  options: ZodValidationOptions,
  context?: GenerationContext
): string {
  const variants = (schema.oneOf || []).map((variant) => {
    if (
      typeof variant === "object" &&
      variant !== null &&
      "$ref" in (variant as Record<string, unknown>)
    ) {
      const refPath = (variant as Record<string, unknown>)["$ref"] as string;
      const name = refPath.split("/").pop() || "Unknown";
      return `${formatTypeName(name)}Schema`;
    }
    return buildZodSchema(variant as ResolvedSchema, options, 0, context);
  });

  const discriminator = schema.discriminator?.propertyName;
  if (discriminator) {
    return `z.discriminatedUnion(${JSON.stringify(
      discriminator
    )}, [${variants.join(", ")}])`;
  }
  return `z.union([${variants.join(", ")}])`;
}

/**
 * Generate branded type for compile-time safety
 */
function generateBrandedType(
  typeName: string,
  _generatedType: GeneratedType
): string {
  return `
/**
 * Branded type for ${typeName} with compile-time guarantees
 */
export type Branded${typeName} = ${typeName} & { __brand: '${typeName}' };

/**
 * Create a branded ${typeName} instance
 */
export function createBranded${typeName}(data: ${typeName}): Branded${typeName} {
  return data as Branded${typeName};
}`;
}

/**
 * Generate runtime type guard
 */
function generateTypeGuard(typeName: string, _zodSchema: string): string {
  return `
/**
 * Runtime type guard for ${typeName}
 */
export function is${typeName}(value: unknown): value is ${typeName} {
  return ${typeName}Schema.safeParse(value).success;
}`;
}

/**
 * Generate Zod imports based on options
 */
function generateZodImports(options: ZodValidationOptions): string {
  const imports = ["z"];

  if (options.generateBrandedTypes) {
    imports.push("ZodType");
  }

  return `import { ${imports.join(", ")} } from 'zod';`;
}

/**
 * Generate validation module for a type
 */
function generateValidationModule(
  typeName: string,
  zodSchema: string,
  brandedType: string,
  typeGuard: string,
  _options: ZodValidationOptions
): string {
  return `
/**
 * Zod validation schema for ${typeName}
 */
export const ${typeName}Schema = ${zodSchema};

/**
 * Validate ${typeName} data with detailed error reporting
 */
export function validate${typeName}(data: unknown): { success: true; data: ${typeName} } | { success: false; errors: string[] } {
  const result = ${typeName}Schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(err => \`\${err.path.join('.')}: \${err.message}\`)
  };
}

/**
 * Parse ${typeName} data with exception on validation failure
 */
export function parse${typeName}(data: unknown): ${typeName} {
  return ${typeName}Schema.parse(data);
}${brandedType}${typeGuard}`;
}

/**
 * Generate validation middleware for API client
 */
function generateValidationMiddleware(
  _generatedClient: GeneratedApiClient,
  _context: GenerationContext,
  options: ZodValidationOptions
): string {
  // Ensure z/ZodType import is present in client content
  if (!_generatedClient.content.includes("from 'zod'")) {
    _generatedClient.content =
      `import { z, ZodType } from 'zod';\n` + _generatedClient.content;
  } else if (!_generatedClient.content.includes("ZodType")) {
    // Append ZodType to existing import if only z is imported
    _generatedClient.content = _generatedClient.content.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]zod['"];?/,
      (_m: string, p1: string) => {
        const names = p1
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
        if (!names.includes("ZodType")) names.push("ZodType");
        return `import { ${names.join(", ")} } from 'zod';`;
      }
    );
  }
  const strictModeCode = options.strictMode
    ? 'throw new ValidationError(result.error.errors.map(err => `${err.path.join(".")}: ${err.message}`), data);'
    : "// In non-strict mode, return data as-is";

  return `
/**
 * Validation middleware for API requests and responses
 */
export class ValidationError extends Error {
  constructor(public errors: string[], public data: unknown) {
    super(\`Validation failed: \${errors.join(', ')}\`);
    this.name = 'ValidationError';
  }
}

/**
 * Validate request data before sending
 */
export function validateRequest<T>(data: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    throw new ValidationError(
      result.error.errors.map(err => \`\${err.path.join('.')}: \${err.message}\`),
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
    console.warn('Response validation failed:', result.error.errors);
    ${strictModeCode}
  }
  
  return result.data;
}`;
}

/**
 * Generate validation helper functions
 */
function generateValidationHelpers(_options: ZodValidationOptions): string {
  return `
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
}`;
}

/**
 * Memory-bounded validation cache with LRU eviction
 */
class BoundedValidationCache {
  private cache = new Map<
    string,
    {
      result: unknown;
      timestamp: number;
      accessTime: number;
      schemaVersion: string;
    }
  >();
  private maxSize: number;
  private ttl: number;
  private accessOrder: string[] = [];

  constructor(maxSize = 1000, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string):
    | {
        result: unknown;
        timestamp: number;
        accessTime: number;
        schemaVersion: string;
      }
    | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return undefined;
    }

    // Update access time and move to end (most recently used)
    entry.accessTime = now;
    this.moveToEnd(key);
    return entry;
  }

  set(
    key: string,
    value: { result: unknown; timestamp: number; schemaVersion: string }
  ): void {
    const now = Date.now();

    if (this.cache.has(key)) {
      // Update existing entry
      this.cache.set(key, { ...value, accessTime: now });
      this.moveToEnd(key);
    } else {
      // Add new entry
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      this.cache.set(key, { ...value, accessTime: now });
      this.accessOrder.push(key);
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift()!;
    this.cache.delete(lruKey);
  }

  private moveToEnd(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }
  }
}

const validationCache = new BoundedValidationCache();

export function memoizedValidation<T>(
  data: unknown,
  schema: ZodType<T>,
  cacheKey?: string,
  schemaVersion = "1.0"
): T {
  if (!cacheKey) {
    return schema.parse(data);
  }

  const cached = validationCache.get(cacheKey);

  if (cached && cached.schemaVersion === schemaVersion) {
    return cached.result as T;
  }

  const result = schema.parse(data);
  validationCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
    schemaVersion,
  });

  return result;
}

/**
 * Get performance statistics for the plugin
 */
export function getZodValidationPerformanceStats(): Record<
  string,
  { avg: number; min: number; max: number; count: number }
> {
  const stats: Record<
    string,
    { avg: number; min: number; max: number; count: number }
  > = {};

  for (const [operation, measurements] of performanceMetrics) {
    if (measurements.length > 0) {
      stats[operation] = {
        avg:
          measurements.reduce((sum, val) => sum + val, 0) / measurements.length,
        min: Math.min(...measurements),
        max: Math.max(...measurements),
        count: measurements.length,
      };
    }
  }

  return stats;
}

/**
 * Clear performance metrics and caches
 */
export function clearZodValidationCaches(): void {
  schemaCache.clear();
  memoizedSchemaTransform.clear();
  performanceMetrics.clear();
  validationCache.clear();

  // Optional: Trigger cleanup to remove expired entries
  validationCache.cleanup();
}

/**
 * Get validation cache statistics for monitoring
 */
export function getValidationCacheStats(): {
  size: number;
  maxSize: number;
  hitRate?: number;
  averageAccessTime?: number;
} {
  return {
    size: validationCache.size(),
    maxSize: 1000, // TODO: Make configurable
    // Additional metrics could be added with cache hit/miss tracking
  };
}

// Export plugin for registration
export default zodValidationPlugin;
