/**
 * Main TypeSync class
 * Orchestrates the entire type generation process
 */

import * as fs from "fs/promises";
import * as path from "path";
import { OpenAPISchema, OpenAPISchemaObject } from "../types/openapi";
import { ResolvedSchema } from "../types/schema";
import {
  TypeSyncConfig,
  GenerationContext,
  GenerationResult,
  GeneratedType,
  GeneratedApiClient,
  GeneratedFile,
  GenerationError,
  GenerationWarning,
  GenerationStatistics,
  TypeRegistry,
} from "../types/core";

// Re-export commonly used types and constants
export { TypeSyncConfig, DEFAULT_CONFIG } from "../types/core";
import { ParserFactory } from "../parsers";
import { TypeGeneratorFactory } from "../generators";
import { ApiClientGenerator } from "../generators/api-client-generator";
import { HookGenerator } from "../generators/hook-generator";
import { PluginManager } from "../plugins";

/**
 * Main TypeSync class
 */
export class TypeSync {
  private config: TypeSyncConfig;
  private pluginManager: PluginManager;
  private schema?: OpenAPISchema;
  private resolvedSchemas: Map<string, ResolvedSchema> = new Map();
  private typeRegistry: TypeRegistry;

  constructor(config: TypeSyncConfig) {
    this.config = config;
    this.pluginManager = new PluginManager();
    this.typeRegistry = this.createTypeRegistry();
  }

  /**
   * Generate types and API client
   */
  async generate(): Promise<GenerationResult> {
    const startTime = Date.now();
    const errors: GenerationError[] = [];
    const warnings: GenerationWarning[] = [];
    const generatedFiles: GeneratedFile[] = [];

    try {
      // Load and parse schema
      const schema = await this.loadSchema();
      this.schema = schema;

      // Create generation context
      const context = this.createGenerationContext();

      // Execute before generation hooks
      await this.pluginManager.executeBeforeGeneration(context);

      // Resolve all schema references
      await this.resolveSchemaReferences(schema);

      // Generate types
      let generatedTypes: GeneratedType[] = [];
      if (this.config.generateTypes) {
        generatedTypes = await this.generateTypes(context);
      }

      // Generate API client
      let generatedClients: GeneratedApiClient[] = [];
      if (this.config.generateApiClient) {
        generatedClients = await this.generateApiClients(context);
      }

      // Generate files
      const files = await this.generateFiles(generatedTypes, generatedClients);
      generatedFiles.push(...files);

      // Execute after generation hooks
      const result: GenerationResult = {
        success: true,
        generatedFiles,
        errors,
        warnings,
        statistics: this.calculateStatistics(
          generatedTypes,
          generatedClients,
          generatedFiles,
          Date.now() - startTime
        ),
      };

      await this.pluginManager.executeAfterGeneration(context, result);

      return result;
    } catch (error) {
      errors.push({
        code: "GENERATION_ERROR",
        message: error instanceof Error ? error.message : String(error),
        severity: "error",
      });

      return {
        success: false,
        generatedFiles,
        errors,
        warnings,
        statistics: this.calculateStatistics(
          [],
          [],
          generatedFiles,
          Date.now() - startTime
        ),
      };
    }
  }

