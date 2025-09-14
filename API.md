# API Reference

## Core Classes

### TypeSync

The main class for generating TypeScript types and API clients from OpenAPI schemas.

```typescript
import { TypeSync, TypeSyncConfig } from "type-sync";

const config: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./src/generated",
  generateTypes: true,
  generateApiClient: true,
};

const typeSync = new TypeSync(config);
```

#### Methods

##### `generate(): Promise<GenerationResult>`

Generates TypeScript types and API clients from the configured OpenAPI schema.

**Returns:** `Promise<GenerationResult>`

```typescript
const result = await typeSync.generate();

if (result.success) {
  console.log(`Generated ${result.generatedFiles.length} files`);
  console.log(`Types: ${result.statistics.totalTypes}`);
  console.log(`Endpoints: ${result.statistics.totalEndpoints}`);
}
```

##### `validate(): Promise<ValidationResult>`

Validates the OpenAPI schema without generating any files.

**Returns:** `Promise<ValidationResult>`

```typescript
const validation = await typeSync.validate();

if (validation.isValid) {
  console.log("Schema is valid");
} else {
  console.log("Validation errors:", validation.errors);
}
```

##### `getPluginManager(): PluginManager`

Returns the plugin manager instance for registering and managing plugins.

**Returns:** `PluginManager`

```typescript
const pluginManager = typeSync.getPluginManager();
pluginManager.registerPlugin(customPlugin);
```

##### `getConfig(): TypeSyncConfig`

Returns the current configuration.

**Returns:** `TypeSyncConfig`

### TypeSyncConfig

Configuration interface for the TypeSync class.

```typescript
interface TypeSyncConfig {
  // Input configuration
  schemaUrl?: string;
  schemaFile?: string;
  schemaData?: OpenAPISchema;

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
  generateBarrelExports: boolean;
}
```

## Parser Classes

### ParserFactory

Factory class for creating schema parsers.

```typescript
import { ParserFactory } from "type-sync";

// Create parser by type
const parser = ParserFactory.createParser("openapi", config);

// Auto-detect parser type
const autoParser = ParserFactory.autoCreateParser(input, config);
```

#### Methods

##### `createParser(type: ParserType, config: TypeSyncConfig): SchemaParser`

Creates a parser instance of the specified type.

**Parameters:**

- `type` - The parser type ('openapi', 'swagger', 'json-schema')
- `config` - TypeSync configuration

**Returns:** `SchemaParser`

##### `autoCreateParser(input: SchemaInput, config: TypeSyncConfig): SchemaParser`

Automatically detects the parser type and creates an appropriate instance.

**Parameters:**

- `input` - Schema input source
- `config` - TypeSync configuration

**Returns:** `SchemaParser`

##### `detectParserType(input: SchemaInput): ParserType`

Detects the appropriate parser type from the input.

**Parameters:**

- `input` - Schema input source

**Returns:** `ParserType`

### OpenAPIParser

Parser implementation for OpenAPI 3.0+ specifications.

```typescript
import { OpenAPIParser } from "type-sync";

const parser = new OpenAPIParser(config);
```

#### Methods

##### `parse(input: SchemaInput): Promise<OpenAPISchema>`

Parses schema from various input sources.

**Parameters:**

- `input` - Schema input source

**Returns:** `Promise<OpenAPISchema>`

##### `validate(schema: OpenAPISchema): Promise<ValidationResult>`

Validates the parsed schema.

**Parameters:**

- `schema` - OpenAPI schema to validate

**Returns:** `Promise<ValidationResult>`

##### `createResolver(schema: OpenAPISchema): SchemaResolver`

Creates a schema resolver for the parsed schema.

**Parameters:**

- `schema` - OpenAPI schema

**Returns:** `SchemaResolver`

## Generator Classes

### TypeGeneratorFactory

Factory class for creating type generators.

```typescript
import { TypeGeneratorFactory } from "type-sync";

// Create generators from config
const generators = TypeGeneratorFactory.createFromConfig(config);

// Generate type from schema
const generatedType = TypeGeneratorFactory.generateType(
  schema,
  context,
  generators
);
```

#### Methods

##### `createFromConfig(config: TypeSyncConfig): TypeGenerator[]`

Creates type generators based on configuration.

**Parameters:**

- `config` - TypeSync configuration

**Returns:** `TypeGenerator[]`

##### `generateType(schema: ResolvedSchema, context: GenerationContext, generators: TypeGenerator[]): GeneratedType | undefined`

Generates a TypeScript type from a schema using available generators.

**Parameters:**

- `schema` - Resolved schema
- `context` - Generation context
- `generators` - Available generators

**Returns:** `GeneratedType | undefined`

##### `getBestGenerator(schema: ResolvedSchema, generators: TypeGenerator[]): TypeGenerator | undefined`

Finds the best generator for a given schema.

**Parameters:**

- `schema` - Resolved schema
- `generators` - Available generators

**Returns:** `TypeGenerator | undefined`

### ObjectTypeGenerator

Generator for creating TypeScript interfaces from OpenAPI schema objects.

```typescript
import { ObjectTypeGenerator } from "type-sync";

const generator = new ObjectTypeGenerator(options);
```

