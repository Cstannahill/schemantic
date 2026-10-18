/**
 * Main Schemantic class
 * Orchestrates the entire type generation process
 */

import * as path from "path";
import { OpenAPISchema, OpenAPISchemaObject } from "../types/openapi";
import { ResolvedSchema } from "../types/schema";
import {
  SchemanticConfig,
  GenerationContext,
  GenerationResult,
  GeneratedType,
  GeneratedApiClient,
  GeneratedFile,
  GenerationError,
  GenerationWarning,
  GenerationStatistics,
  TypeRegistry,
  SchemanticOptions,
} from "../types/core";

// Re-export commonly used types and constants
export { SchemanticConfig, DEFAULT_CONFIG } from "../types/core";
import { ParserFactory } from "../parsers";
import { TypeGeneratorFactory } from "../generators";
import { ApiClientGenerator } from "../generators/api-client-generator";
import { HookGenerator } from "../generators/hook-generator";
import { PluginManager, getBuiltinPlugins } from "../plugins";
import { referenceName, typeName } from '../generators/schema-type';
import { resolveConfiguration } from './configuration';
import { validateOutputNames, writeOutput } from './output-writer';
import { addSchemaProjections, ProjectionNames } from '../generators/projections';
import { generateConversionFile, renameSchemaProperties } from '../generators/naming';

/**
 * Main Schemantic class
 */
export class Schemantic {
  private config: SchemanticConfig;
  private pluginManager: PluginManager;
  private schema?: OpenAPISchema;
  private wireSchema?: OpenAPISchema;
  private resolvedSchemas: Map<string, ResolvedSchema> = new Map();
  private typeRegistry: TypeRegistry;
  private selectedSchemaNames: Set<string> | undefined;
  private clientFileNames = new Map<string, string>();
  private projections: ProjectionNames = {};

