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
import { propertyKey, typeName as formatGeneratedName, referenceName } from "../generators/schema-type";

// Type-only reference to Zod - user must install zod as a dependency
type ZodType<T = unknown> = {
  parse(data: unknown): T;
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
let schemaCaches = new WeakMap<GenerationContext, Map<string, string>>();

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
  version: "0.1.0",
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
      const sourceKey = generateSchemaKey(schema);
      const schemaKey = sourceKey === undefined ? undefined : JSON.stringify(options) + sourceKey;

      // Use memoized transformation for performance
      if (options.cacheSchemas && schemaKey !== undefined && memoizedSchemaTransform.has(schemaKey)) {
        return memoizedSchemaTransform.get(schemaKey)!;
      }

      const transformedSchema = transformSchemaForZod(schema, options);

      if (options.cacheSchemas && schemaKey !== undefined) {
        if (memoizedSchemaTransform.size >= 1000) memoizedSchemaTransform.delete(memoizedSchemaTransform.keys().next().value!);
        memoizedSchemaTransform.set(schemaKey, transformedSchema);
      }

      return transformedSchema;
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
        generatedType.exports.push(`Branded${typeName}`, `createBranded${typeName}`);
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

      const validationErrorName = chooseValidationErrorName(generatedClient, context);
      // Add validation middleware to client
      const validationMiddleware = generateValidationMiddleware(
        generatedClient,
        context,
        options,
        validationErrorName
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

      // Ensure zod import is present; include 'z' only if the content references it
      if (!generatedClient.content.includes("from 'zod'")) {
        const needsZ = generatedClient.content.includes("z.");
        generatedClient.content =
          `import { ${needsZ ? "z, " : ""}ZodType } from 'zod';\n` +
          generatedClient.content;
      } else if (!generatedClient.content.includes("ZodType")) {
        generatedClient.content = generatedClient.content.replace(
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

      // Update dependencies
      if (!generatedClient.dependencies.includes("zod")) {
        generatedClient.dependencies.push("zod");
      }

      // Add validation exports
      generatedClient.exports.push(
        "validateRequest",
        "validateResponse",
        validationErrorName, "createValidationPipeline", "createLazyValidator"
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
    (p) => p.enabled && (p.name === "zod-validation" || p.name === "validation")
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
function generateSchemaKey(schema: ResolvedSchema): string | undefined {
  // Circular in-memory schema graphs have no JSON cache identity. Bypass caching
  // instead of inventing a sentinel shared by unrelated recursive graphs.
  try { return JSON.stringify(schema); } catch (error) {
    if (error instanceof TypeError && /circular/i.test(error.message)) return undefined;
    throw error;
  }
}

/**
 * Transform schema to include Zod validation metadata
 */
function transformSchemaForZod(
  schema: ResolvedSchema,
  options: ZodValidationOptions,
  seen = new WeakMap<object, ResolvedSchema>()
): ResolvedSchema {
  if (!isOpenAPISchemaObject(schema)) {
    return schema;
  }

  const existing = seen.get(schema);
  if (existing) return existing;
  const transformedSchema = { ...schema } as ExtendedSchemaObject;
  seen.set(schema, transformedSchema);

  // Add Zod validation metadata
  transformedSchema._zodValidation = {
    strictMode: options.strictMode,
    customMessages: options.customErrorMessages,
    generated: true,
  };

  // Process properties recursively
  if (schema.properties) {
    transformedSchema.properties = {};
    for (const [propName, propSchema] of Object.entries(schema.properties ?? {})) {
      if (typeof propSchema === "object" && propSchema !== null) {
        transformedSchema.properties[propName] = transformSchemaForZod(
          propSchema as ResolvedSchema,
          options,
          seen
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
  const sourceKey = generateSchemaKey(schema);
  const cacheKey = sourceKey === undefined ? undefined : JSON.stringify([typeName, context?.config.typePrefix, context?.config.typeSuffix, options, sourceKey]);

  let cache = context ? schemaCaches.get(context) : undefined;
  if (context && !cache) { cache = new Map<string, string>(); schemaCaches.set(context, cache); }
  if (options.cacheSchemas && cacheKey !== undefined && cache?.has(cacheKey)) return cache.get(cacheKey)!;

  const zodSchema = buildZodSchema(schema, options, 0, context);

  if (options.cacheSchemas && cacheKey !== undefined) {
    cache?.set(cacheKey, zodSchema);
  }

  return zodSchema;
}

/**
 * Build Zod schema from OpenAPI schema
 */
export function buildZodSchema(
  schema: ResolvedSchema,
  options: ZodValidationOptions,
  depth = 0,
  context?: GenerationContext
): string {
  if (depth > 30) return "z.unknown()";
  if (typeof schema === "object" && schema !== null && "$ref" in schema && schema.$ref) {
    const ref = schema.$ref as string;
    const siblings = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "$ref" && !key.startsWith("_") && !["description", "title", "deprecated", "example"].includes(key)));
    const nullable = siblings.nullable === true;
    delete siblings.nullable;
    const resolved = context?.schemaResolver?.(ref);
    let referenceSchema: string;
    if (Object.keys(siblings).length && resolved) {
      const inheritedType = isOpenAPISchemaObject(resolved) && ["string", "number", "integer", "array", "boolean"].includes(String(resolved.type)) ? { type: resolved.type } : {};
      referenceSchema = `z.intersection(${buildZodSchema(resolved, { ...options, strictMode: false }, depth + 1, context)}, ${buildZodSchema({ ...inheritedType, ...siblings } as ResolvedSchema, { ...options, strictMode: false }, depth + 1, context)})`;
    } else if (/^#\/components\/schemas\/[^/]+$/.test(ref)) {
      referenceSchema = `z.lazy(() => ${formatTypeNameWithContext(referenceName(ref), context)}Schema)`;
    } else {
      referenceSchema = resolved ? buildZodSchema(resolved, options, depth + 1, context) : "z.unknown()";
    }
    return nullable ? `${referenceSchema}.nullable()` : referenceSchema;
  }
  if (!isOpenAPISchemaObject(schema)) return "z.unknown()";
  if (schema["x-schemantic-binary"] === true) return "z.instanceof(globalThis.Blob)";
  const build = (part: ResolvedSchema) => buildZodSchema(part, options, depth + 1, context);
  let result: string;
  if (schema.enum?.length) {
    const literals = schema.enum.map(value => `z.literal(${JSON.stringify(value)})`);
    const literalSchema = literals.length === 1 ? literals[0]! : `z.union([${literals.join(", ")}])`;
    const own = { ...schema }; delete own.enum;
    result = `z.intersection(${literalSchema}, ${build(own)})`;
  } else if (schema.const !== undefined) {
    const own = { ...schema }; delete own.const;
    result = `z.intersection(z.literal(${JSON.stringify(schema.const)}), ${build(own)})`;
  } else if (schema.oneOf?.length || schema.anyOf?.length || schema.allOf?.length) {
    // A composition and its sibling constraints apply together. Implicit strict
    // mode must not reject fields contributed by another intersected schema;
    // explicit additionalProperties:false still applies within each branch.
    const compositionOptions = { ...options, strictMode: false };
    const hasSiblingFields = !!schema.properties || !!schema.required?.length || schema.additionalProperties !== undefined;
    const compositionCount = [schema.oneOf, schema.anyOf, schema.allOf].filter(parts => parts?.length).length;
    const intersectsFields = hasSiblingFields || compositionCount > 1;
    const unionOptions = intersectsFields ? compositionOptions : options;
    const buildPart = (part: ResolvedSchema, partOptions: ZodValidationOptions = compositionOptions, inlineReference = true): string => {
      if (typeof part === "object" && part !== null && "$ref" in part && typeof part.$ref === "string") {
        const resolved = context?.schemaResolver?.(part.$ref);
        if (resolved && inlineReference) {
          const siblings = { ...part } as ExtendedSchemaObject;
          delete siblings.$ref;
          const nullable = siblings.nullable === true; delete siblings.nullable;
          // Retain the entire reference expression instead of substituting only
          // its target and losing minLength/properties/required beside $ref.
          return buildZodSchema({ allOf: [resolved, siblings], ...(nullable ? { nullable: true } : {}) }, partOptions, depth + 1, context);
        }
      }
      return buildZodSchema(part, partOptions, depth + 1, context);
    };
    const parts: string[] = [];
    if (schema.oneOf?.length) {
      const variants = schema.oneOf.map(part => buildPart(part as ResolvedSchema, unionOptions, intersectsFields));
      const union = variants.length === 1 ? variants[0]! : `z.union([${variants.join(", ")}])`;
      parts.push(`${union}.refine((value: unknown) => [${variants.join(", ")}].filter(variant => variant.safeParse(value).success).length === 1, { message: "Expected exactly one matching schema" })`);
    }
    if (schema.anyOf?.length) {
      const variants = schema.anyOf.map(part => buildPart(part as ResolvedSchema, unionOptions, intersectsFields));
      parts.push(variants.length === 1 ? variants[0]! : `z.union([${variants.join(", ")}])`);
    }
    if (schema.allOf?.length) parts.push(...schema.allOf.map(part => buildPart(part as ResolvedSchema)));
    const own = { ...schema };
    delete own.oneOf; delete own.anyOf; delete own.allOf; delete own.nullable; delete own.not;
    const siblingValidator = buildZodSchema(own, compositionOptions, depth + 1, context);
    if (siblingValidator !== "z.unknown()") parts.push(siblingValidator);
    result = parts.reduce((left, right) => `z.intersection(${left}, ${right})`);
  } else if (Array.isArray(schema.type)) {
    const parts = schema.type.map(type => build({ ...schema, type, nullable: false }));
    result = parts.length === 1 ? parts[0]! : `z.union([${parts.join(", ")}])`;
  } else {
    switch (schema.type) {
      case "string": result = buildStringSchema(schema, options); break;
      case "number": case "integer": result = buildNumberSchema(schema, options); break;
      case "boolean": result = "z.boolean()"; break;
      case "null": result = "z.null()"; break;
      case "array":
        result = `z.array(${schema.items ? build(schema.items as ResolvedSchema) : "z.unknown()"})`;
        if (schema.minItems !== undefined) result += `.min(${schema.minItems})`;
        if (schema.maxItems !== undefined) result += `.max(${schema.maxItems})`;
        if (schema.uniqueItems) result += `.refine((items: unknown[]) => items.every((item, index) => items.findIndex(other => { const canonical = (value: unknown): string => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : value !== null && typeof value === 'object' ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}' : JSON.stringify(value) ?? 'undefined'; return canonical(other) === canonical(item); }) === index), { message: "Array items must be unique" })`;
        break;
      case "object": result = buildObjectSchema(schema, options, depth, context); break;
      default: result = schema.properties || schema.required || schema.additionalProperties !== undefined
        ? buildObjectSchema(schema, options, depth, context) : buildUntypedConstraintSchema(schema, options, depth, context);
    }
  }
  if (schema.not) result += `.refine((value: unknown) => !(${build(schema.not as ResolvedSchema)}).safeParse(value).success, { message: "Value matches prohibited schema" })`;
  return schema.nullable ? `${result}.nullable()` : result;
}

/** Validate applicable keywords even when a sibling schema does not declare type. */
function buildUntypedConstraintSchema(
  schema: ExtendedSchemaObject,
  options: ZodValidationOptions,
  depth: number,
  context?: GenerationContext
): string {
  let result = "z.unknown()";
  const check = (applies: string, validator: string): void => {
    result += `.refine((value: unknown) => !(${applies}) || (${validator}).safeParse(value).success)`;
  };
  if (schema.minLength !== undefined || schema.maxLength !== undefined || schema.pattern || schema.format) {
    check("typeof value === 'string'", buildStringSchema({ ...schema, type: "string" }, options));
  }
  if (schema.minimum !== undefined || schema.maximum !== undefined || schema.exclusiveMinimum !== undefined || schema.exclusiveMaximum !== undefined || schema.multipleOf !== undefined) {
    check("typeof value === 'number'", buildNumberSchema({ ...schema, type: "number" }, options));
  }
  if (schema.minProperties !== undefined || schema.maxProperties !== undefined) {
    check("typeof value === 'object' && value !== null && !Array.isArray(value)", appendObjectPropertyConstraints("z.record(z.string(), z.unknown())", schema));
  }
  if (schema.items || schema.minItems !== undefined || schema.maxItems !== undefined || schema.uniqueItems) {
    const arraySchema = { ...schema, type: "array" } as ExtendedSchemaObject;
    delete arraySchema.not; delete arraySchema.nullable;
    check("Array.isArray(value)", buildZodSchema(arraySchema, options, depth + 1, context));
  }
  return result;
}

/**
 * Helper function to format type names consistently
 */
// (formatTypeName removed - use formatTypeNameWithContext instead)

/**
 * Format a type name using optional generation context to apply prefix/suffix.
 */
function formatTypeNameWithContext(
  name: string,
  context?: GenerationContext
): string {
  return formatGeneratedName(name, context?.config.typePrefix, context?.config.typeSuffix);
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
    zodSchema += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
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
      zodSchema += `.describe(${JSON.stringify(customMessage)})`;
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

  if (schema.exclusiveMinimum !== undefined) {
    const bound = typeof schema.exclusiveMinimum === "number" ? schema.exclusiveMinimum : schema.exclusiveMinimum ? schema.minimum : undefined;
    if (bound !== undefined) zodSchema += `.gt(${bound})`;
  }
  if (schema.exclusiveMaximum !== undefined) {
    const bound = typeof schema.exclusiveMaximum === "number" ? schema.exclusiveMaximum : schema.exclusiveMaximum ? schema.maximum : undefined;
    if (bound !== undefined) zodSchema += `.lt(${bound})`;
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
  if (!schema.properties && !schema.required?.length) {
    const values = typeof schema.additionalProperties === "object"
      ? buildZodSchema(schema.additionalProperties as ResolvedSchema, options, depth + 1, context) : "z.unknown()";
    const base = schema.additionalProperties === false ? "z.object({}).strict()" : `z.record(z.string(), ${values})`;
    return appendObjectPropertyConstraints(base, schema);
  }

  const properties: string[] = [];
  const required = schema.required || [];
  for (const [propName, propSchema] of Object.entries(schema.properties ?? {})) {
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

      properties.push(`  ${propertyKey(propName)}: ${propZodSchema}`);


    }
  }

  for (const name of required) if (!schema.properties?.[name]) properties.push(`  ${propertyKey(name)}: z.unknown().refine((value: unknown) => value !== undefined, { message: "Required property" })`);
  const strictMode = schema.additionalProperties === true ? ".passthrough()"
    : typeof schema.additionalProperties === "object" ? `.catchall(${buildZodSchema(schema.additionalProperties as ResolvedSchema, options, depth + 1, context)})`
    : options.strictMode || schema.additionalProperties === false ? ".strict()" : ".passthrough()";
  const base = `z.object({\n${properties.join(",\n")}\n})${strictMode}`;
  return appendObjectPropertyConstraints(base, schema);
}

function appendObjectPropertyConstraints(base: string, schema: ExtendedSchemaObject): string {
  // Zod intersections may reconcile strict-object unrecognized-key issues against
  // sibling schemas. OpenAPI's explicit additionalProperties:false applies to
  // this schema's own declared properties, so check the original input first.
  const allowedKeys = JSON.stringify(Object.keys(schema.properties ?? {}));
  let result = schema.additionalProperties === false
    ? `z.unknown().refine((value: unknown) => value === null || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).every(key => ${allowedKeys}.includes(key)), { message: "Unexpected object property" }).pipe(${base})`
    : base;
  if (schema.minProperties !== undefined) result += `.refine((value: Record<string, unknown>) => Object.keys(value).length >= ${schema.minProperties}, { message: "Too few properties" })`;
  if (schema.maxProperties !== undefined) result += `.refine((value: Record<string, unknown>) => Object.keys(value).length <= ${schema.maxProperties}, { message: "Too many properties" })`;
  return result;
}
/**
 * Build Zod union/discriminatedUnion schema for oneOf
 */
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
function generateZodImports(_options: ZodValidationOptions): string {
  const imports = ["z"];



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
export const ${typeName}Schema: z.ZodType = ${zodSchema};

/**
 * Validate ${typeName} data with detailed error reporting
 */
export function validate${typeName}(data: unknown): { success: true; data: ${typeName} } | { success: false; errors: string[] } {
  const result = ${typeName}Schema.safeParse(data);

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

  return { success: true, data: result.data as ${typeName} };
}

/**
 * Parse ${typeName} data with exception on validation failure
 */
export function parse${typeName}(data: unknown): ${typeName} {
  return ${typeName}Schema.parse(data) as ${typeName};
}
${brandedType}${typeGuard}`;
}

/** Runtime helper names must be distinct across type/client exports and imported bindings. */
function chooseValidationErrorName(client: GeneratedApiClient, context: GenerationContext): string {
  const claimed = new Set(client.exports);
  for (const type of context.generatedTypes.values()) {
    claimed.add(type.name); for (const name of type.exports) claimed.add(name);
  }
  for (const generatedClient of context.generatedClients.values()) {
    claimed.add(generatedClient.name); for (const name of generatedClient.exports) claimed.add(name);
  }
  // Cover imported aliases and local bindings supplied by custom client generators.
  for (const identifier of client.content.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []) claimed.add(identifier);
  if (!claimed.has("ValidationError")) return "ValidationError";
  let name = "ResponseValidationError";
  let suffix = 0;
  while (claimed.has(name)) name = `ResponseValidationError${++suffix}`;
  return name;
}

/**
 * Generate validation middleware for API client
 */
function generateValidationMiddleware(
  _generatedClient: GeneratedApiClient,
  _context: GenerationContext,
  options: ZodValidationOptions,
  errorName: string
): string {
  // Ensure z/ZodType import is present in client content
  if (!_generatedClient.content.includes("from 'zod'")) {
    _generatedClient.content =
      `import { z } from 'zod';\nimport type { ZodType } from 'zod';\n` + _generatedClient.content;
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
    ? `throw new ${errorName}(result.error?.issues ?? [], data);`
    : "return data as T;";

  return `
/**
 * Validation middleware for API requests and responses
 */
export class ${errorName} extends Error {
  public issues: readonly z.core.$ZodIssue[];
  public data: unknown;
  constructor(issues: readonly z.core.$ZodIssue[], data: unknown) {
    const message = issues
      .map((iss) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
      .join('; ');
    super('Validation failed: ' + message);
    this.name = '${errorName}';
    this.issues = issues;
    this.data = data;
    Object.setPrototypeOf(this, ${errorName}.prototype);
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
    throw new ${errorName}(issues as readonly z.core.$ZodIssue[], data);
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
const validationSchemaIds = new WeakMap<object, number>();
let nextValidationSchemaId = 0;

export function memoizedValidation<T>(
  data: unknown,
  schema: ZodType<T>,
  cacheKey?: string,
  schemaVersion = "1.0"
): T {
  // Cache primitive inputs/results only. Caller-owned objects and stateful references
  // must be validated on every call rather than reusing mutable results.
  if (!cacheKey || (data !== null && typeof data === "object") || typeof data === "function" || typeof data === "symbol") {
    return schema.parse(data);
  }

  let schemaId = validationSchemaIds.get(schema);
  if (schemaId === undefined) { schemaId = ++nextValidationSchemaId; validationSchemaIds.set(schema, schemaId); }
  let identity: string;
  try { identity = JSON.stringify([cacheKey, schemaId, schemaVersion, typeof data, typeof data === "number" && Object.is(data, -0) ? "-0" : String(data)]); } catch { return schema.parse(data); }
  const cached = validationCache.get(identity);

  if (cached && cached.schemaVersion === schemaVersion) {
    return cached.result as T;
  }

  const result = schema.parse(data);
  if ((result !== null && typeof result === "object") || typeof result === "function" || typeof result === "symbol") return result;
  validationCache.set(identity, {
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
  schemaCaches = new WeakMap<GenerationContext, Map<string, string>>();
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
