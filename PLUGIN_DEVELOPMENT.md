# Plugin Development Guide

This guide explains how to create custom plugins for Type-Sync to extend its functionality.

## Overview

Type-Sync's plugin system allows you to:

- Transform OpenAPI schemas before processing
- Customize type generation logic
- Add additional generators (e.g., validation schemas, documentation)
- Modify generated code after creation
- Add new CLI commands and options

## Plugin Interface

Every plugin must implement the `TypeSyncPlugin` interface:

```typescript
interface TypeSyncPlugin {
  name: string;
  version: string;
  description: string;

  // Optional lifecycle hooks
  beforeSchemaLoad?: (context: GenerationContext) => Promise<void>;
  afterSchemaLoad?: (
    schema: OpenAPIV3.Document,
    context: GenerationContext
  ) => Promise<void>;
  beforeTypeGeneration?: (
    typeName: string,
    schema: any,
    context: GenerationContext
  ) => Promise<void>;
  afterTypeGeneration?: (
    typeName: string,
    generatedType: GeneratedType,
    context: GenerationContext
  ) => Promise<void>;
  beforeClientGeneration?: (context: GenerationContext) => Promise<void>;
  afterClientGeneration?: (
    generatedClient: GeneratedClient,
    context: GenerationContext
  ) => Promise<void>;
  beforeOutput?: (
    files: GeneratedFile[],
    context: GenerationContext
  ) => Promise<void>;
  afterOutput?: (
    files: GeneratedFile[],
    context: GenerationContext
  ) => Promise<void>;

  // Optional transformers
  transformSchema?: (
    schema: OpenAPIV3.Document,
    context: GenerationContext
  ) => OpenAPIV3.Document;
  transformType?: (
    generatedType: GeneratedType,
    context: GenerationContext
  ) => GeneratedType;
  transformClient?: (
    generatedClient: GeneratedClient,
    context: GenerationContext
  ) => GeneratedClient;

  // Optional custom generators
  customTypeGenerators?: { [key: string]: TypeGenerator };
  customOutputGenerators?: OutputGenerator[];

  // Optional CLI extensions
  cliCommands?: CliCommand[];
  cliOptions?: CliOption[];
}
```

## Core Types

### GenerationContext

```typescript
interface GenerationContext {
  config: TypeSyncConfig;
  schema: OpenAPIV3.Document;
  outputDir: string;
  logger: Logger;
  utilities: PluginUtilities;
}
```

### GeneratedType

```typescript
interface GeneratedType {
  name: string;
  content: string;
  dependencies: string[];
  exports: string[];
  isInterface: boolean;
  isEnum: boolean;
  isUnion: boolean;
  sourceSchema: any;
}
```

### GeneratedClient

```typescript
interface GeneratedClient {
  className: string;
  content: string;
  methods: GeneratedMethod[];
  dependencies: string[];
  exports: string[];
}
```

### GeneratedFile

```typescript
interface GeneratedFile {
  path: string;
  content: string;
  type: "types" | "client" | "hooks" | "other";
}
```

## Creating a Basic Plugin

### 1. Simple Transform Plugin

```typescript
import { TypeSyncPlugin, GenerationContext, GeneratedType } from "type-sync";

const addCommentsPlugin: TypeSyncPlugin = {
  name: "add-comments",
  version: "1.0.0",
  description: "Adds helpful comments to generated types",

  afterTypeGeneration: async (
    typeName: string,
    generatedType: GeneratedType,
    context: GenerationContext
  ) => {
    // Add a comment at the top of each generated type
    const comment = `/**\n * Generated type: ${typeName}\n * Source: ${context.schema.info.title}\n */\n`;
    generatedType.content = comment + generatedType.content;
  },
};

export default addCommentsPlugin;
```

### 2. Schema Transform Plugin

```typescript
import { TypeSyncPlugin, GenerationContext } from "type-sync";
import { OpenAPIV3 } from "openapi-types";

const schemaTransformPlugin: TypeSyncPlugin = {
  name: "schema-transformer",
  version: "1.0.0",
  description: "Transforms schema before processing",

  transformSchema: (
    schema: OpenAPIV3.Document,
    context: GenerationContext
  ): OpenAPIV3.Document => {
    // Example: Add custom properties to all schemas
    if (schema.components?.schemas) {
      Object.values(schema.components.schemas).forEach((schemaObj: any) => {
        if (schemaObj.type === "object" && schemaObj.properties) {
          // Add a metadata field to all objects
          schemaObj.properties._metadata = {
            type: "object",
            description: "Metadata added by plugin",
            properties: {
              generatedAt: { type: "string", format: "date-time" },
              version: { type: "string" },
            },
          };
        }
      });
    }

    return schema;
  },
};

export default schemaTransformPlugin;
```

