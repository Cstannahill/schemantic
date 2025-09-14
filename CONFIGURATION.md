# Configuration Guide

This guide explains all configuration options available in Type-Sync.

## Configuration Sources

Type-Sync can be configured through multiple sources:

1. **Command Line Arguments** - Highest priority
2. **Configuration Files** - Medium priority
3. **Default Values** - Lowest priority

## Configuration File Formats

### JSON Configuration

Create a `type-sync.config.json` file:

```json
{
  "schemaUrl": "http://localhost:8000/openapi.json",
  "outputDir": "./src/generated",
  "generateTypes": true,
  "generateApiClient": true,
  "useStrictTypes": true,
  "namingConvention": "camelCase",
  "plugins": [
    { "name": "jsdoc", "enabled": true },
    { "name": "validation", "enabled": true }
  ]
}
```

### JavaScript Configuration

Create a `type-sync.config.js` file:

```javascript
module.exports = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./src/generated",
  generateTypes: true,
  generateApiClient: true,
  useStrictTypes: true,
  namingConvention: "camelCase",
  plugins: [
    { name: "jsdoc", enabled: true },
    { name: "validation", enabled: true },
  ],
};
```

### TypeScript Configuration

Create a `type-sync.config.ts` file:

```typescript
import { TypeSyncConfig } from "type-sync";

const config: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./src/generated",
  generateTypes: true,
  generateApiClient: true,
  useStrictTypes: true,
  namingConvention: "camelCase",
  plugins: [
    { name: "jsdoc", enabled: true },
    { name: "validation", enabled: true },
  ],
};

export default config;
```

## Configuration Options

### Input Configuration

#### `schemaUrl`

URL to the OpenAPI schema endpoint.

```typescript
schemaUrl: "http://localhost:8000/openapi.json";
```

Common framework endpoints:

- FastAPI (default): `http://localhost:8000/openapi.json`
- ASP.NET Core (.NET): `https://localhost:5001/swagger/v1/swagger.json`

Examples to fetch a local snapshot:

```bash
# FastAPI
curl -s http://localhost:8000/openapi.json -o ./openapi-schema.json

# ASP.NET Core (.NET) — dev certs
curl -k -s https://localhost:5001/swagger/v1/swagger.json -o ./openapi-schema.json

# Generate from file
npx type-sync generate --file ./openapi-schema.json --output ./src/generated --client --types
```

#### `schemaFile`

Path to a local OpenAPI schema file.

```typescript
schemaFile: "./schema.json";
```

#### `schemaData`

OpenAPI schema object (for programmatic usage).

```typescript
schemaData: {
  openapi: '3.0.0',
  info: { title: 'My API', version: '1.0.0' },
  paths: { /* ... */ }
}
```

### Output Configuration

#### `outputDir`

Directory where generated files will be saved.

```typescript
outputDir: "./src/generated";
```

#### `outputFileName`

Custom filename for the generated API client.

```typescript
outputFileName: "api-client.ts";
```

### Generation Options

#### `generateTypes`

Whether to generate TypeScript types.

```typescript
generateTypes: true;
```

#### `generateApiClient`

Whether to generate API client.

```typescript
generateApiClient: true;
```

#### `generateHooks`

Whether to generate React hooks factory.

```typescript
generateHooks: false;
```

When enabled, generates `hooks.ts` with a `createApiHooks(client)` function that returns query and mutation hooks for each endpoint. The hooks follow React patterns:

- Query hooks (GET methods): `useXxxQuery` with automatic fetching
- Mutation hooks (POST/PUT/PATCH/DELETE): `useXxxMutation` with manual trigger

Example usage:

```typescript
import { ECommerceApiClient, createApiHooks } from "./generated";

const client = new ECommerceApiClient({ baseUrl: "http://localhost:8000" });
const { useGetUsersUsersGetQuery, useCreateUserUsersPostMutation } =
  createApiHooks(client);

function UsersList() {
  const { data, loading, error, refetch } = useGetUsersUsersGetQuery();
  const { mutate: createUser } = useCreateUserUsersPostMutation();
  // ... component logic
}
```

#### `generateQueries`

Whether to generate query builders.

```typescript
generateQueries: false;
```

### TypeScript Configuration

#### `useStrictTypes`

Whether to use strict TypeScript types.

```typescript
useStrictTypes: true;
```

#### `useOptionalChaining`

Whether to use optional chaining (`?.`).

```typescript
useOptionalChaining: true;
```

#### `useNullishCoalescing`

Whether to use nullish coalescing (`??`).

```typescript
useNullishCoalescing: true;
```

### Naming Conventions

#### `namingConvention`

Naming convention for generated types and methods.

```typescript
namingConvention: "camelCase"; // 'camelCase' | 'snake_case' | 'PascalCase'
```

Examples:

