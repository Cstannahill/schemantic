# Plugin Development Guide

This guide explains how to create custom plugins for Type-Sync to extend its functionality.

## Plugin Overview

Plugins in Type-Sync allow you to:

- Transform schemas before type generation
- Modify generated types and API clients
- Add custom type generators
- Add custom client generators
- Execute code at various stages of the generation process

## Plugin Interface

All plugins must implement the `TypeSyncPlugin` interface:

```typescript
interface TypeSyncPlugin {
  name: string;
  version: string;
  description: string;
  
  // Lifecycle hooks
  beforeGeneration?(context: GenerationContext): Promise<void> | void;
  afterGeneration?(context: GenerationContext, result: GenerationResult): Promise<void> | void;
  
  // Type generation hooks
  beforeTypeGeneration?(typeName: string, schema: ResolvedSchema, context: GenerationContext): Promise<void> | void;
  afterTypeGeneration?(typeName: string, generatedType: GeneratedType, context: GenerationContext): Promise<void> | void;
  
  // Client generation hooks
  beforeClientGeneration?(context: GenerationContext): Promise<void> | void;
  afterClientGeneration?(generatedClient: GeneratedApiClient, context: GenerationContext): Promise<void> | void;
  
  // Schema transformation hooks
  transformSchema?(schema: ResolvedSchema, context: GenerationContext): ResolvedSchema;
  
  // Custom generators
  customTypeGenerators?: Record<string, (schema: ResolvedSchema, context: GenerationContext) => GeneratedType>;
  customClientGenerators?: Record<string, (context: GenerationContext) => GeneratedApiClient>;
}
```

## Basic Plugin Structure

Here's a minimal plugin:

```typescript
import { TypeSyncPlugin, GenerationContext, GeneratedType } from 'type-sync';

const myPlugin: TypeSyncPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  
  beforeGeneration: async (context: GenerationContext) => {
    console.log('Starting generation...');
  },
  
  afterGeneration: async (context: GenerationContext, result: any) => {
    console.log('Generation completed!');
  },
};
```

## Plugin Hooks

### Lifecycle Hooks

#### `beforeGeneration`

Called before the generation process starts. Use this to:

- Validate configuration
- Set up plugin-specific state
- Modify the generation context

```typescript
beforeGeneration: async (context: GenerationContext) => {
  // Validate configuration
  if (!context.config.customOption) {
    throw new Error('Custom option is required');
  }
  
  // Set up plugin state
  context.pluginState = { myData: 'value' };
},
```

#### `afterGeneration`

Called after the generation process completes. Use this to:

- Clean up resources
- Generate additional files
- Post-process results

```typescript
afterGeneration: async (context: GenerationContext, result: any) => {
  // Generate additional files
  if (result.success) {
    await generateAdditionalFiles(context);
  }
  
  // Clean up
  delete context.pluginState;
},
```

### Type Generation Hooks

#### `beforeTypeGeneration`

Called before generating a specific type. Use this to:

- Transform the schema
- Add metadata
- Skip generation for certain types

```typescript
beforeTypeGeneration: async (typeName: string, schema: ResolvedSchema, context: GenerationContext) => {
  // Add custom metadata
  schema._customMetadata = { processed: true };
  
  // Skip certain types
  if (typeName.includes('Internal')) {
    return;
  }
},
```

#### `afterTypeGeneration`

Called after generating a specific type. Use this to:

- Modify the generated type content
- Add imports
- Post-process the type

```typescript
afterTypeGeneration: async (typeName: string, generatedType: GeneratedType, context: GenerationContext) => {
  // Add custom imports
  generatedType.content = `import { CustomType } from './custom';\n\n${generatedType.content}`;
  
  // Add custom decorators
  if (generatedType.isInterface) {
    generatedType.content = generatedType.content.replace(
      /export interface (\w+)/g,
      '@CustomDecorator\nexport interface $1'
    );
  }
},
```

### Client Generation Hooks

#### `beforeClientGeneration`

Called before generating API clients. Use this to:

- Set up client-specific configuration
- Modify the generation context

```typescript
beforeClientGeneration: async (context: GenerationContext) => {
  // Add custom configuration
  context.clientConfig = {
    baseUrl: 'https://api.example.com',
    timeout: 30000,
  };
},
```

#### `afterClientGeneration`

Called after generating API clients. Use this to:

- Modify the generated client
- Add custom methods
- Post-process the client

```typescript
afterClientGeneration: async (generatedClient: GeneratedApiClient, context: GenerationContext) => {
  // Add custom methods
  const customMethods = `
  async customMethod(): Promise<string> {
    return 'custom result';
  }
  `;
  
  generatedClient.content = generatedClient.content.replace(
    /}\s*$/,
    `${customMethods}\n}`
  );
},
```

### Schema Transformation

#### `transformSchema`

Transform schemas before type generation. Use this to:

- Add custom properties
- Modify type information
- Standardize schema format