### EnumTypeGenerator

Generator for creating TypeScript enums from OpenAPI schema enums.

```typescript
import { EnumTypeGenerator } from "type-sync";

const generator = new EnumTypeGenerator(options);
```

### ApiClientGenerator

Generator for creating TypeScript API client classes.

```typescript
import { ApiClientGenerator } from "type-sync";

const generator = new ApiClientGenerator(context);
const client = generator.generate(context);
// The client is exported via the generated index file and can be imported from './generated'
```

## Plugin System

### PluginManager

Manages plugin registration and execution.

```typescript
import { PluginManager } from "type-sync";

const pluginManager = new PluginManager();
```

#### Methods

##### `registerPlugin(plugin: TypeSyncPlugin): void`

Registers a plugin with the manager.

**Parameters:**

- `plugin` - Plugin to register

##### `enablePlugin(name: string): void`

Enables a registered plugin.

**Parameters:**

- `name` - Plugin name

##### `disablePlugin(name: string): void`

Disables a registered plugin.

**Parameters:**

- `name` - Plugin name

##### `executeBeforeGeneration(context: GenerationContext): Promise<void>`

Executes before generation hooks for all enabled plugins.

**Parameters:**

- `context` - Generation context

**Returns:** `Promise<void>`

##### `executeAfterGeneration(context: GenerationContext, result: GenerationResult): Promise<void>`

Executes after generation hooks for all enabled plugins.

**Parameters:**

- `context` - Generation context
- `result` - Generation result

**Returns:** `Promise<void>`

### PluginLoader

Loads plugins from various sources.

```typescript
import { PluginLoader } from "type-sync";

const loader = new PluginLoader();
```

#### Methods

##### `loadPluginFromFile(filePath: string): Promise<TypeSyncPlugin>`

Loads a plugin from a file.

**Parameters:**

- `filePath` - Path to plugin file

**Returns:** `Promise<TypeSyncPlugin>`

##### `loadPluginFromPackage(packageName: string): Promise<TypeSyncPlugin>`

Loads a plugin from an npm package.

**Parameters:**

- `packageName` - Package name

**Returns:** `Promise<TypeSyncPlugin>`

##### `loadPluginsFromDirectory(directoryPath: string): Promise<TypeSyncPlugin[]>`

Loads all plugins from a directory.

**Parameters:**

- `directoryPath` - Directory path

**Returns:** `Promise<TypeSyncPlugin[]>`

### TypeSyncPlugin

Plugin interface for extending TypeSync functionality.

```typescript
interface TypeSyncPlugin {
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
```

## Type Definitions

### GeneratedType

Represents a generated TypeScript type.

```typescript
interface GeneratedType {
  name: string;
  content: string;
  dependencies: string[];
  exports: string[];
  isInterface: boolean;
  isEnum: boolean;
  isUnion: boolean;
  sourceSchema: ResolvedSchema;
}
```

### GeneratedApiClient

Represents a generated API client.

```typescript
interface GeneratedApiClient {
  name: string;
  content: string;
  dependencies: string[];
  exports: string[];
  endpoints: GeneratedEndpoint[];
}
```

### GeneratedEndpoint

Represents a generated API endpoint.

```typescript
interface GeneratedEndpoint {
  operationId: string;
  method: string;
  path: string;
  parameters: GeneratedParameter[];
  requestBody?: GeneratedRequestBody;
  responses: GeneratedResponse[];
  returnType: string;
  functionName: string;
}
```

### GenerationResult

Result of the generation process.

```typescript
interface GenerationResult {
  success: boolean;
  generatedFiles: GeneratedFile[];
  errors: GenerationError[];
  warnings: GenerationWarning[];
  statistics: GenerationStatistics;
}
```

### GenerationContext

Context passed to plugins and generators.

```typescript
interface GenerationContext {
  config: TypeSyncConfig;
  schema: OpenAPISchema;
  resolvedSchemas: Map<string, ResolvedSchema>;
  generatedTypes: Map<string, GeneratedType>;
  generatedClients: Map<string, GeneratedApiClient>;
  typeRegistry: TypeRegistry;
  schemaResolver: SchemaResolver;
}
```

## Error Handling

### GenerationError

Represents an error during generation.

```typescript
interface GenerationError {
  code: string;
  message: string;
  source?: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
}
```

### GenerationWarning

Represents a warning during generation.

```typescript
interface GenerationWarning {
  code: string;
  message: string;
  source?: string;
  suggestion?: string;
}
```

## Utility Functions

### Built-in Plugins

```typescript
import { getBuiltinPlugins, getBuiltinPlugin } from "type-sync";

// Get all built-in plugins
const plugins = getBuiltinPlugins();

// Get specific built-in plugin
const jsdocPlugin = getBuiltinPlugin("jsdoc");
```

### Convenience Functions

```typescript
import {
  createParser,
  autoCreateParser,
  createGenerators,
  generateType,
} from "type-sync";

// Create parser
const parser = createParser("openapi", config);

// Auto-create parser
const autoParser = autoCreateParser(input, config);

// Create generators
const generators = createGenerators(config);

// Generate type
const type = generateType(schema, context, generators);
```
