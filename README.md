# Type-Sync

[![npm version](https://badge.fury.io/js/@cstannahill%2Ftype-sync.svg)](https://badge.fury.io/js/@cstannahill%2Ftype-sync)
[![CI/CD](https://github.com/cstannahill/type-sync/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/cstannahill/type-sync/actions/workflows/ci-cd.yml)
[![npm downloads](https://img.shields.io/npm/dm/@cstannahill/type-sync.svg)](https://www.npmjs.com/package/@cstannahill/type-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.x-85EA2D?logo=swagger&logoColor=white)](https://swagger.io/specification/)

A fully typed, extensible, modular TypeScript type generator for OpenAPI schemas (great with FastAPI). Generate TypeScript types, API clients, and optional hooks with sensible defaults.

> **Status**: Production Ready 🚀 | **Maintenance**: Actively Maintained ✅ | **Support**: Community & Issues 💬

## Features

- 🔧 **Zero Configuration** - Works out of the box with FastAPI applications
- 🎯 **Fully Typed** - Generates comprehensive TypeScript types with no `any` types
- 🧩 **Modular Architecture** - Extensible plugin system with advanced features like performance monitoring, request deduplication, and branded types
- 🚀 **Fast & Efficient** - Optimized for large schemas and complex APIs
- 📦 **Multiple Outputs** - Types, API clients, React hooks, and more
- 🔍 **Schema Validation** - Built-in OpenAPI schema validation
- 🎨 **Customizable** - Flexible naming conventions and type mappings
- 📚 **Well Documented** - Comprehensive documentation and examples

## Installation

```bash
npm install type-sync
```

## Quick Start

### CLI Usage

Generate types and API client from your OpenAPI schema:

```bash
# From URL (recommended)
npx type-sync generate --url http://localhost:8000/openapi.json --output ./src/generated

# From file (local snapshot)
npx type-sync generate --file ./schema.json --output ./src/generated

# With React hooks
npx type-sync generate --url http://localhost:8000/openapi.json --output ./src/generated --hooks

# With custom options
npx type-sync generate \
  --url http://localhost:8000/openapi.json \
  --output ./src/generated \
  --naming camelCase \
  --prefix API \
  --suffix Type
```

### Where to get your OpenAPI schema

You can point Type-Sync at any reachable OpenAPI 3.x JSON. Common frameworks expose it at predictable URLs:

- FastAPI (default): http://localhost:8000/openapi.json
- ASP.NET Core (.NET): https://localhost:5001/swagger/v1/swagger.json

Grab a local snapshot if you prefer generating from a file:

```bash
# FastAPI
curl -s http://localhost:8000/openapi.json -o ./openapi-schema.json

# ASP.NET Core (.NET)
curl -k -s https://localhost:5001/swagger/v1/swagger.json -o ./openapi-schema.json

# Generate from the snapshot
npx type-sync generate --file ./openapi-schema.json --output ./src/generated --client --types
```

Notes:

- On .NET dev certs (HTTPS), use `-k` with curl to skip certificate verification locally.
- In ASP.NET Core, ensure Swagger is enabled in Development (AddSwaggerGen/UseSwagger) and the Swagger endpoint exposes `/swagger/v1/swagger.json`.

### Programmatic Usage

```typescript
import { TypeSync, TypeSyncConfig } from "type-sync";

const config: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./src/generated",
  generateTypes: true,
  generateApiClient: true,
  useStrictTypes: true,
  namingConvention: "camelCase",
};

const typeSync = new TypeSync(config);
const result = await typeSync.generate();

if (result.success) {
  console.log(`Generated ${result.generatedFiles.length} files`);
  console.log(`Types: ${result.statistics.totalTypes}`);
  console.log(`Endpoints: ${result.statistics.totalEndpoints}`);
}
```

## Configuration

### Basic Configuration

```typescript
const config: TypeSyncConfig = {
  // Input sources (choose one)
  schemaUrl: "http://localhost:8000/openapi.json",
  schemaFile: "./schema.json",
  schemaData: {
    /* OpenAPI schema object */
  },

  // Output configuration
  outputDir: "./src/generated",
  outputFileName: "api-client.ts",

  // Generation options
  generateTypes: true,
  generateApiClient: true,
  generateHooks: false, // Enable React hooks generation

  // Advanced options
  preserveComments: true,
  generateIndexFile: true,
  generateBarrelExports: true,

  // TypeScript configuration
  useStrictTypes: true,
  useOptionalChaining: true,
  useNullishCoalescing: true,

  // Naming conventions
  namingConvention: "camelCase", // 'camelCase' | 'snake_case' | 'PascalCase'
  // By default, TypeSync prefixes type names with "API". Customize if desired:
  typePrefix: "API",
  typeSuffix: "Type",

  // Customization
  customTypeMappings: {
    uuid: "string",
    datetime: "Date",
  },

  // Filtering
  excludePaths: ["/health", "/docs"],
  includePaths: ["/api/v1/*"],
  excludeSchemas: ["Error"],
  includeSchemas: ["User", "Product"],

  // Plugin configuration
  plugins: [
    { name: "jsdoc", enabled: true },
    { name: "validation", enabled: true },
  ],
};
```

### CLI Reference

#### Commands

```bash
# Generate types and API client
npx type-sync generate [source] [options]
npx type-sync gen [source] [options]

# Validate OpenAPI schema
npx type-sync validate [source] [options]
npx type-sync check [source] [options]

# Manage plugins
npx type-sync plugin list
npx type-sync plugin load <path>

# Initialize configuration
npx type-sync init [directory] [options]

# Get help
npx type-sync --help
npx type-sync generate --help
```

#### Generate Command Options

```bash
# Input options
--url, -u <url>              OpenAPI schema URL
--file, -f <file>            OpenAPI schema file path

# Output options
--output, -o <dir>           Output directory (default: ./src/generated)

# Generation options
--types                      Generate types only
--client                     Generate API client only
--hooks                      Generate React hooks factory
--watch                      Watch for changes and regenerate

# TypeScript options
--strict                     Use strict TypeScript types (default: true)
--naming <convention>        Naming convention (camelCase|snake_case|PascalCase)

# Customization
--prefix <prefix>            Type name prefix (default: API)
--suffix <suffix>            Type name suffix
--exclude-paths <paths>      Exclude paths (comma-separated)
--include-paths <paths>      Include paths (comma-separated)
--exclude-schemas <schemas>  Exclude schemas (comma-separated)
--include-schemas <schemas>  Include schemas (comma-separated)

# Plugin options
--plugins <plugins>          Enable plugins (comma-separated)
--config, -c <file>          Configuration file path

# Global options
--interactive, -i            Run in interactive mode
--verbose, -v                Verbose output
--quiet, -q                  Quiet output
--no-color                   Disable colored output
```

#### Validate Command Options

```bash
--url, -u <url>              OpenAPI schema URL
--file, -f <file>            OpenAPI schema file path
--fix                        Attempt to fix common issues
```

#### Init Command Options

```bash
--template, -t <template>    Configuration template (default)
--yes                        Skip interactive prompts
```

### CLI Examples

#### Basic Usage

```bash
# Generate from live FastAPI server
npx type-sync generate --url http://localhost:8000/openapi.json

# Generate from local schema file
npx type-sync generate --file ./openapi-schema.json

# Custom output directory
npx type-sync generate --url http://localhost:8000/openapi.json --output ./src/api

# Generate with React hooks
npx type-sync generate --url http://localhost:8000/openapi.json --hooks

# Interactive mode (guided setup)
npx type-sync generate --interactive
```

#### Advanced Usage

```bash
# Custom naming and prefixes
npx type-sync generate \
  --url http://localhost:8000/openapi.json \
  --naming PascalCase \
  --prefix "MyAPI" \
  --suffix "DTO"

# Filter paths and schemas
npx type-sync generate \
  --url http://localhost:8000/openapi.json \
  --include-paths "/api/v1/*,/auth/*" \
  --exclude-paths "/health,/docs" \
  --exclude-schemas "Error,ValidationError"

# Enable plugins
npx type-sync generate \
  --url http://localhost:8000/openapi.json \
  --plugins jsdoc,validation,zod-validation

# Use configuration file
npx type-sync generate --config ./typesync.config.json

# Watch mode for development
npx type-sync generate --url http://localhost:8000/openapi.json --watch

# Generate specific outputs
npx type-sync generate --url http://localhost:8000/openapi.json --types --client
npx type-sync generate --url http://localhost:8000/openapi.json --hooks
```

#### Validation

```bash
# Validate schema
npx type-sync validate --url http://localhost:8000/openapi.json

# Validate local file
npx type-sync validate --file ./openapi-schema.json

# Validate with auto-fix attempts
npx type-sync validate --file ./openapi-schema.json --fix
```

#### Configuration Management

```bash
# Initialize new project configuration
npx type-sync init

# Initialize with default settings
npx type-sync init --yes

# Initialize in specific directory
npx type-sync init ./my-project

# Initialize with template
npx type-sync init --template react
```

#### Plugin Management

```bash
# List available plugins
npx type-sync plugin list

# Load custom plugin
npx type-sync plugin load ./my-custom-plugin.js
npx type-sync plugin load @my-org/typesync-plugin
```

## Generated Output

### Types

```typescript
// Generated from OpenAPI schema
export interface APIUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface APICreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface APIUpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export enum APIUserRole {
  ADMIN = "admin",
  USER = "user",
  MODERATOR = "moderator",
}
```

### API Client

### React Hooks (optional)

Enable hook generation with `--hooks` (CLI) or `generateHooks: true` (config). A `hooks.ts` file will export `createApiHooks(client)` which returns per-endpoint hooks.

Example:

```typescript
import { ECommerceApiClient, createApiHooks } from "./src/generated";

const client = new ECommerceApiClient({ baseUrl: "http://localhost:8000" });
const { useGetProductsProductsGetQuery, useCreateOrderOrdersPostMutation } =
  createApiHooks(client);

function ProductsList() {
  const { data, loading, error, refetch } = useGetProductsProductsGetQuery({
    query: { page: 1, size: 20 },
  });
  // ... render
}
```

Notes:

- Hooks mirror the client method signatures: path params, query params, optional body (for mutations), then `RequestInit` as the last arg.
- The generated `index.ts` re-exports `createApiHooks` when hooks are enabled.

```typescript
// Actual name is derived from your API title; example below shows a generic name.
export class MyApiApiClient {
  private baseUrl: string;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  async getUsers(): Promise<APIUser[]> {
    const url = new URL(`${this.baseUrl}/users`);
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...this.config.headers,
      },
    });

    if (!response.ok) {
      throw new ApiClientError(
        `Request failed: ${response.status} ${response.statusText}`,
        response.status,
        response
      );
    }

    return response.json();
  }

  async createUser(body: APICreateUserRequest): Promise<APIUser> {
    const url = new URL(`${this.baseUrl}/users`);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        ...this.config.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ApiClientError(
        `Request failed: ${response.status} ${response.statusText}`,
        response.status,
        response
      );
    }

    return response.json();
  }
}
```

## Plugin System

Type-Sync includes a powerful plugin system for extending functionality:

### Built-in Plugins

#### Basic Plugins

- **jsdoc** - Adds JSDoc comments to generated types and methods
- **validation** - Adds validation decorators for class-validator
- **react-hooks** - Generates React hooks for API endpoints
- **strict-mode** - Adds TypeScript strict mode enhancements

#### Advanced Plugins

- **zod-validation** - Generates Zod schemas for runtime validation with type-safe pipelines, performance-optimized caching, and runtime type guards
- **performance-monitoring** - Implements sophisticated performance tracking with request timing analysis, bundle size optimization, and memory usage profiling
- **request-deduplication** - Intelligent request deduplication with content-based hashing, cache invalidation strategies, and stale-while-revalidate patterns
- **branded-types** - Creates branded types for enhanced compile-time safety, phantom type parameters for state management, and discriminated unions with runtime guards

### Using Plugins

```typescript
// Enable plugins via configuration
const config: TypeSyncConfig = {
  // ... other config
  plugins: [
    { name: 'jsdoc', enabled: true },
    { name: 'validation', enabled: true },
    { name: 'zod-validation', enabled: true },
  ],
};

// Or via CLI
npx type-sync generate --plugins jsdoc,validation,zod-validation
```

### Creating Custom Plugins

```typescript
import { TypeSyncPlugin, GenerationContext, GeneratedType } from "type-sync";

const customPlugin: TypeSyncPlugin = {
  name: "custom-plugin",
  version: "1.0.0",
  description: "Custom plugin for special transformations",

  beforeTypeGeneration: async (
    typeName: string,
    schema: any,
    context: GenerationContext
  ) => {
    // Transform schema before generation
    console.log(`Generating type: ${typeName}`);
  },

  afterTypeGeneration: async (
    typeName: string,
    generatedType: GeneratedType,
    context: GenerationContext
  ) => {
    // Modify generated type
    generatedType.content = `// Custom comment\n${generatedType.content}`;
  },

  transformSchema: (schema: any, context: GenerationContext) => {
    // Transform schema
    return schema;
  },

  customTypeGenerators: {
    "custom-type": (schema: any, context: GenerationContext) => {
      // Custom type generator
      return {
        name: "CustomType",
        content: "export type CustomType = string;",
        dependencies: [],
        exports: ["CustomType"],
        isInterface: false,
        isEnum: false,
        isUnion: false,
        sourceSchema: schema,
      };
    },
  },
};
```

📚 **[Complete Plugin Development Guide](./docs/PLUGIN_DEVELOPMENT.md)** - Learn how to create custom plugins

📖 **[Plugin API Reference](./docs/PLUGINS.md)** - Built-in plugins and usage examples

## FastAPI Integration

### Basic FastAPI Setup

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="My API",
    description="API description",
    version="1.0.0",
)

class User(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    created_at: str
    updated_at: str

class CreateUserRequest(BaseModel):
    email: str
    first_name: str
    last_name: str

@app.get("/users", response_model=List[User])
async def get_users():
    # Your implementation
    pass

@app.post("/users", response_model=User)
async def create_user(user: CreateUserRequest):
    # Your implementation
    pass
```

### Generate Types

```bash
# Start your FastAPI server
uvicorn main:app --reload

# Generate types
npx type-sync generate --url http://localhost:8000/openapi.json --output ./src/generated
```

## Advanced Usage

### Custom Type Mappings

```typescript
const config: TypeSyncConfig = {
  // ... other config
  customTypeMappings: {
    uuid: "string",
    datetime: "Date",
    decimal: "number",
    email: "string",
  },
};
```

### Path and Schema Filtering

```typescript
const config: TypeSyncConfig = {
  // ... other config
  excludePaths: ["/health", "/docs", "/redoc"],
  includePaths: ["/api/v1/*"],
  excludeSchemas: ["Error", "ValidationError"],
  includeSchemas: ["User", "Product", "Order"],
};
```

### Configuration Files

Create a `type-sync.config.json` file:

```json
{
  "schemaUrl": "http://localhost:8000/openapi.json",
  "outputDir": "./generated",
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

Use with CLI:

```bash
npx type-sync generate --config type-sync.config.json
```

## Validation

Validate your OpenAPI schema before generation:

```bash
# Validate schema
npx type-sync validate --url http://localhost:8000/openapi.json

# Validate with verbose output
npx type-sync validate --file schema.json --verbose
```

## Examples

### React Application

```typescript
// Import from the generated index barrel
import { MyApiApiClient } from "./generated";
import type { APIUser } from "./generated";

const apiClient = new MyApiApiClient({
  baseUrl: "http://localhost:8000",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Use in React component
const UsersPage = () => {
  const [users, setUsers] = useState<APIUser[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await apiClient.getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>
          {user.firstName} {user.lastName} - {user.email}
        </div>
      ))}
    </div>
  );
};
```

### Node.js Application

```typescript
import { MyApiApiClient } from "./generated";

const apiClient = new MyApiApiClient({
  baseUrl: "http://localhost:8000",
});

// Use in Node.js application
const main = async () => {
  try {
    const users = await apiClient.getUsers();
    console.log("Users:", users);

    const newUser = await apiClient.createUser({
      email: "user@example.com",
      firstName: "John",
      lastName: "Doe",
    });
    console.log("Created user:", newUser);
  } catch (error) {
    console.error("API error:", error);
  }
};

main();
```

## Tutorials

🚀 **[Complete FastAPI Tutorial](./docs/FASTAPI_TUTORIAL.md)** - Build a full-stack e-commerce app with FastAPI, Type-Sync, and React. Includes authentication, database models, type-safe API client, and React hooks.

## Contributing

We welcome contributions! Here's how you can help:

### 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/Cstannahill/type-sync/issues/new) with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node.js version, OS, etc.)

### 💡 Feature Requests

Have an idea? [Start a discussion](https://github.com/Cstannahill/type-sync/discussions) or [open an issue](https://github.com/Cstannahill/type-sync/issues/new)!

### 🔧 Development Setup

```bash
# Clone the repository
git clone https://github.com/Cstannahill/type-sync.git
cd type-sync

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

### 🧪 Testing

- Write tests for new features
- Ensure all tests pass: `npm test`
- Check test coverage: `npm run test:coverage`
- Test with real FastAPI applications in `local-test/`

### 📝 Documentation

- Update README.md for new features
- Add examples to documentation
- Update API documentation in `docs/`

### 🚀 Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests and documentation
5. Ensure all checks pass
6. Commit with clear messages
7. Push and create a Pull Request

## Support & Community

- 📖 **[Documentation](./docs/)** - Comprehensive guides and API reference
- 🐛 **[Issue Tracker](https://github.com/Cstannahill/type-sync/issues)** - Bug reports and feature requests
- 💬 **[Discussions](https://github.com/Cstannahill/type-sync/discussions)** - Community help and ideas
- � **[Plugin Development](./docs/PLUGIN_DEVELOPMENT.md)** - Create custom generators
- 📚 **[FastAPI Tutorial](./docs/FASTAPI_TUTORIAL.md)** - Complete integration guide

### Getting Help

1. Check the [documentation](./docs/) first
2. Search [existing issues](https://github.com/Cstannahill/type-sync/issues)
3. Ask in [discussions](https://github.com/Cstannahill/type-sync/discussions)
4. Create a new issue with detailed information

## Roadmap

- [ ] Support for OpenAPI 3.1 features
- [ ] GraphQL schema support
- [ ] Additional framework integrations (Express, NestJS)
- [ ] VS Code extension
- [ ] Enhanced React Query integration
- [ ] Performance optimizations for large schemas

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.