```typescript
transformSchema: (schema: ResolvedSchema, context: GenerationContext): ResolvedSchema => {
  // Add custom properties
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (typeof propSchema === 'object' && propSchema !== null) {
        // Add custom metadata
        propSchema._customProperty = true;
        
        // Transform specific types
        if (propSchema.format === 'uuid') {
          propSchema._customType = 'CustomUuid';
        }
      }
    }
  }
  
  return schema;
},
```

## Custom Generators

### Custom Type Generators

Add custom type generators for specific schema types:

```typescript
customTypeGenerators: {
  'custom-type': (schema: ResolvedSchema, context: GenerationContext): GeneratedType => {
    return {
      name: 'CustomType',
      content: `export type CustomType = string;`,
      dependencies: [],
      exports: ['CustomType'],
      isInterface: false,
      isEnum: false,
      isUnion: false,
      sourceSchema: schema,
    };
  },
  
  'date-time': (schema: ResolvedSchema, context: GenerationContext): GeneratedType => {
    return {
      name: 'DateTime',
      content: `export type DateTime = string; // ISO 8601 format`,
      dependencies: [],
      exports: ['DateTime'],
      isInterface: false,
      isEnum: false,
      isUnion: false,
      sourceSchema: schema,
    };
  },
},
```

### Custom Client Generators

Add custom client generators:

```typescript
customClientGenerators: {
  'react-query': (context: GenerationContext): GeneratedApiClient => {
    const hooks = generateReactQueryHooks(context);
    
    return {
      name: 'ReactQueryHooks',
      content: hooks,
      dependencies: ['react-query'],
      exports: ['useApiHooks'],
      endpoints: [],
    };
  },
  
  'axios': (context: GenerationContext): GeneratedApiClient => {
    const client = generateAxiosClient(context);
    
    return {
      name: 'AxiosClient',
      content: client,
      dependencies: ['axios'],
      exports: ['AxiosApiClient'],
      endpoints: [],
    };
  },
},
```

## Plugin Examples

### JSDoc Plugin

Adds JSDoc comments to generated types:

```typescript
const jsdocPlugin: TypeSyncPlugin = {
  name: 'jsdoc',
  version: '1.0.0',
  description: 'Adds JSDoc comments to generated types',
  
  afterTypeGeneration: async (typeName: string, generatedType: GeneratedType, context: GenerationContext) => {
    if (!generatedType.content.includes('/**')) {
      const comment = `/**\n * ${generatedType.sourceSchema.description || `Generated type: ${typeName}`}\n */\n`;
      generatedType.content = comment + generatedType.content;
    }
  },
};
```

### Validation Plugin

Adds validation decorators for class-validator:

```typescript
const validationPlugin: TypeSyncPlugin = {
  name: 'validation',
  version: '1.0.0',
  description: 'Adds validation decorators to generated types',
  
  afterTypeGeneration: async (typeName: string, generatedType: GeneratedType, context: GenerationContext) => {
    if (generatedType.isInterface) {
      // Add validation imports
      const imports = `import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';\n\n`;
      
      // Add validation decorators to properties
      let content = generatedType.content;
      content = content.replace(
        /(\w+)(\?)?: (\w+);/g,
        (match, propName, optional, type) => {
          const decorators = [];
          
          if (type === 'string') decorators.push('@IsString()');
          if (type === 'number') decorators.push('@IsNumber()');
          if (optional) decorators.push('@IsOptional()');
          else decorators.push('@IsNotEmpty()');
          
          return `${decorators.join('\n  ')}\n  ${match}`;
        }
      );
      
      generatedType.content = imports + content;
    }
  },
};
```

### React Hooks Plugin

Generates React hooks for API endpoints:

```typescript
const reactHooksPlugin: TypeSyncPlugin = {
  name: 'react-hooks',
  version: '1.0.0',
  description: 'Generates React hooks for API endpoints',
  
  customClientGenerators: {
    'react-hooks': (context: GenerationContext): GeneratedApiClient => {
      const hooks = generateReactHooks(context);
      
      return {
        name: 'ApiHooks',
        content: hooks,
        dependencies: ['react-query'],
        exports: ['useApiHooks'],
        endpoints: [],
      };
    },
  },
};

function generateReactHooks(context: GenerationContext): string {
  let hooks = `import { useQuery, useMutation, useQueryClient } from 'react-query';\n`;
  hooks += `import { ApiClient } from './api-client';\n\n`;
  
  hooks += `export const useApiHooks = (client: ApiClient) => {\n`;
  hooks += `  const queryClient = useQueryClient();\n\n`;
  
  // Generate hooks for each endpoint
  for (const [path, pathItem] of Object.entries(context.schema.paths)) {
    if (typeof pathItem === 'object' && pathItem !== null) {
      const operations = ['get', 'post', 'put', 'delete', 'patch'] as const;
      
      for (const method of operations) {
        const operation = pathItem[method];
        if (operation) {
          const hookName = generateHookName(operation.operationId || `${method}${path}`);
          const hook = generateHook(operation, method, path);
          hooks += `  ${hookName} = ${hook};\n`;
        }
      }
    }
  }
  
  hooks += `};\n`;
  return hooks;
}
```

## Plugin Loading

### From File

```typescript
import { PluginLoader } from 'type-sync';

