/**
 * Core types for the schemantic package
 * These types define the internal structure and interfaces used throughout the system
 */

import { OpenAPISchema, OpenAPIInputDocument, OpenAPISchemaObject, OpenAPIRef } from "./openapi";
import { ResolvedSchema, SchemaResolver } from "./schema";

/**
 * Configuration for the type generation process
 */
export interface SchemanticConfig {
  // Input configuration
  schemaUrl?: string;
  schemaFile?: string;
  schemaData?: OpenAPIInputDocument;

  // Output configuration
  outputDir: string;
  outputFileName?: string;

  // Generation options
  generateTypes: boolean;
  generateApiClient: boolean;
  generateHooks?: boolean;
  generateQueries?: boolean;

  // TypeScript configuration
  useStrictTypes: boolean;
  useOptionalChaining: boolean;
  useNullishCoalescing: boolean;

  // Naming conventions
  namingConvention: "camelCase" | "snake_case" | "PascalCase";
  propertyNaming?: "camelCase" | "preserve";
  typePrefix?: string;
  typeSuffix?: string;

  // Customization
  customTypeMappings?: Record<string, string>;
  excludePaths?: string[];
  includePaths?: string[];
  excludeSchemas?: string[];
  includeSchemas?: string[];

  // Plugin configuration
  plugins?: PluginConfig[];

  // Advanced options
  preserveComments: boolean;
  generateIndexFile: boolean;
}

/** Public input may omit fields supplied by defaults. */
export type SchemanticOptions = Partial<SchemanticConfig>;
export type ResolvedSchemanticConfig = SchemanticConfig;

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Generated type information
 */
export interface GeneratedType {
  name: string;
  content: string;
  dependencies: string[];
  exports: string[];
  isInterface: boolean;
  isEnum: boolean;
  isUnion: boolean;
  sourceSchema: ResolvedSchema;
}

/**
 * Generated API client information
 */
export interface GeneratedApiClient {
  name: string;
  content: string;
  dependencies: string[];
  exports: string[];
  endpoints: GeneratedEndpoint[];
}

/**
 * Generated endpoint information
 */
export interface GeneratedEndpoint {
  operationId: string;
  method: string;
  path: string;
  parameters: GeneratedParameter[];
  requestBody?: GeneratedRequestBody;
  responses: GeneratedResponse[];
  returnType: string;
  functionName: string;
}

/**
 * Generated parameter information
 */
export interface GeneratedParameter {
  name: string;
  schema?: OpenAPISchemaObject | OpenAPIRef;
  variableName?: string;
  style?: string;
  explode?: boolean;
  type: string;
  isOptional: boolean;
  isRequired: boolean;
  location: "query" | "header" | "path" | "cookie";
  description?: string;
}

/**
 * Generated request body information
 */
export interface GeneratedRequestBody {
  type: string;
  isOptional: boolean;
  contentType?: string;
  description?: string;
  schema?: OpenAPISchemaObject | OpenAPIRef;
}

/**
 * Generated response information
 */
export interface GeneratedResponse {
  statusCode: string;
  type: string;
  isOptional: boolean;
  description?: string;
  contentType?: string;
  schema?: OpenAPISchemaObject | OpenAPIRef;
}

/**
 * Generation context passed to plugins and generators
 */
export interface GenerationContext {
  config: SchemanticConfig;
  schema: OpenAPISchema;
  resolvedSchemas: Map<string, ResolvedSchema>;
  generatedTypes: Map<string, GeneratedType>;
  generatedClients: Map<string, GeneratedApiClient>;
  typeRegistry: TypeRegistry;
  schemaResolver: SchemaResolver;
  projections?: Record<string, { request?: string; response?: string; binary?: string }>;
  wireSchema?: OpenAPISchema;
}

/**
 * Type registry for managing type dependencies and relationships
 */
export interface TypeRegistry {
  registerType(name: string, type: GeneratedType): void;
  getType(name: string): GeneratedType | undefined;
  getAllTypes(): GeneratedType[];
  getDependencies(name: string): string[];
  resolveDependencies(): string[];
}

// SchemaResolver is now imported from ./schema

/**
 * Generation result
 */
export interface GenerationResult {
  success: boolean;
  generatedFiles: GeneratedFile[];
  errors: GenerationError[];
  warnings: GenerationWarning[];
  statistics: GenerationStatistics;
}

/**
 * Generated file information
 */
export interface GeneratedFile {
  path: string;
  content: string;
  type: "type" | "client" | "hook" | "query" | "index" | "report";
  dependencies: string[];
  size: number;
}

/**
 * Generation error
 */
export interface GenerationError {
  code: string;
  message: string;
  source?: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
}

/**
 * Generation warning
 */
export interface GenerationWarning {
  code: string;
  message: string;
  source?: string;
  suggestion?: string;
}

/**
 * Generation statistics
 */
export interface GenerationStatistics {
  totalTypes: number;
  totalEndpoints: number;
  totalFiles: number;
  totalSize: number;
  generationTime: number;
  schemaSize: number;
}

/**
 * Plugin interface
 */
export interface SchemanticPlugin {
  name: string;
  version: string;
  description: string;

  // Lifecycle hooks
  beforeGeneration?(context: GenerationContext): Promise<void> | void;
  afterGeneration?(
    context: GenerationContext,
    result: GenerationResult
  ): Promise<void> | void;

  // Type generation hooks
  beforeTypeGeneration?(
    typeName: string,
    schema: ResolvedSchema,
    context: GenerationContext
  ): Promise<void> | void;
  afterTypeGeneration?(
    typeName: string,
    generatedType: GeneratedType,
    context: GenerationContext
  ): Promise<void> | void;

  // Client generation hooks
  beforeClientGeneration?(context: GenerationContext): Promise<void> | void;
  afterClientGeneration?(
    generatedClient: GeneratedApiClient,
    context: GenerationContext
  ): Promise<void> | void;

  // Schema transformation hooks
  transformSchema?(
    schema: ResolvedSchema,
    context: GenerationContext
  ): ResolvedSchema;

  // Custom generators
  customTypeGenerators?: Record<
    string,
    (schema: ResolvedSchema, context: GenerationContext) => GeneratedType
  >;
  customClientGenerators?: Record<
    string,
    (context: GenerationContext) => GeneratedApiClient
  >;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Partial<SchemanticConfig> = {
  outputDir: "./src/generated",
  generateTypes: true,
  generateApiClient: true,
  generateHooks: false,
  generateQueries: false,
  useStrictTypes: true,
  useOptionalChaining: true,
  useNullishCoalescing: true,
  namingConvention: "camelCase",
  propertyNaming: "camelCase",
  preserveComments: true,
  generateIndexFile: true,
};