- `camelCase`: `getUser`, `createUser`, `userId`
- `snake_case`: `get_user`, `create_user`, `user_id`
- `PascalCase`: `GetUser`, `CreateUser`, `UserId`

#### `typePrefix`

Prefix to add to generated type names.

```typescript
typePrefix: "Api";
```

Default prefix is `API`, producing names like `APIUser`, `APIProduct`. Customize if desired.

#### `typeSuffix`

Suffix to add to generated type names.

```typescript
typeSuffix: "Type";
```

This will generate types like `UserType`, `ProductType`, etc.

### Customization

#### `customTypeMappings`

Custom mappings for OpenAPI schema types to TypeScript types.

```typescript
customTypeMappings: {
  'uuid': 'string',
  'datetime': 'Date',
  'decimal': 'number',
  'email': 'string',
  'password': 'string'
}
```

#### `excludePaths`

Paths to exclude from API client generation.

```typescript
excludePaths: ["/health", "/docs", "/redoc"];
```

#### `includePaths`

Paths to include in API client generation (all others will be excluded).

```typescript
includePaths: ["/api/v1/*"];
```

#### `excludeSchemas`

Schema names to exclude from type generation.

```typescript
excludeSchemas: ["Error", "ValidationError", "InternalError"];
```

#### `includeSchemas`

Schema names to include in type generation (all others will be excluded).

```typescript
includeSchemas: ["User", "Product", "Order"];
```

### Plugin Configuration

#### `plugins`

Array of plugin configurations.

```typescript
plugins: [
  { name: "jsdoc", enabled: true },
  { name: "validation", enabled: true },
  { name: "react-hooks", enabled: false },
  { name: "custom-plugin", enabled: true, options: { debug: true } },
];
```

Plugin configuration options:

- `name`: Plugin name (required)
- `enabled`: Whether the plugin is enabled (required)
- `options`: Plugin-specific options (optional)

### Advanced Options

#### `preserveComments`

Whether to preserve comments from the OpenAPI schema.

```typescript
preserveComments: true;
```

#### `generateIndexFile`

Whether to generate an index file that exports all generated types.

```typescript
generateIndexFile: true;
```

#### `generateBarrelExports`

Whether to generate barrel export files.

```typescript
generateBarrelExports: true;
```

## Environment Variables

You can use environment variables for configuration:

```bash
export TYPE_SYNC_SCHEMA_URL="http://localhost:8000/openapi.json"
export TYPE_SYNC_OUTPUT_DIR="./generated"
export TYPE_SYNC_NAMING_CONVENTION="camelCase"
```

Access in configuration:

```typescript
const config: TypeSyncConfig = {
  schemaUrl: process.env.TYPE_SYNC_SCHEMA_URL,
  outputDir: process.env.TYPE_SYNC_OUTPUT_DIR || "./generated",
  namingConvention:
    (process.env.TYPE_SYNC_NAMING_CONVENTION as any) || "camelCase",
};
```

## CLI Configuration

### Global Options

```bash
--verbose, -v                # Verbose output
--quiet, -q                  # Quiet output
--no-color                   # Disable colored output
--config <file>              # Configuration file path
```

### Input Options

```bash
--url, -u <url>              # OpenAPI schema URL
--file, -f <file>            # OpenAPI schema file path
```

### Output Options

```bash
--output, -o <dir>           # Output directory
```

### Generation Options

```bash
--types                      # Generate types only
--client                     # Generate API client only
--hooks                      # Generate React hooks factory
```

### TypeScript Options

```bash
--strict                     # Use strict TypeScript types
--naming <convention>        # Naming convention
```

### Customization Options

```bash
--prefix <prefix>            # Type name prefix
--suffix <suffix>            # Type name suffix
--exclude-paths <paths>      # Exclude paths (comma-separated)
--include-paths <paths>      # Include paths (comma-separated)
--exclude-schemas <schemas>  # Exclude schemas (comma-separated)
--include-schemas <schemas>  # Include schemas (comma-separated)
```

### Plugin Options

```bash
--plugins <plugins>          # Enable plugins (comma-separated)
```

## Configuration Examples

### Basic Configuration

```typescript
const basicConfig: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./generated",
  generateTypes: true,
  generateApiClient: true,
};
```

### Advanced Configuration

```typescript
const advancedConfig: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./src/generated",
  outputFileName: "api-client.ts",

  generateTypes: true,
  generateApiClient: true,
  generateHooks: true,

  useStrictTypes: true,
  useOptionalChaining: true,
  useNullishCoalescing: true,

  namingConvention: "camelCase",
  typePrefix: "Api",
  typeSuffix: "Type",

  customTypeMappings: {
    uuid: "string",
    datetime: "Date",
    decimal: "number",
  },

  excludePaths: ["/health", "/docs", "/redoc"],
  includePaths: ["/api/v1/*"],

  excludeSchemas: ["Error", "ValidationError"],
  includeSchemas: ["User", "Product", "Order"],

  plugins: [
    { name: "jsdoc", enabled: true },
    { name: "validation", enabled: true },
    { name: "react-hooks", enabled: true },
  ],

  preserveComments: true,
  generateIndexFile: true,
  generateBarrelExports: true,
};
```