const loader = new PluginLoader();
const plugin = await loader.loadPluginFromFile('./my-plugin.js');
```

### From Package

```typescript
const plugin = await loader.loadPluginFromPackage('my-typesync-plugin');
```

### From Directory

```typescript
const plugins = await loader.loadPluginsFromDirectory('./plugins');
```

## Plugin Registration

### In Code

```typescript
import { TypeSync } from 'type-sync';

const typeSync = new TypeSync(config);
const pluginManager = typeSync.getPluginManager();

pluginManager.registerPlugin(myPlugin);
pluginManager.enablePlugin('my-plugin');
```

### Via Configuration

```typescript
const config: TypeSyncConfig = {
  // ... other config
  plugins: [
    { name: 'my-plugin', enabled: true },
    { name: 'jsdoc', enabled: true },
  ],
};
```

### Via CLI

```bash
npx type-sync generate --plugins my-plugin,jsdoc
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
beforeTypeGeneration: async (typeName: string, schema: ResolvedSchema, context: GenerationContext) => {
  try {
    // Plugin logic
  } catch (error) {
    console.warn(`Plugin ${this.name} failed for type ${typeName}:`, error);
    // Don't throw - let generation continue
  }
},
```

### 2. Performance

Consider performance implications:

```typescript
// Cache expensive operations
const cache = new Map();

transformSchema: (schema: ResolvedSchema, context: GenerationContext): ResolvedSchema => {
  const cacheKey = JSON.stringify(schema);
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = expensiveTransformation(schema);
  cache.set(cacheKey, result);
  return result;
},
```

### 3. Documentation

Document your plugin thoroughly:

```typescript
const myPlugin: TypeSyncPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: `
    My custom plugin that adds special functionality.
    
    Features:
    - Adds custom decorators
    - Transforms specific types
    - Generates additional files
    
    Usage:
    Enable via configuration or CLI: --plugins my-plugin
  `,
  
  // ... implementation
};
```

### 4. Testing

Test your plugins:

```typescript
import { TypeSync, TypeSyncConfig } from 'type-sync';

describe('My Plugin', () => {
  it('should transform schemas correctly', async () => {
    const config: TypeSyncConfig = {
      schemaData: testSchema,
      outputDir: './test-output',
      plugins: [{ name: 'my-plugin', enabled: true }],
    };
    
    const typeSync = new TypeSync(config);
    const result = await typeSync.generate();
    
    expect(result.success).toBe(true);
    expect(result.generatedFiles).toHaveLength(1);
  });
});
```

### 5. Versioning

Use semantic versioning for your plugins:

```typescript
const myPlugin: TypeSyncPlugin = {
  name: 'my-plugin',
  version: '1.2.3', // Major.Minor.Patch
  description: 'My plugin description',
  
  // ... implementation
};
```

## Publishing Plugins

### As NPM Package

1. Create a package.json:

```json
{
  "name": "typesync-my-plugin",
  "version": "1.0.0",
  "description": "My custom Type-Sync plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["typesync", "plugin", "typescript", "openapi"],
  "peerDependencies": {
    "type-sync": "^1.0.0"
  }
}
```

2. Export your plugin:

```typescript
// src/index.ts
export { myPlugin } from './plugin';
export * from './types';
```

3. Build and publish:

```bash
npm run build
npm publish
```

### Usage

Users can install and use your plugin:

```bash
npm install typesync-my-plugin
```

```typescript
import { myPlugin } from 'typesync-my-plugin';
import { TypeSync } from 'type-sync';

const typeSync = new TypeSync(config);
typeSync.getPluginManager().registerPlugin(myPlugin);
```

## Troubleshooting

### Common Issues

1. **Plugin not loading**: Check that the plugin exports the correct interface
2. **Type errors**: Ensure your plugin implements all required interface properties
3. **Performance issues**: Use caching and avoid expensive operations in hooks
4. **Conflicts**: Check for naming conflicts with other plugins

### Debug Mode

Enable debug mode to see plugin execution:

```typescript
const config: TypeSyncConfig = {
  // ... other config
  plugins: [
    { name: 'my-plugin', enabled: true, options: { debug: true } },
  ],
};
```

### Logging

Add logging to your plugin:

```typescript
beforeTypeGeneration: async (typeName: string, schema: ResolvedSchema, context: GenerationContext) => {
  console.log(`[My Plugin] Processing type: ${typeName}`);
  
  // Plugin logic
  
  console.log(`[My Plugin] Completed processing: ${typeName}`);
},
```
