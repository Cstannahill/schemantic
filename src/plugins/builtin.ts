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
  version: "0.1.0",
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
  ...zodValidationPlugin,
  name: 'validation',
  description: 'Runtime Zod validation schemas and helpers (requires zod)',
};

/**
 * Built-in plugin for adding React hooks generation
 */
export const reactHooksPlugin: SchemanticPlugin = {
  name: "react-hooks",
  version: "0.1.0",
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
  version: "0.1.0",
  description: "Retired: strict TypeScript output is provided by the core generator",
  beforeGeneration: () => {
    throw new Error("strict-mode plugin is retired; remove it from plugins and use core strict TypeScript output");
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
    // reactHooksPlugin is temporarily disabled due to known issues with
    // generation corruption observed in some schemas. Re-enable after
    // investigation and fixes are merged.
    // reactHooksPlugin,
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
  return [
    jsdocPlugin,
    validationPlugin,
    /* reactHooksPlugin (temporarily disabled) */ strictModePlugin,
  ];
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
