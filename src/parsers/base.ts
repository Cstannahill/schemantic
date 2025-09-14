/**
 * Base parser interface and abstract implementation
 * Provides the foundation for all schema parsers in the sync-type system
 */

import { OpenAPISchema } from "../types/openapi";
import { ResolvedSchema, SchemaResolver } from "../types/schema";
import {
  TypeSyncConfig,
  GenerationContext,
  GeneratedType,
  GeneratedApiClient,
  TypeRegistry,
} from "../types/core";

/**
 * Base interface for all schema parsers
 */
export interface SchemaParser<T = OpenAPISchema> {
  /**
   * Parse a schema from various input sources
   */
  parse(input: SchemaInput): Promise<T>;

  /**
   * Validate the parsed schema
   */
  validate(schema: T): Promise<ValidationResult>;

  /**
   * Create a schema resolver for the parsed schema
   */
  createResolver(schema: T): SchemaResolver;

  /**
   * Get parser metadata
   */
  getMetadata(): ParserMetadata;
}

/**
 * Input sources for schema parsing
 */
export interface SchemaInput {
  url?: string;
  filePath?: string;
  data?: unknown;
  string?: string;
}

/**
 * Validation result for schema validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error information
 */
export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: "error" | "warning";
}

/**
 * Validation warning information
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  suggestion?: string;
}

/**
 * Parser metadata
 */
export interface ParserMetadata {
  name: string;
  version: string;
  supportedFormats: string[];
  supportedVersions: string[];
  description: string;
}

/**
 * Abstract base parser implementation
 */
export abstract class BaseSchemaParser<T = OpenAPISchema>
  implements SchemaParser<T>
{
  protected config: TypeSyncConfig;

  constructor(config: TypeSyncConfig) {
    this.config = config;
  }

  abstract parse(input: SchemaInput): Promise<T>;
  abstract validate(schema: T): Promise<ValidationResult>;
  abstract createResolver(schema: T): SchemaResolver;
  abstract getMetadata(): ParserMetadata;

  /**
   * Common utility method to resolve references
   */
  protected resolveReference(
    ref: string,
    schema: T
  ): ResolvedSchema | undefined {
    if (!ref.startsWith("#/")) {
      return undefined;
    }

    const path = ref.substring(2).split("/");
    return this.traverseSchema(schema, path);
  }

  /**
   * Traverse schema object using path segments
   */
  protected traverseSchema(
    schema: T,
    path: string[]
  ): ResolvedSchema | undefined {
    let current: unknown = schema;

    for (const segment of path) {
      if (
        typeof current === "object" &&
        current !== null &&
        segment in current
      ) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }

    return current as ResolvedSchema;
  }

  /**
   * Create a generation context from parsed schema
   */
  protected createGenerationContext(schema: T): GenerationContext {
    const resolvedSchemas = new Map<string, ResolvedSchema>();
    const generatedTypes = new Map<string, GeneratedType>();
    const generatedClients = new Map<string, GeneratedApiClient>();

    const schemaResolver = this.createResolver(schema);

    return {
      config: this.config,
      schema: schema as unknown as OpenAPISchema,
      resolvedSchemas,
      generatedTypes,
      generatedClients,
      typeRegistry: this.createTypeRegistry(),
      schemaResolver,
    };
  }

  /**
   * Create a type registry instance
   */
  private createTypeRegistry(): TypeRegistry {
    // This will be implemented in the core module
    return {
      registerType: (_name: string, _type: GeneratedType) => {
        /* no-op */
      },
      getType: (_name: string) => undefined,
      getAllTypes: () => [],
      getDependencies: (_name: string) => [],
      resolveDependencies: () => [],
    };
  }
}