### FastAPI Specific Configuration

```typescript
const fastApiConfig: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./generated",

  generateTypes: true,
  generateApiClient: true,

  useStrictTypes: true,
  namingConvention: "camelCase",

  customTypeMappings: {
    uuid: "string",
    datetime: "string",
    date: "string",
    time: "string",
    email: "string",
    url: "string",
    password: "string",
  },

  excludePaths: ["/docs", "/redoc", "/openapi.json"],

  plugins: [
    { name: "jsdoc", enabled: true },
    { name: "validation", enabled: true },
  ],
};
```

### React Application Configuration

```typescript
const reactConfig: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./src/api",

  generateTypes: true,
  generateApiClient: true,
  generateHooks: true,

  useStrictTypes: true,
  namingConvention: "camelCase",

  plugins: [
    { name: "jsdoc", enabled: true },
    { name: "react-hooks", enabled: true },
    { name: "validation", enabled: true },
  ],

  generateIndexFile: true,
};
```

### Node.js Application Configuration

```typescript
const nodeConfig: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./lib/api",

  generateTypes: true,
  generateApiClient: true,

  useStrictTypes: true,
  namingConvention: "camelCase",

  plugins: [
    { name: "jsdoc", enabled: true },
    { name: "validation", enabled: true },
  ],

  generateIndexFile: true,
};
```

## Configuration Validation

Type-Sync validates your configuration and will throw errors for:

- Missing required fields
- Invalid values
- Conflicting options
- Plugin configuration errors

Example validation errors:

```typescript
// Error: Missing required field
const invalidConfig = {
  // Missing outputDir
  schemaUrl: "http://localhost:8000/openapi.json",
};

// Error: Invalid naming convention
const invalidNamingConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./generated",
  namingConvention: "invalid", // Must be 'camelCase', 'snake_case', or 'PascalCase'
};

// Error: Conflicting options
const conflictingConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./generated",
  excludePaths: ["/api/*"],
  includePaths: ["/api/v1/*"], // This conflicts with excludePaths
};
```

## Configuration Inheritance

You can extend configurations:

```typescript
const baseConfig: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./generated",
  generateTypes: true,
  generateApiClient: true,
  useStrictTypes: true,
  namingConvention: "camelCase",
};

const developmentConfig: TypeSyncConfig = {
  ...baseConfig,
  plugins: [
    { name: "jsdoc", enabled: true },
    { name: "validation", enabled: true },
  ],
};

const productionConfig: TypeSyncConfig = {
  ...baseConfig,
  outputDir: "./dist/api",
  plugins: [{ name: "jsdoc", enabled: true }],
};
```

## Configuration Tips

### 1. Use Configuration Files

For complex configurations, use configuration files instead of CLI arguments:

```bash
# Instead of long CLI command
npx type-sync generate --url http://localhost:8000/openapi.json --output ./generated --naming camelCase --plugins jsdoc,validation

# Use configuration file
npx type-sync generate --config type-sync.config.json
```

### 2. Environment-Specific Configurations

Create different configurations for different environments:

```typescript
// config/development.ts
export const developmentConfig: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./src/generated",
  plugins: [
    { name: "jsdoc", enabled: true },
    { name: "validation", enabled: true },
  ],
};

// config/production.ts
export const productionConfig: TypeSyncConfig = {
  schemaUrl: "https://api.example.com/openapi.json",
  outputDir: "./dist/api",
  plugins: [{ name: "jsdoc", enabled: true }],
};
```

### 3. Plugin Configuration

Configure plugins with options:

```typescript
plugins: [
  {
    name: "validation",
    enabled: true,
    options: {
      strict: true,
      addImports: true,
    },
  },
  {
    name: "react-hooks",
    enabled: true,
    options: {
      useReactQuery: true,
      generateMutations: true,
    },
  },
];
```

### 4. Path Filtering

Use path filtering to control what gets generated:

```typescript
// Only generate API v1 endpoints
includePaths: ['/api/v1/*'],

// Exclude documentation endpoints
excludePaths: ['/docs', '/redoc', '/openapi.json'],

// Only generate specific schemas
includeSchemas: ['User', 'Product', 'Order'],
```

### 5. Custom Type Mappings

Map OpenAPI types to your preferred TypeScript types:

```typescript
customTypeMappings: {
  'uuid': 'string',           // UUID to string
  'datetime': 'Date',         // DateTime to Date
  'decimal': 'number',        // Decimal to number
  'email': 'string',          // Email to string
  'password': 'string',       // Password to string
  'binary': 'Buffer',         // Binary to Buffer
  'byte': 'string',           // Byte to string (base64)
};
```
