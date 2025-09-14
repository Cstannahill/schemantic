/**
 * Built-in plugins for common transformations and enhancements
 * Provides standard plugins that can be used out of the box
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
import { OpenAPISchema } from "../types/openapi";

// Import advanced plugins
import zodValidationPlugin from "./zod-validation";
import performanceMonitoringPlugin from "./performance-monitoring";
import requestDeduplicationPlugin from "./request-deduplication";
import brandedTypesPlugin from "./branded-types";

/**
 * Built-in plugin for adding JSDoc comments
 */
export const jsdocPlugin: SchemanticPlugin = {
  name: "jsdoc",
  version: "1.0.0",
  description: "Adds JSDoc comments to generated types and methods",

  beforeTypeGeneration: async (
    _typeName: string,
    schema: ResolvedSchema,
    _context: GenerationContext
  ) => {
    // Add description to schema if not present
    if (isOpenAPISchemaObject(schema) && !schema.description && schema.title) {
      (
        schema as ExtendedSchemaObject
      ).description = `Type definition for ${schema.title}`;
    }
  },

  afterTypeGeneration: async (
    typeName: string,
    generatedType: GeneratedType,
    _context: GenerationContext
  ) => {
    // Add JSDoc comment if not present
    if (!generatedType.content.includes("/**")) {
      const description = isOpenAPISchemaObject(generatedType.sourceSchema)
        ? generatedType.sourceSchema.description
        : undefined;
      const comment = `/**\n * ${
        description || `Generated type: ${typeName}`
      }\n */\n`;
      generatedType.content = comment + generatedType.content;
    }
  },

  afterClientGeneration: async (
    generatedClient: GeneratedApiClient,
    context: GenerationContext
  ) => {
    // Add JSDoc comment to client class
    if (!generatedClient.content.includes("/**")) {
      const comment = `/**\n * Generated API client\n * @description ${
        context.schema.info?.description || "Auto-generated from OpenAPI schema"
      }\n */\n`;
      generatedClient.content = comment + generatedClient.content;
    }
  },
};

/**
 * Built-in plugin for adding validation decorators
 */
export const validationPlugin: SchemanticPlugin = {
  name: "validation",
  version: "1.0.0",
  description: "Adds validation decorators to generated types",

  transformSchema: (
    schema: ResolvedSchema,
    _context: GenerationContext
  ): ResolvedSchema => {
    // Add validation metadata to schema
    if (isOpenAPISchemaObject(schema) && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (
          typeof propSchema === "object" &&
          propSchema !== null &&
          isOpenAPISchemaObject(propSchema)
        ) {
          // Add validation metadata
          const meta: NonNullable<ExtendedSchemaObject["_validationMetadata"]> =
            {
              required: schema.required?.includes(propName) || false,
            };
          if (propSchema.minLength !== undefined)
            meta.minLength = propSchema.minLength;
          if (propSchema.maxLength !== undefined)
            meta.maxLength = propSchema.maxLength;
          if (propSchema.minimum !== undefined)
            meta.minimum = propSchema.minimum;
          if (propSchema.maximum !== undefined)
            meta.maximum = propSchema.maximum;
          if (propSchema.pattern !== undefined)
            meta.pattern = propSchema.pattern;
          if (propSchema.format !== undefined) meta.format = propSchema.format;
          (propSchema as ExtendedSchemaObject)._validationMetadata = meta;
        }
      }
    }

    return schema;
  },

  afterTypeGeneration: async (
    _typeName: string,
    generatedType: GeneratedType,
    _context: GenerationContext
  ) => {
    // Add validation decorators to generated type
    if (
      generatedType.isInterface &&
      isOpenAPISchemaObject(generatedType.sourceSchema) &&
      generatedType.sourceSchema.properties
    ) {
      let content = generatedType.content;

      // Add validation imports
      const validationImports = `import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty, MinLength, MaxLength, Min, Max, Matches } from 'class-validator';\n\n`;

      // Add validation decorators to properties
      const lines = content.split("\n");
      const newLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        newLines.push(line);

        // Check if this is a property line
        if (
          line.includes(":") &&
          !line.includes("export") &&
          !line.includes("interface")
        ) {
          const propName = line.split(":")[0]?.trim();
          if (propName) {
            const validationDecorators = generateValidationDecorators(
              propName,
              generatedType.sourceSchema
            );
            if (validationDecorators) {
              newLines.push(validationDecorators);
            }
          }
        }
      }

      generatedType.content = validationImports + newLines.join("\n");
    }
  },
};