  /**
   * Validate OpenAPI schema
   */
  async validate(): Promise<{
    isValid: boolean;
    errors: GenerationError[];
    warnings: GenerationWarning[];
  }> {
    try {
      const schema = await this.loadSchema();
      const parser = ParserFactory.autoCreateParser(
        { data: schema },
        this.config
      );
      return await parser.validate(schema);
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            code: "VALIDATION_ERROR",
            message: error instanceof Error ? error.message : String(error),
            severity: "error",
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Load schema from various sources
   */
  private async loadSchema(): Promise<OpenAPISchema> {
    let input: { url?: string; filePath?: string; data?: OpenAPISchema } = {};

    if (this.config.schemaUrl) {
      input.url = this.config.schemaUrl;
    } else if (this.config.schemaFile) {
      input.filePath = this.config.schemaFile;
    } else if (this.config.schemaData) {
      input.data = this.config.schemaData;
    } else {
      throw new Error("No schema source provided");
    }

    const parser = ParserFactory.autoCreateParser(input, this.config);
    return await parser.parse(input);
  }

  /**
   * Create generation context
   */
  private createGenerationContext(): GenerationContext {
    return {
      config: this.config,
      schema: this.schema!,
      resolvedSchemas: this.resolvedSchemas,
      generatedTypes: new Map(),
      generatedClients: new Map(),
      typeRegistry: this.typeRegistry,
      schemaResolver: (ref: string) => this.resolvedSchemas.get(ref),
    };
  }

  /**
   * Resolve schema references
   */
  private async resolveSchemaReferences(schema: OpenAPISchema): Promise<void> {
    if (!schema.components?.schemas) {
      return;
    }

    // Resolve all schemas
    for (const [name, schemaRef] of Object.entries(schema.components.schemas)) {
      if (typeof schemaRef === "object" && schemaRef !== null) {
        // Stamp a stable generated type name to match $ref terminal name
        (schemaRef as OpenAPISchemaObject)._generatedTypeName = name;
        this.resolvedSchemas.set(`#/components/schemas/${name}`, schemaRef);
      }
    }
  }

  /**
   * Generate types from schemas
   */
  private async generateTypes(
    context: GenerationContext
  ): Promise<GeneratedType[]> {
    const generators = TypeGeneratorFactory.createFromConfig(this.config);
    const generatedTypes: GeneratedType[] = [];

    // Generate types for each schema
    for (const [ref, schema] of this.resolvedSchemas) {
      // Apply schema transformations
      const transformedSchema = this.pluginManager.transformSchema(
        schema,
        context
      );

      // Execute before type generation hooks
      await this.pluginManager.executeBeforeTypeGeneration(
        ref,
        transformedSchema,
        context
      );

      // Generate type
      const generatedType = TypeGeneratorFactory.generateType(
        transformedSchema,
        context,
        generators
      );

      if (generatedType) {
        // Register type
        this.typeRegistry.registerType(generatedType.name, generatedType);
        context.generatedTypes.set(generatedType.name, generatedType);

        // Execute after type generation hooks
        await this.pluginManager.executeAfterTypeGeneration(
          generatedType.name,
          generatedType,
          context
        );

        generatedTypes.push(generatedType);
      }
    }

    return generatedTypes;
  }

  /**
   * Generate API clients
   */
  private async generateApiClients(
    context: GenerationContext
  ): Promise<GeneratedApiClient[]> {
    const generatedClients: GeneratedApiClient[] = [];

    // Execute before client generation hooks
    await this.pluginManager.executeBeforeClientGeneration(context);

    // Generate main API client
    const apiClientGenerator = new ApiClientGenerator(context);
    const generatedClient = apiClientGenerator.generate(context);

    // Register client
    context.generatedClients.set(generatedClient.name, generatedClient);

    // Execute after client generation hooks
    await this.pluginManager.executeAfterClientGeneration(
      generatedClient,
      context
    );

    generatedClients.push(generatedClient);

    // Generate custom clients from plugins
    const customGenerators = this.pluginManager.getCustomClientGenerators();
    for (const [name, generator] of customGenerators) {
      try {
        const customClient = generator(context);
        context.generatedClients.set(customClient.name, customClient);
        generatedClients.push(customClient);
      } catch (error) {
        console.warn(`Custom client generator ${name} failed:`, error);
      }
    }

    return generatedClients;
  }

  /**
   * Generate files from generated types and clients
   */
  private async generateFiles(
    generatedTypes: GeneratedType[],
    generatedClients: GeneratedApiClient[]
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });

    // Generate types file
    if (generatedTypes.length > 0) {
      const typesFile = await this.generateTypesFile(generatedTypes);
      files.push(typesFile);
    }

    // Generate client files
    for (const client of generatedClients) {
      const clientFile = await this.generateClientFile(client);
      files.push(clientFile);
    }

    // Generate hooks file (first-party) when enabled
    if (this.config.generateHooks) {
      const hooksFile = await this.generateHooksFile();
      if (hooksFile) files.push(hooksFile);
    }

    // Generate index file
    if (this.config.generateIndexFile) {
      const indexFile = await this.generateIndexFile(
        generatedTypes,
        generatedClients
      );
      files.push(indexFile);
    }

    // Generate barrel exports
    if (this.config.generateBarrelExports) {
      const barrelFile = await this.generateBarrelFile(
        generatedTypes,
        generatedClients
      );
      files.push(barrelFile);
    }

    return files;
  }