### 3. Custom Type Generator Plugin

```typescript
import { TypeSyncPlugin, GenerationContext, TypeGenerator } from "type-sync";

const customGeneratorPlugin: TypeSyncPlugin = {
  name: "validation-generator",
  version: "1.0.0",
  description: "Generates validation schemas alongside types",

  customTypeGenerators: {
    "validation-schema": (schema: any, context: GenerationContext) => {
      const typeName = schema.title || "UnknownType";
      const validationName = `${typeName}ValidationSchema`;

      // Generate Zod validation schema
      let validationContent = `export const ${validationName} = z.object({\n`;

      if (schema.properties) {
        Object.entries(schema.properties).forEach(
          ([propName, propSchema]: [string, any]) => {
            const zodType = mapOpenAPIToZod(propSchema);
            const isRequired = schema.required?.includes(propName);
            validationContent += `  ${propName}: ${zodType}${
              isRequired ? "" : ".optional()"
            },\n`;
          }
        );
      }

      validationContent += "});\n\n";
      validationContent += `export type ${typeName}ValidationInput = z.infer<typeof ${validationName}>;\n`;

      return {
        name: validationName,
        content: validationContent,
        dependencies: ["zod"],
        exports: [validationName, `${typeName}ValidationInput`],
        isInterface: false,
        isEnum: false,
        isUnion: false,
        sourceSchema: schema,
      };
    },
  },
};

function mapOpenAPIToZod(schema: any): string {
  switch (schema.type) {
    case "string":
      if (schema.format === "email") return "z.string().email()";
      if (schema.format === "uuid") return "z.string().uuid()";
      return "z.string()";
    case "number":
    case "integer":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "array":
      return `z.array(${mapOpenAPIToZod(schema.items)})`;
    default:
      return "z.unknown()";
  }
}

export default customGeneratorPlugin;
```

## Advanced Plugin Features

### 1. CLI Command Extension

```typescript
import { TypeSyncPlugin, CliCommand } from "type-sync";

const cliExtensionPlugin: TypeSyncPlugin = {
  name: "cli-extension",
  version: "1.0.0",
  description: "Adds custom CLI commands",

  cliCommands: [
    {
      name: "analyze",
      description: "Analyze OpenAPI schema complexity",
      options: [
        { name: "url", alias: "u", description: "Schema URL", type: "string" },
        {
          name: "output",
          alias: "o",
          description: "Output file",
          type: "string",
        },
      ],
      action: async (options: any) => {
        console.log("Analyzing schema complexity...");
        // Implementation here
      },
    },
  ],
};
```

### 2. File Output Generator

```typescript
import { TypeSyncPlugin, OutputGenerator, GenerationContext } from "type-sync";

const docGeneratorPlugin: TypeSyncPlugin = {
  name: "doc-generator",
  version: "1.0.0",
  description: "Generates API documentation",

  customOutputGenerators: [
    {
      name: "api-docs",
      generate: async (context: GenerationContext) => {
        const { schema, outputDir } = context;

        let markdownContent = `# ${schema.info.title} API Documentation\n\n`;
        markdownContent += `Version: ${schema.info.version}\n\n`;
        markdownContent += `${schema.info.description || ""}\n\n`;

        // Generate endpoint documentation
        if (schema.paths) {
          markdownContent += "## Endpoints\n\n";
          Object.entries(schema.paths).forEach(
            ([path, pathItem]: [string, any]) => {
              Object.entries(pathItem).forEach(
                ([method, operation]: [string, any]) => {
                  if (operation && typeof operation === "object") {
                    markdownContent += `### ${method.toUpperCase()} ${path}\n\n`;
                    markdownContent += `${
                      operation.summary || operation.description || ""
                    }\n\n`;
                  }
                }
              );
            }
          );
        }

        return [
          {
            path: `${outputDir}/API_DOCUMENTATION.md`,
            content: markdownContent,
            type: "other" as const,
          },
        ];
      },
    },
  ],
};
```

### 3. Configuration-Based Plugin

```typescript
import { TypeSyncPlugin, GenerationContext } from "type-sync";