  constructor(config: SchemanticOptions) {
    this.config = resolveConfiguration(config);
    this.pluginManager = new PluginManager();
    for (const plugin of getBuiltinPlugins()) this.pluginManager.registerPlugin(plugin);
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
      this.config = resolveConfiguration(this.config);
      if (this.config.generateHooks && !this.config.generateApiClient) throw new Error('React hooks require API client generation');
      for (const plugin of this.config.plugins || []) {
        if (plugin.enabled) {
          if (!this.pluginManager.getPlugin(plugin.name)) throw new Error(`Unknown plugin: ${plugin.name}`);
          this.pluginManager.enablePlugin(plugin.name);
        } else this.pluginManager.disablePlugin(plugin.name);
      }
      this.resolvedSchemas.clear();
      this.selectedSchemaNames = undefined;
      this.clientFileNames.clear();
      this.typeRegistry = this.createTypeRegistry();
      // Load and parse schema
      let schema = JSON.parse(JSON.stringify(await this.loadSchema())) as OpenAPISchema;
      const validation = await ParserFactory.autoCreateParser({ data: schema }, this.config).validate(schema);
      warnings.push(...validation.warnings);
      if (!validation.isValid) {
        errors.push(...validation.errors);
        throw new Error('OpenAPI schema validation failed');
      }
      this.schema = schema;
      this.filterSchema(schema);
      this.validateReferences(schema);
      this.projections = addSchemaProjections(schema, ParserFactory.autoCreateParser({ data: schema }, this.config).createResolver(schema), this.selectedSchemaNames);
      this.wireSchema = structuredClone(schema);
      schema = renameSchemaProperties(schema, this.config.propertyNaming ?? 'camelCase');
      this.schema = schema;

      // Create generation context
      const context = this.createGenerationContext();

      // Execute before generation hooks
      await this.pluginManager.executeBeforeGeneration(context);

      // Resolve all schema references
      await this.resolveSchemaReferences(schema);

      // Generate types
      let generatedTypes: GeneratedType[] = [];
      if (this.config.generateTypes || this.config.generateApiClient) {
        generatedTypes = await this.generateTypes(context);
      }

      // Generate API client
      let generatedClients: GeneratedApiClient[] = [];
      if (this.config.generateApiClient) {
        generatedClients = await this.generateApiClients(context);
      }

      // Generate files
      const files = await this.generateFiles(generatedTypes, generatedClients, context);
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

      if (!result.success || result.errors.some(error => error.severity === 'error')) throw new Error('A plugin rejected generated output');
      await writeOutput(this.config.outputDir, result.generatedFiles);
      result.statistics = this.calculateStatistics(generatedTypes, generatedClients, result.generatedFiles, Date.now() - startTime);

      return result;
    } catch (error) {
      errors.push({
        code: "GENERATION_ERROR",
        message: error instanceof Error ? error.message : String(error),
        severity: "error",
      });

      return {
        success: false,
        generatedFiles: [],
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
    let input: { url?: string; filePath?: string; data?: unknown } = {};

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
  private filterSchema(schema: OpenAPISchema): void {
    const matches = (value: string, patterns: string[] = []) => patterns.some(pattern =>
      new RegExp(`^${pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(value));
    schema.paths = Object.fromEntries(Object.entries(schema.paths).filter(([name]) =>
      (!this.config.includePaths?.length || matches(name, this.config.includePaths)) && !matches(name, this.config.excludePaths)));
    const schemas = schema.components?.schemas;
    if (!schemas) return;
    const selected = new Set(Object.keys(schemas).filter(name =>
      (!this.config.includeSchemas?.length || matches(name, this.config.includeSchemas)) && !matches(name, this.config.excludeSchemas)));
    const collect = (value: unknown, visited = new Set<string>()) => {
      if (!value || typeof value !== 'object') return;
      if ('$ref' in value && typeof value.$ref === 'string') {
        const ref = value.$ref;
        if (visited.has(ref)) return;
        visited.add(ref);
        if (ref.startsWith('#/components/schemas/')) {
          const name = referenceName(ref.split('/').slice(0, 4).join('/'));
          if (matches(name, this.config.excludeSchemas)) throw new Error(`Referenced schema ${name} is explicitly excluded`);
          selected.add(name);
          collect(schemas[name], visited);
        } else {
          const resolver = ParserFactory.autoCreateParser({ data: schema }, this.config).createResolver(schema);
          collect(resolver(ref), visited);
        }
      }
      for (const child of Object.values(value)) collect(child, visited);
    };
    if (this.config.generateApiClient || this.config.generateHooks) collect(schema.paths);
    for (const name of [...selected]) collect(schemas[name]);
    this.selectedSchemaNames = selected;
  }

  private validateReferences(schema: OpenAPISchema): void {
    const resolver = ParserFactory.autoCreateParser({ data: schema }, this.config).createResolver(schema);
    const walk = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if ('$ref' in value && typeof value.$ref === 'string' && !resolver(value.$ref)) {
        throw new Error(`Unresolved or unsupported reference: ${value.$ref}`);
      }
      for (const child of Object.values(value)) walk(child);
    };
    walk(schema);
  }

  private createGenerationContext(): GenerationContext {
    return {
      config: this.config,
      schema: this.schema!,
      resolvedSchemas: this.resolvedSchemas,
      generatedTypes: new Map(),
      generatedClients: new Map(),
      typeRegistry: this.typeRegistry,
      schemaResolver: ParserFactory.autoCreateParser({ data: this.schema! }, this.config).createResolver(this.schema!),
      projections: this.projections,
      wireSchema: this.wireSchema!,
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
      if (this.selectedSchemaNames && !this.selectedSchemaNames.has(name)) continue;
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
        if (this.typeRegistry.getType(generatedType.name)) {
          throw new Error(`Multiple schemas generate the type name ${generatedType.name}`);
        }
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
      for (const [name, generator] of this.pluginManager.getCustomTypeGenerators()) {
        const customType = generator(transformedSchema, context);
        if (this.typeRegistry.getType(customType.name)) throw new Error(`Custom generator ${name} produced duplicate type ${customType.name}`);
        this.typeRegistry.registerType(customType.name, customType);
        context.generatedTypes.set(customType.name, customType);
        generatedTypes.push(customType);
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
        const customClient = generator(context);
        if (context.generatedClients.has(customClient.name)) throw new Error(`Custom generator ${name} produced duplicate client ${customClient.name}`);
        context.generatedClients.set(customClient.name, customClient);
        generatedClients.push(customClient);
    }

    return generatedClients;
  }

  /**
   * Generate files from generated types and clients
   */
  private async generateFiles(
    generatedTypes: GeneratedType[],
    generatedClients: GeneratedApiClient[],
    context: GenerationContext,
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const exportedTypes = new Set<string>();
    for (const type of generatedTypes) {
      for (const name of new Set(type.exports)) {
        if (exportedTypes.has(name)) throw new Error(`Generated type export collision: ${name}`);
        exportedTypes.add(name);
      }
    }
    const publicNames = new Set(exportedTypes);
    const reserveExport = (name: string) => {
      if (publicNames.has(name)) throw new Error(`Generated public export collision: ${name}; rename the schema or configure a type prefix/suffix`);
      publicNames.add(name);
    };
    for (const client of generatedClients) for (const name of new Set(client.exports)) reserveExport(name);
    if (this.config.generateHooks) reserveExport('createApiHooks');
    if (this.config.propertyNaming === 'camelCase') {
      reserveExport('serializeValue'); reserveExport('deserializeValue');
      for (const name of Object.keys(this.wireSchema?.components?.schemas || {}).map(name => this.typeRegistry.getType(typeName(name, this.config.typePrefix, this.config.typeSuffix))?.name).filter((name): name is string => !!name)) {
        reserveExport('serialize' + name); reserveExport('deserialize' + name);
      }
    }
    const names = ['types.ts', 'index.ts', 'hooks.ts', 'conversion.ts'];
    for (const [index, client] of generatedClients.entries()) {
      const fileName = index === 0 ? this.config.outputFileName || 'api-client.ts' : client.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() + '.ts';
      if (path.isAbsolute(fileName) || fileName.split(/[\\/]/).includes('..') || !fileName.endsWith('.ts')) throw new Error(`Invalid output filename: ${fileName}`);
      validateOutputNames([...names, fileName]);
      names.push(fileName);
      this.clientFileNames.set(client.name, fileName);
    }

    // Generate types file
    if (generatedTypes.length > 0) {
      const typesFile = await this.generateTypesFile(generatedTypes);
      files.push(typesFile);
    }
    if (this.config.propertyNaming === 'camelCase') files.push(generateConversionFile(context, this.wireSchema!));

    // Generate client files
    for (const client of generatedClients) {
      const clientFile = await this.generateClientFile(client);
      files.push(clientFile);
    }

    // Generate hooks file (first-party) when enabled
    if (this.config.generateHooks) {
      const hooksFile = await this.generateHooksFile(context, generatedClients[0]);
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

    // Barrel exports removed: all exports consolidated in index.ts

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
    const imports = new Map<string, string>();
    const collectImport = (statement: string) => {
      const key = statement.replace(/\s+/g, '').replace(/"/g, "'").replace(/;$/, '');
      imports.set(key, statement.trim());
    };
    this.generateImportsFromDependencies(allDependencies).split('\n').filter(line => line.trim()).forEach(collectImport);

    // Generate types content ordered by dependencies.
    // Preserve each GeneratedType.content as a whole (except stripping any import lines),
    // then emit in an order where dependencies appear before dependents using the typeRegistry.
    const typeContentMap: Record<string, string> = {};
    for (const t of generatedTypes) {
      const cleaned = t.content
        .replace(/^[ \t]*import\s+(?:[\s\S]*?\s+from\s+)?['"][^'"]+['"];?[ \t]*(?:\r?\n|$)/gm, statement => { collectImport(statement); return ''; })
        .trim();
      if (cleaned.length > 0) typeContentMap[t.name] = cleaned;
    }

    const orderedNames = this.typeRegistry.resolveDependencies();

    const emittedBlocks: string[] = [];

    for (const name of orderedNames) {
      if (typeContentMap[name]) {
        emittedBlocks.push(typeContentMap[name]);
        delete typeContentMap[name];
      }
    }

    // Append any remaining types (defensive)
    for (const rem of Object.values(typeContentMap)) {
      emittedBlocks.push(rem);
    }

    const content = [...imports.values()].join('\n') + (imports.size ? '\n\n' : '') + emittedBlocks.join("\n\n");
    const filePath = path.join(this.config.outputDir, "types.ts");

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
    const fileName = this.clientFileNames.get(client.name)!;
    const filePath = path.join(this.config.outputDir, fileName);

    let typeImport = path.relative(path.dirname(filePath), path.join(this.config.outputDir, 'types.js')).replace(/\\/g, '/');
    if (!typeImport.startsWith('.')) typeImport = './' + typeImport;
    let conversionImport = path.relative(path.dirname(filePath), path.join(this.config.outputDir, 'conversion.js')).replace(/\\/g, '/');
    if (!conversionImport.startsWith('.')) conversionImport = './' + conversionImport;
    const content = client.content.replace(/from (['"])\.\/types(?:\.js)?\1/g, `from '${typeImport}'`)
      .replace(/from (['"])\.\/conversion\.js\1/g, `from '${conversionImport}'`);

    return {
      path: filePath,
      content,
      type: "client",
      dependencies: client.dependencies,
      size: Buffer.byteLength(content, "utf-8"),
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

    if (generatedTypes.length) exports.push("export * from './types.js';");
    if (this.config.propertyNaming === 'camelCase') exports.push("export * from './conversion.js';");

    // Export clients
    for (const client of generatedClients) {
      // Re-export only values, not types
      const valueExports = client.exports;
      if (valueExports.length > 0) {
        // Use configured output file name or default 'api-client.ts'
        const clientFileBase = this.clientFileNames.get(client.name)!.replace(/\.ts$/, "").replace(/\\/g, '/');
        exports.push(
          `export { ${valueExports.join(", ")} } from './${clientFileBase}.js';`
        );
        if (client === generatedClients[0]) exports.push(`export type { ApiClientConfig } from './${clientFileBase}.js';`);
      }
    }

    // Export hooks if generated
    if (this.config.generateHooks) {
      exports.push(`export { createApiHooks } from './hooks.js';`);
    }

    const content = exports
      .map((line) =>
        line.startsWith("export type") || line.includes(" from ") ? line : line
      )
      .join("\n");
    const filePath = path.join(this.config.outputDir, "index.ts");

    return {
      path: filePath,
      content,
      type: "index",
      dependencies: [],
      size: Buffer.byteLength(content, "utf-8"),
    };
  }

  /**
   * Generate hooks file when enabled
   */
  private async generateHooksFile(context: GenerationContext, client?: GeneratedApiClient): Promise<GeneratedFile> {
      const hookGen = new HookGenerator(context);
      const hooks = hookGen.generate(client);
      const filePath = path.join(this.config.outputDir, "hooks.ts");

      return {
        path: filePath,
        content: hooks.content,
        type: "hook",
        dependencies: [],
        size: Buffer.byteLength(hooks.content, "utf-8"),
      };
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
  getConfig(): SchemanticConfig {
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