  /**
   * Generate types file
   */
  private async generateTypesFile(
    generatedTypes: GeneratedType[]
  ): Promise<GeneratedFile> {
    // Collect all dependencies
    const allDependencies = [
      ...new Set(generatedTypes.flatMap((t) => t.dependencies)),
    ];

    // Generate imports from dependencies
    const imports = this.generateImportsFromDependencies(allDependencies);

    // Generate types content (remove any existing imports from individual types)
    const typesContent = generatedTypes
      .map((type) => {
        // Remove any import statements from the type content
        return type.content
          .replace(/^import\s+.*?from\s+['"][^'"]*['"];?\s*$/gm, "")
          .trim();
      })
      .filter((content) => content.length > 0);

    const content = imports + typesContent.join("\n\n");
    const filePath = path.join(this.config.outputDir, "types.ts");

    await fs.writeFile(filePath, content, "utf-8");

    return {
      path: filePath,
      content,
      type: "type",
      dependencies: allDependencies,
      size: Buffer.byteLength(content, "utf-8"),
    };
  }

  /**
   * Generate client file
   */
  private async generateClientFile(
    client: GeneratedApiClient
  ): Promise<GeneratedFile> {
    // Default to a clean, predictable filename when not provided
    const fileName = this.config.outputFileName || `api-client.ts`;
    const filePath = path.join(this.config.outputDir, fileName);

    await fs.writeFile(filePath, client.content, "utf-8");

    return {
      path: filePath,
      content: client.content,
      type: "client",
      dependencies: client.dependencies,
      size: Buffer.byteLength(client.content, "utf-8"),
    };
  }

  /**
   * Generate index file
   */
  private async generateIndexFile(
    generatedTypes: GeneratedType[],
    generatedClients: GeneratedApiClient[]
  ): Promise<GeneratedFile> {
    const exports: string[] = [];

    // Export types - filter out generic instances
    const allTypeExports = generatedTypes.flatMap((type) => type.exports);
    if (allTypeExports.length > 0) {
      // Filter out generic instances and keep only base types
      const baseTypes = new Set<string>();

      for (const exportName of allTypeExports) {
        if (exportName.includes("<") && exportName.includes(">")) {
          // Extract base type name from generic type
          const baseName = exportName.split("<")[0];
          if (baseName && baseName.trim()) {
            baseTypes.add(baseName);
          }
        } else {
          baseTypes.add(exportName);
        }
      }

      if (baseTypes.size > 0) {
        exports.push(
          `export type { ${Array.from(baseTypes).join(", ")} } from './types';`
        );
      }
    }

    // Export clients
    for (const client of generatedClients) {
      // Re-export only values, not types
      const valueExports = client.exports.filter((e) =>
        e.endsWith("ApiClient")
      );
      if (valueExports.length > 0) {
        // Use configured output file name or default 'api-client.ts'
        const clientFileBase = (
          this.config.outputFileName || `api-client.ts`
        ).replace(/\.ts$/, "");
        exports.push(
          `export { ${valueExports.join(", ")} } from './${clientFileBase}';`
        );
      }
    }

    // Export hooks if generated
    if (this.config.generateHooks) {
      exports.push(`export { createApiHooks } from './hooks';`);
    }

    const content = exports
      .map((line) =>
        line.startsWith("export type") || line.includes(" from ") ? line : line
      )
      .join("\n");
    const filePath = path.join(this.config.outputDir, "index.ts");

    await fs.writeFile(filePath, content, "utf-8");

    return {
      path: filePath,
      content,
      type: "index",
      dependencies: [],
      size: Buffer.byteLength(content, "utf-8"),
    };
  }

  /**
   * Generate barrel file
   */
  private async generateBarrelFile(
    _generatedTypes: GeneratedType[],
    _generatedClients: GeneratedApiClient[]
  ): Promise<GeneratedFile> {
    const clientFileBase = (
      this.config.outputFileName || `api-client.ts`
    ).replace(/\.ts$/, "");
    const content = `// Barrel exports for schemantic generated code
export * from './types';
export * from './${clientFileBase}';
export * from './hooks';
`;

    const filePath = path.join(this.config.outputDir, "barrel.ts");

    await fs.writeFile(filePath, content, "utf-8");

    return {
      path: filePath,
      content,
      type: "barrel",
      dependencies: [],
      size: Buffer.byteLength(content, "utf-8"),
    };
  }