interface PluginConfig {
  addTimestamps: boolean;
  customPrefix: string;
  excludePatterns: string[];
}

class ConfigurablePlugin implements TypeSyncPlugin {
  name = "configurable-plugin";
  version = "1.0.0";
  description = "A configurable plugin example";

  private config: PluginConfig;

  constructor(config: Partial<PluginConfig> = {}) {
    this.config = {
      addTimestamps: true,
      customPrefix: "",
      excludePatterns: [],
      ...config,
    };
  }

  afterTypeGeneration = async (
    typeName: string,
    generatedType: any,
    context: GenerationContext
  ) => {
    if (this.shouldExclude(typeName)) {
      return;
    }

    if (this.config.addTimestamps) {
      const timestamp = `// Generated on ${new Date().toISOString()}\n`;
      generatedType.content = timestamp + generatedType.content;
    }

    if (this.config.customPrefix) {
      generatedType.name = `${this.config.customPrefix}${generatedType.name}`;
    }
  };

  private shouldExclude(typeName: string): boolean {
    return this.config.excludePatterns.some((pattern) =>
      new RegExp(pattern).test(typeName)
    );
  }
}

// Usage
const plugin = new ConfigurablePlugin({
  addTimestamps: true,
  customPrefix: "My",
  excludePatterns: ["^Internal.*", ".*Error$"],
});

export default plugin;
```

## Plugin Utilities

Type-Sync provides utilities to help with plugin development:

```typescript
interface PluginUtilities {
  // String utilities
  toCamelCase(str: string): string;
  toPascalCase(str: string): string;
  toSnakeCase(str: string): string;

  // Type utilities
  isOptionalProperty(property: any, required: string[]): boolean;
  getTypeFromSchema(schema: any): string;
  resolveReference(ref: string, document: OpenAPIV3.Document): any;

  // File utilities
  ensureDirectoryExists(path: string): Promise<void>;
  writeFile(path: string, content: string): Promise<void>;

  // Validation utilities
  validateSchema(schema: any): { isValid: boolean; errors: string[] };
  validateGeneratedType(type: GeneratedType): {
    isValid: boolean;
    errors: string[];
  };
}
```

## Plugin Loading

### 1. File-based Plugin

```typescript
// my-plugin.js
module.exports = {
  name: "my-plugin",
  version: "1.0.0",
  description: "My custom plugin",

  afterTypeGeneration: async (typeName, generatedType, context) => {
    // Plugin logic here
  },
};
```

Load with CLI:

```bash
npx type-sync plugin load ./my-plugin.js
npx type-sync generate --plugins my-plugin
```

### 2. NPM Package Plugin

```typescript
// @my-org/typesync-plugin/index.js
const plugin = {
  name: "npm-plugin",
  version: "1.0.0",
  description: "NPM distributed plugin",

  transformSchema: (schema, context) => {
    // Transform logic
    return schema;
  },
};

module.exports = plugin;
```

Load with CLI:

```bash
npm install @my-org/typesync-plugin
npx type-sync plugin load @my-org/typesync-plugin
npx type-sync generate --plugins npm-plugin
```

### 3. Programmatic Plugin

```typescript
import { TypeSync, TypeSyncConfig } from "type-sync";
import myPlugin from "./my-plugin";

const config: TypeSyncConfig = {
  schemaUrl: "http://localhost:8000/openapi.json",
  outputDir: "./generated",
  plugins: [{ name: "my-plugin", enabled: true }],
};

const typeSync = new TypeSync(config);
const pluginManager = typeSync.getPluginManager();

// Register custom plugin
pluginManager.registerPlugin(myPlugin);
pluginManager.enablePlugin("my-plugin");

// Generate with plugin
const result = await typeSync.generate();
```

## Testing Plugins

### Unit Testing

```typescript
import { describe, it, expect } from "jest";
import myPlugin from "./my-plugin";
import { GenerationContext, GeneratedType } from "type-sync";

