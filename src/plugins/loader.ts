/**
 * Plugin loader for dynamic plugin loading
 * Handles loading plugins from various sources (files, packages, etc.)
 */

import * as fs from "fs/promises";
import * as path from "path";
import { SchemanticPlugin } from "../types/core";
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

/**
 * Plugin loader class
 */
export class PluginLoader {
  private loadedPlugins: Map<string, SchemanticPlugin> = new Map();

  static isFileSpecifier(specifier: string): boolean {
    return path.isAbsolute(specifier) || specifier.startsWith('.') || /\.(?:cjs|mjs|js)$/.test(specifier);
  }

  /** Resolve against the consumer's directory, rather than this package's installation. */
  async loadPlugin(specifier: string, directory = process.cwd()): Promise<SchemanticPlugin> {
    return PluginLoader.isFileSpecifier(specifier)
      ? this.loadPluginFromFile(path.resolve(directory, specifier))
      : this.loadPluginFromPackage(specifier, directory);
  }

  private async loadModule(resolvedPath: string): Promise<unknown> {
    const requireModule = createRequire(path.resolve(resolvedPath));
    try { return requireModule(resolvedPath); } catch (error) {
      if (!['ERR_REQUIRE_ESM', 'ERR_REQUIRE_ASYNC_MODULE'].includes((error as NodeJS.ErrnoException).code || '')) throw error;
      // Native import is necessary: TypeScript's CommonJS import rewrite cannot load ESM.
      const nativeImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;
      return nativeImport(pathToFileURL(resolvedPath).href);
    }
  }