  /**
   * Generate hooks file when enabled
   */
  private async generateHooksFile(): Promise<GeneratedFile | undefined> {
    try {
      const hookGen = new HookGenerator(this.createGenerationContext());
      const hooks = hookGen.generate();
      const filePath = path.join(this.config.outputDir, "hooks.ts");

      await fs.writeFile(filePath, hooks.content, "utf-8");

      return {
        path: filePath,
        content: hooks.content,
        type: "hook",
        dependencies: [],
        size: Buffer.byteLength(hooks.content, "utf-8"),
      };
    } catch {
      // Non-fatal: skip hooks on error
      return undefined;
    }
  }

  /**
   * Calculate generation statistics
   */
  private calculateStatistics(
    generatedTypes: GeneratedType[],
    generatedClients: GeneratedApiClient[],
    generatedFiles: GeneratedFile[],
    generationTime: number
  ): GenerationStatistics {
    const totalEndpoints = generatedClients.reduce(
      (sum, client) => sum + client.endpoints.length,
      0
    );
    const totalSize = generatedFiles.reduce((sum, file) => sum + file.size, 0);

    return {
      totalTypes: generatedTypes.length,
      totalEndpoints,
      totalFiles: generatedFiles.length,
      totalSize,
      generationTime,
      schemaSize: this.schema ? JSON.stringify(this.schema).length : 0,
    };
  }

  /**
   * Create type registry
   */
  private createTypeRegistry(): TypeRegistry {
    const types = new Map<string, GeneratedType>();

    return {
      registerType: (name: string, type: GeneratedType) => {
        types.set(name, type);
      },
      getType: (name: string) => types.get(name),
      getAllTypes: () => Array.from(types.values()),
      getDependencies: (name: string) => {
        const type = types.get(name);
        return type ? type.dependencies : [];
      },
      resolveDependencies: () => {
        const resolved: string[] = [];
        const visited = new Set<string>();

        const resolve = (typeName: string) => {
          if (visited.has(typeName)) return;
          visited.add(typeName);

          const type = types.get(typeName);
          if (type) {
            for (const dep of type.dependencies) {
              resolve(dep);
            }
            resolved.push(typeName);
          }
        };

        for (const typeName of types.keys()) {
          resolve(typeName);
        }

        return resolved;
      },
    };
  }

  /**
   * Get plugin manager
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Get configuration
   */
  getConfig(): TypeSyncConfig {
    return this.config;
  }

  /**
   * Generate import statements from dependencies
   */
  private generateImportsFromDependencies(dependencies: string[]): string {
    if (dependencies.length === 0) {
      return "";
    }

    const imports: string[] = [];

    // Known external package dependencies that should generate imports
    const KNOWN_EXTERNAL_PACKAGES = new Set([
      "zod",
      "class-validator",
      "react-query",
      "crypto-js",
      "performance-hooks",
      "axios",
      "fetch",
    ]);

    // Generate import statements for known external dependencies only
    for (const dep of dependencies) {
      // Only generate imports for known external packages
      // Skip type names that are defined in the same file
      if (!KNOWN_EXTERNAL_PACKAGES.has(dep)) {
        continue; // Skip internal type references
      }

      switch (dep) {
        case "zod":
          imports.push("import { z } from 'zod';");
          break;
        case "class-validator":
          imports.push(
            "import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty, MinLength, MaxLength, Min, Max, Matches } from 'class-validator';"
          );
          break;
        case "react-query":
          imports.push(
            "import { useQuery, useMutation, useQueryClient } from 'react-query';"
          );
          break;
        case "crypto-js":
          imports.push("import CryptoJS from 'crypto-js';");
          break;
        case "performance-hooks":
          imports.push("import { performance } from 'perf_hooks';");
          break;
        case "axios":
          imports.push("import axios from 'axios';");
          break;
        case "fetch":
          // fetch is a global in modern environments, no import needed
          break;
        // Add more external dependencies as needed
        default:
          // Should not reach here due to the filter above
          console.warn(`Unknown external dependency: ${dep}`);
          break;
      }
    }

    return imports.length > 0 ? imports.join("\n") + "\n\n" : "";
  }
}