// Helper function to generate validation decorators
function generateValidationDecorators(
  propName: string,
  schema: ResolvedSchema
): string | undefined {
  if (!isOpenAPISchemaObject(schema) || !schema.properties) {
    return undefined;
  }

  const propSchema = schema.properties[propName];
  if (
    !propSchema ||
    typeof propSchema !== "object" ||
    !isOpenAPISchemaObject(propSchema)
  ) {
    return undefined;
  }

  const decorators: string[] = [];

  // Add type decorators
  if (propSchema.type === "string") {
    decorators.push("@IsString()");
  } else if (propSchema.type === "number" || propSchema.type === "integer") {
    decorators.push("@IsNumber()");
  } else if (propSchema.type === "boolean") {
    decorators.push("@IsBoolean()");
  }

  // Add validation decorators
  if (propSchema.minLength !== undefined) {
    decorators.push(`@MinLength(${propSchema.minLength})`);
  }

  if (propSchema.maxLength !== undefined) {
    decorators.push(`@MaxLength(${propSchema.maxLength})`);
  }

  if (propSchema.minimum !== undefined) {
    decorators.push(`@Min(${propSchema.minimum})`);
  }

  if (propSchema.maximum !== undefined) {
    decorators.push(`@Max(${propSchema.maximum})`);
  }

  if (propSchema.pattern) {
    decorators.push(`@Matches(/${propSchema.pattern}/)`);
  }

  // Add optional decorator
  if (
    (propSchema as ExtendedSchemaObject)._validationMetadata?.required === false
  ) {
    decorators.push("@IsOptional()");
  } else {
    decorators.push("@IsNotEmpty()");
  }

  return decorators.map((d) => `  ${d}`).join("\n");
}

/**
 * Built-in plugin for adding React hooks generation
 */
export const reactHooksPlugin: SchemanticPlugin = {
  name: "react-hooks",
  version: "1.0.0",
  description: "Generates React hooks for API endpoints",

  customClientGenerators: {
    "react-hooks": (context: GenerationContext): GeneratedApiClient => {
      const schema = context.schema;
      const clientName = "ApiHooks";

      // Generate React hooks for each endpoint
      const hooks = generateReactHooks(schema, context);

      const content = `import { useQuery, useMutation, useQueryClient } from 'react-query';\nimport { ApiClient } from './api-client';\n\n${hooks}`;

      return {
        name: clientName,
        content,
        dependencies: ["react-query"],
        exports: [clientName],
        endpoints: [], // Hooks don't have traditional endpoints
      };
    },
  },
};

// Helper function to generate React hooks
function generateReactHooks(
  _schema: OpenAPISchema,
  _context: GenerationContext
): string {
  let hooks = "";

  // This would be implemented to generate actual React hooks
  // For now, return a placeholder
  hooks += `export const useApiHooks = (client: ApiClient) => {\n`;
  hooks += `  // Generated hooks will be here\n`;
  hooks += `  return {\n`;
  hooks += `    // Hook methods\n`;
  hooks += `  };\n`;
  hooks += `};\n`;

  return hooks;
}

/**
 * Built-in plugin for adding TypeScript strict mode enhancements
 */
export const strictModePlugin: SchemanticPlugin = {
  name: "strict-mode",
  version: "1.0.0",
  description: "Adds TypeScript strict mode enhancements",

  transformSchema: (
    schema: ResolvedSchema,
    _context: GenerationContext
  ): ResolvedSchema => {
    // Add strict type information
    if (isOpenAPISchemaObject(schema) && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (
          typeof propSchema === "object" &&
          propSchema !== null &&
          isOpenAPISchemaObject(propSchema)
        ) {
          // Mark as strict type
          (propSchema as ExtendedSchemaObject)._isStrictType = true;

          // Add null/undefined handling
          if (propSchema.nullable) {
            (propSchema as ExtendedSchemaObject)._isNullable = true;
          }

          if (!schema.required?.includes(propName)) {
            (propSchema as ExtendedSchemaObject)._isOptional = true;
          }
        }
      }
    }

    return schema;
  },

  afterTypeGeneration: async (
    _typeName: string,
    generatedType: GeneratedType,
    _context: GenerationContext
  ) => {
    // Add strict type annotations
    if (generatedType.isInterface) {
      let content = generatedType.content;

      // Add strict type imports
      const strictImports = `import { StrictType, Optional, Nullable } from './strict-types';\n\n`;

      // Add strict type annotations
      content = strictImports + content;

      generatedType.content = content;
    }
  },
};

/**
 * Get all built-in plugins (including advanced plugins)
 */
export function getBuiltinPlugins(): SchemanticPlugin[] {
  return [
    // Basic plugins
    jsdocPlugin,
    validationPlugin,
    reactHooksPlugin,
    strictModePlugin,

    // Advanced plugins
    zodValidationPlugin,
    performanceMonitoringPlugin,
    requestDeduplicationPlugin,
    brandedTypesPlugin,
  ];
}

/**
 * Get basic built-in plugins only
 */
export function getBasicBuiltinPlugins(): SchemanticPlugin[] {
  return [jsdocPlugin, validationPlugin, reactHooksPlugin, strictModePlugin];
}

/**
 * Get advanced built-in plugins only
 */
export function getAdvancedBuiltinPlugins(): SchemanticPlugin[] {
  return [
    zodValidationPlugin,
    performanceMonitoringPlugin,
    requestDeduplicationPlugin,
    brandedTypesPlugin,
  ];
}

/**
 * Get built-in plugin by name
 */
export function getBuiltinPlugin(name: string): SchemanticPlugin | undefined {
  return getBuiltinPlugins().find((plugin) => plugin.name === name);
}