describe("MyPlugin", () => {
  it("should add comments to generated types", async () => {
    const mockContext: GenerationContext = {
      config: {},
      schema: { info: { title: "Test API" } },
      outputDir: "./test",
      logger: console,
      utilities: {},
    } as any;

    const generatedType: GeneratedType = {
      name: "TestType",
      content: "export interface TestType { id: string; }",
      dependencies: [],
      exports: ["TestType"],
      isInterface: true,
      isEnum: false,
      isUnion: false,
      sourceSchema: {},
    };

    await myPlugin.afterTypeGeneration?.(
      "TestType",
      generatedType,
      mockContext
    );

    expect(generatedType.content).toContain("/**");
    expect(generatedType.content).toContain("Generated type: TestType");
  });
});
```

### Integration Testing

```typescript
import { TypeSync } from "type-sync";
import myPlugin from "./my-plugin";

describe("Plugin Integration", () => {
  it("should work with full generation process", async () => {
    const typeSync = new TypeSync({
      schemaFile: "./test-schema.json",
      outputDir: "./test-output",
    });

    const pluginManager = typeSync.getPluginManager();
    pluginManager.registerPlugin(myPlugin);
    pluginManager.enablePlugin("my-plugin");

    const result = await typeSync.generate();
    expect(result.success).toBe(true);

    // Verify plugin effects in generated files
    const typesContent = result.generatedFiles.find(
      (f) => f.type === "types"
    )?.content;
    expect(typesContent).toContain("Generated type:");
  });
});
```

## Best Practices

### 1. Error Handling

```typescript
const robustPlugin: TypeSyncPlugin = {
  name: "robust-plugin",
  version: "1.0.0",
  description: "Example of robust error handling",

  afterTypeGeneration: async (typeName, generatedType, context) => {
    try {
      // Plugin logic that might fail
      generatedType.content = processContent(generatedType.content);
    } catch (error) {
      context.logger.warn(
        `Plugin failed for type ${typeName}: ${error.message}`
      );
      // Don't throw - allow generation to continue
    }
  },
};
```

### 2. Performance Considerations

```typescript
const performantPlugin: TypeSyncPlugin = {
  name: 'performant-plugin',
  version: '1.0.0',
  description: 'Example of performance-conscious plugin',

  // Cache expensive computations
  private cache = new Map<string, any>();

  transformSchema: (schema, context) => {
    const cacheKey = JSON.stringify(schema);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const transformed = expensiveTransform(schema);
    this.cache.set(cacheKey, transformed);

    return transformed;
  }
};
```

### 3. Configuration Validation

```typescript
import * as Joi from "joi";

const configSchema = Joi.object({
  enabled: Joi.boolean().default(true),
  options: Joi.object({
    prefix: Joi.string().default(""),
    includeComments: Joi.boolean().default(true),
  }),
});

const validatedPlugin: TypeSyncPlugin = {
  name: "validated-plugin",
  version: "1.0.0",
  description: "Plugin with configuration validation",

  beforeSchemaLoad: async (context) => {
    const pluginConfig = context.config.plugins?.find(
      (p) => p.name === "validated-plugin"
    );

    if (pluginConfig) {
      const { error } = configSchema.validate(pluginConfig);
      if (error) {
        throw new Error(`Invalid plugin configuration: ${error.message}`);
      }
    }
  },
};
```

## Publishing Plugins

### 1. NPM Package Structure

```
my-typesync-plugin/
├── package.json
├── index.js
├── README.md
├── LICENSE
└── test/
    └── plugin.test.js
```

### 2. Package.json

```json
{
  "name": "@my-org/typesync-plugin-name",
  "version": "1.0.0",
  "description": "Description of your plugin",
  "main": "index.js",
  "keywords": ["typesync", "plugin", "openapi", "typescript"],
  "peerDependencies": {
    "type-sync": "^1.0.0"
  },
  "files": ["index.js", "README.md", "LICENSE"]
}
```

### 3. Plugin Registry

Consider adding your plugin to the community registry by submitting a PR to the Type-Sync plugins repository.

## Community Plugins

Popular community plugins include:

- `@typesync/plugin-zod` - Generates Zod validation schemas
- `@typesync/plugin-react-query` - Generates React Query hooks
- `@typesync/plugin-swagger-ui` - Generates Swagger UI documentation
- `@typesync/plugin-mock-data` - Generates mock data factories

## Support

- 📖 [Plugin API Reference](./API.md#plugin-api)
- 💬 [Plugin Development Discussions](https://github.com/Cstannahill/type-sync/discussions)
- 🐛 [Report Plugin Issues](https://github.com/Cstannahill/type-sync/issues)
- 📧 [Plugin Development Support](mailto:plugins@typesync.dev)
