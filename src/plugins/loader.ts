/**
 * Plugin loader for dynamic plugin loading
 * Handles loading plugins from various sources (files, packages, etc.)
 */

import * as fs from "fs/promises";
import * as path from "path";
import { SchemanticPlugin } from "../types/core";

/**
 * Plugin loader class
 */
export class PluginLoader {
  private loadedPlugins: Map<string, SchemanticPlugin> = new Map();

  /**
   * Load plugin from file path
   */
  async loadPluginFromFile(filePath: string): Promise<SchemanticPlugin> {
    try {
      // Check if file exists
      await fs.access(filePath);

      // Load the module
      const pluginModule = await import(path.resolve(filePath));

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
  async loadPluginFromPackage(packageName: string): Promise<SchemanticPlugin> {
    try {
      // Load the package
      const pluginModule = await import(packageName);

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
          (entry.name.endsWith(".js") || entry.name.endsWith(".ts"))
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
    if (!plugin.name || typeof plugin.name !== "string") {
      throw new Error("Plugin must have a valid name");
    }

    if (!plugin.version || typeof plugin.version !== "string") {
      throw new Error("Plugin must have a valid version");
    }

    if (!plugin.description || typeof plugin.description !== "string") {
      throw new Error("Plugin must have a valid description");
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