  /**
   * Load plugin from file path
   */
  async loadPluginFromFile(filePath: string): Promise<SchemanticPlugin> {
    try {
      // Check if file exists
      await fs.access(filePath);

      // Load the module
      const pluginModule = await this.loadModule(path.resolve(filePath));

      // Extract plugin from module
      const plugin = this.extractPluginFromModule(pluginModule);

      if (!plugin) {
        throw new Error(`No valid plugin found in ${filePath}`);
      }

      // Validate plugin
      this.validatePlugin(plugin);

      // Store loaded plugin
      this.loadedPlugins.set(plugin.name, plugin);

      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from ${filePath}: ${error}`);
    }
  }

  /**
   * Load plugin from package
   */
  async loadPluginFromPackage(packageName: string, directory = process.cwd()): Promise<SchemanticPlugin> {
    try {
      // Load the package
      const consumerRequire = createRequire(path.resolve(directory, '__schemantic_plugin__.cjs'));
      const pluginModule = await this.loadModule(consumerRequire.resolve(packageName));

      // Extract plugin from module
      const plugin = this.extractPluginFromModule(pluginModule);

      if (!plugin) {
        throw new Error(`No valid plugin found in package ${packageName}`);
      }

      // Validate plugin
      this.validatePlugin(plugin);

      // Store loaded plugin
      this.loadedPlugins.set(plugin.name, plugin);

      return plugin;
    } catch (error) {
      throw new Error(
        `Failed to load plugin from package ${packageName}: ${error}`
      );
    }
  }

  /**
   * Load plugins from directory
   */
  async loadPluginsFromDirectory(
    directoryPath: string
  ): Promise<SchemanticPlugin[]> {
    try {
      const plugins: SchemanticPlugin[] = [];

      // Read directory contents
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        if (
          entry.isFile() &&
          /\.(?:js|cjs|mjs)$/.test(entry.name)
        ) {
          const filePath = path.join(directoryPath, entry.name);

          try {
            const plugin = await this.loadPluginFromFile(filePath);
            plugins.push(plugin);
          } catch (error) {
            console.warn(`Failed to load plugin from ${filePath}:`, error);
          }
        }
      }

      return plugins;
    } catch (error) {
      throw new Error(
        `Failed to load plugins from directory ${directoryPath}: ${error}`
      );
    }
  }

  /**
   * Load plugin from object
   */
  loadPluginFromObject(plugin: SchemanticPlugin): SchemanticPlugin {
    // Validate plugin
    this.validatePlugin(plugin);

    // Store loaded plugin
    this.loadedPlugins.set(plugin.name, plugin);

    return plugin;
  }

  /**
   * Extract plugin from module
   */
  private extractPluginFromModule(
    module: unknown
  ): SchemanticPlugin | undefined {
    // Try different export patterns
    if (
      typeof module === "object" &&
      module !== null &&
      "default" in module &&
      this.isValidPlugin((module as { default: unknown }).default)
    ) {
      return (module as { default: SchemanticPlugin }).default;
    }

    if (
      typeof module === "object" &&
      module !== null &&
      "plugin" in module &&
      this.isValidPlugin((module as { plugin: unknown }).plugin)
    ) {
      return (module as { plugin: SchemanticPlugin }).plugin;
    }

    if (this.isValidPlugin(module)) {
      return module;
    }

    // Look for plugin in exports
    if (typeof module === "object" && module !== null) {
      for (const [, value] of Object.entries(
        module as Record<string, unknown>
      )) {
        if (this.isValidPlugin(value)) {
          return value as SchemanticPlugin;
        }
      }
    }

    return undefined;
  }

  /**
   * Check if object is a valid plugin
   */
  private isValidPlugin(obj: unknown): obj is SchemanticPlugin {
    if (!obj || typeof obj !== "object") return false;
    const maybe = obj as Partial<SchemanticPlugin>;
    return (
      typeof maybe.name === "string" &&
      typeof maybe.version === "string" &&
      typeof maybe.description === "string"
    );
  }

  /**
   * Validate plugin
   */
  private validatePlugin(plugin: SchemanticPlugin): void {
    if (typeof plugin.name !== "string" || !plugin.name.trim()) {
      throw new Error("Plugin must have a valid name");
    }

    if (!plugin.version || typeof plugin.version !== "string") {
      throw new Error("Plugin must have a valid version");
    }

    if (!plugin.description || typeof plugin.description !== "string") {
      throw new Error("Plugin must have a valid description");
    }

    const hooks = ['beforeGeneration', 'afterGeneration', 'beforeTypeGeneration', 'afterTypeGeneration',
      'beforeClientGeneration', 'afterClientGeneration', 'transformSchema'] as const;
    for (const hook of hooks) {
      if (plugin[hook] !== undefined && typeof plugin[hook] !== 'function') throw new Error(`Plugin ${plugin.name} ${hook} must be a function`);
    }
    for (const key of ['customTypeGenerators', 'customClientGenerators'] as const) {
      const generators = plugin[key];
      if (generators !== undefined && (typeof generators !== 'object' || generators === null || Array.isArray(generators)
        || Object.values(generators).some(generator => typeof generator !== 'function'))) throw new Error(`Plugin ${plugin.name} ${key} must be a record of functions`);
    }

    // Check for duplicate names
    if (this.loadedPlugins.has(plugin.name)) {
      throw new Error(`Plugin with name '${plugin.name}' is already loaded`);
    }
  }

  /**
   * Get loaded plugin
   */
  getLoadedPlugin(name: string): SchemanticPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * Get all loaded plugins
   */
  getAllLoadedPlugins(): SchemanticPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Clear loaded plugins
   */
  clear(): void {
    this.loadedPlugins.clear();
  }

  /**
   * Get loading statistics
   */
  getStatistics(): LoadingStatistics {
    return {
      loadedPlugins: this.loadedPlugins.size,
      pluginNames: Array.from(this.loadedPlugins.keys()),
    };
  }
}

/**
 * Loading statistics
 */
export interface LoadingStatistics {
  loadedPlugins: number;
  pluginNames: string[];
}

/**
 * Plugin loading options
 */
export interface PluginLoadingOptions {
  /**
   * Whether to continue loading other plugins if one fails
   */
  continueOnError?: boolean;

  /**
   * Whether to validate plugins after loading
   */
  validate?: boolean;

  /**
   * Custom validation function
   */
  customValidator?: (plugin: SchemanticPlugin) => boolean;
}

/**
 * Convenience function to load plugin from file
 */
export async function loadPluginFromFile(
  filePath: string
): Promise<SchemanticPlugin> {
  const loader = new PluginLoader();
  return loader.loadPluginFromFile(filePath);
}

/**
 * Convenience function to load plugin from package
 */
export async function loadPluginFromPackage(
  packageName: string
): Promise<SchemanticPlugin> {
  const loader = new PluginLoader();
  return loader.loadPluginFromPackage(packageName);
}

/**
 * Convenience function to load plugins from directory
 */
export async function loadPluginsFromDirectory(
  directoryPath: string
): Promise<SchemanticPlugin[]> {
  const loader = new PluginLoader();
  return loader.loadPluginsFromDirectory(directoryPath);
}
