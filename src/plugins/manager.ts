/**
 * Plugin manager for the schemantic system
 * Handles loading, registration, and execution of plugins
 */

import {
  SchemanticPlugin,
  GenerationContext,
  GenerationResult,
  GeneratedType,
  GeneratedApiClient,
} from "../types/core";
import { ResolvedSchema } from "../types/schema";

/**
 * Plugin manager class
 */
export class PluginManager {
  private plugins: Map<string, SchemanticPlugin> = new Map();
  private enabledPlugins: Set<string> = new Set();

  /**
   * Register a plugin
   */
  registerPlugin(plugin: SchemanticPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(name: string): void {
    this.plugins.delete(name);
    this.enabledPlugins.delete(name);
  }

  /**
   * Enable a plugin
   */
  enablePlugin(name: string): void {
    if (this.plugins.has(name)) {
      this.enabledPlugins.add(name);
    }
  }

  /**
   * Disable a plugin
   */
  disablePlugin(name: string): void {
    this.enabledPlugins.delete(name);
  }

  /**
   * Check if a plugin is enabled
   */
  isPluginEnabled(name: string): boolean {
    return this.enabledPlugins.has(name);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): SchemanticPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): SchemanticPlugin[] {
    return Array.from(this.enabledPlugins)
      .map((name) => this.plugins.get(name))
      .filter((plugin): plugin is SchemanticPlugin => plugin !== undefined);
  }

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): SchemanticPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Execute before generation hook
   */
  async executeBeforeGeneration(context: GenerationContext): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.beforeGeneration) {
        try {
          await plugin.beforeGeneration(context);
        } catch (error) {
          console.warn(
            `Plugin ${plugin.name} beforeGeneration hook failed:`,
            error
          );
        }
      }
    }
  }

  /**
   * Execute after generation hook
   */
  async executeAfterGeneration(
    context: GenerationContext,
    result: GenerationResult
  ): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.afterGeneration) {
        try {
          await plugin.afterGeneration(context, result);
        } catch (error) {
          console.warn(
            `Plugin ${plugin.name} afterGeneration hook failed:`,
            error
          );
        }
      }
    }
  }

  /**
   * Execute before type generation hook
   */
  async executeBeforeTypeGeneration(
    typeName: string,
    schema: ResolvedSchema,
    context: GenerationContext
  ): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.beforeTypeGeneration) {
        try {
          await plugin.beforeTypeGeneration(typeName, schema, context);
        } catch (error) {
          console.warn(
            `Plugin ${plugin.name} beforeTypeGeneration hook failed:`,
            error
          );
        }
      }
    }
  }

  /**
   * Execute after type generation hook
   */
  async executeAfterTypeGeneration(
    typeName: string,
    generatedType: GeneratedType,
    context: GenerationContext
  ): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.afterTypeGeneration) {
        try {
          await plugin.afterTypeGeneration(typeName, generatedType, context);
        } catch (error) {
          console.warn(
            `Plugin ${plugin.name} afterTypeGeneration hook failed:`,
            error
          );
        }
      }
    }
  }

  /**
   * Execute before client generation hook
   */
  async executeBeforeClientGeneration(
    context: GenerationContext
  ): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.beforeClientGeneration) {
        try {
          await plugin.beforeClientGeneration(context);
        } catch (error) {
          console.warn(
            `Plugin ${plugin.name} beforeClientGeneration hook failed:`,
            error
          );
        }
      }
    }
  }

  /**
   * Execute after client generation hook
   */
  async executeAfterClientGeneration(
    generatedClient: GeneratedApiClient,
    context: GenerationContext
  ): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.afterClientGeneration) {
        try {
          await plugin.afterClientGeneration(generatedClient, context);
        } catch (error) {
          console.warn(
            `Plugin ${plugin.name} afterClientGeneration hook failed:`,
            error
          );
        }
      }
    }
  }

  /**
   * Transform schema using plugins
   */
  transformSchema(
    schema: ResolvedSchema,
    context: GenerationContext
  ): ResolvedSchema {
    let transformedSchema = schema;

    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.transformSchema) {
        try {
          transformedSchema = plugin.transformSchema(
            transformedSchema,
            context
          );
        } catch (error) {
          console.warn(
            `Plugin ${plugin.name} transformSchema hook failed:`,
            error
          );
        }
      }
    }

    return transformedSchema;
  }

  /**
   * Get custom type generators from plugins
   */
  getCustomTypeGenerators(): Map<
    string,
    (schema: ResolvedSchema, context: GenerationContext) => GeneratedType
  > {
    const generators = new Map<
      string,
      (schema: ResolvedSchema, context: GenerationContext) => GeneratedType
    >();

    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.customTypeGenerators) {
        for (const [name, generator] of Object.entries(
          plugin.customTypeGenerators
        )) {
          generators.set(`${plugin.name}:${name}`, generator);
        }
      }
    }

    return generators;
  }

  /**
   * Get custom client generators from plugins
   */
  getCustomClientGenerators(): Map<
    string,
    (context: GenerationContext) => GeneratedApiClient
  > {
    const generators = new Map<
      string,
      (context: GenerationContext) => GeneratedApiClient
    >();

    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.customClientGenerators) {
        for (const [name, generator] of Object.entries(
          plugin.customClientGenerators
        )) {
          generators.set(`${plugin.name}:${name}`, generator);
        }
      }
    }

    return generators;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.enabledPlugins.clear();
  }

  /**
   * Get plugin statistics
   */
  getStatistics(): PluginStatistics {
    return {
      totalPlugins: this.plugins.size,
      enabledPlugins: this.enabledPlugins.size,
      disabledPlugins: this.plugins.size - this.enabledPlugins.size,
      pluginNames: Array.from(this.plugins.keys()),
    };
  }
}

/**
 * Plugin statistics
 */
export interface PluginStatistics {
  totalPlugins: number;
  enabledPlugins: number;
  disabledPlugins: number;
  pluginNames: string[];
}
