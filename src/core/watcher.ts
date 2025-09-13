/**
 * File watcher for automatic type regeneration
 * Monitors schema files and triggers regene        // Set up event handlers
        this.watcher
          .on('add', (filePath: string) => this.handleFileEvent(filePath, 'add'))
          .on('change', (filePath: string) => this.handleFileEvent(filePath, 'change'))
          .on('unlink', (filePath: string) => this.handleFileEvent(filePath, 'unlink'))
          .on('error', (error: Error) => {
            console.error('File watcher error:', error);
            reject(error);
          })en changes are detected
 */

import * as fs from "fs";
import * as path from "path";
import * as chokidar from "chokidar";
import { TypeSync } from "../core/typesync";
import { TypeSyncConfig } from "../types/core";

export interface WatchOptions {
  /**
   * Paths to watch for changes
   */
  watchPaths: string[];

  /**
   * File patterns to watch (default: ['*.json', '*.yaml', '*.yml'])
   */
  patterns?: string[];

  /**
   * Debounce delay in milliseconds (default: 500)
   */
  debounceMs?: number;

  /**
   * Whether to ignore initial events (default: true)
   */
  ignoreInitial?: boolean;

  /**
   * Custom callback for watch events
   */
  onFileChange?: (
    filePath: string,
    eventType: "add" | "change" | "unlink"
  ) => void;

  /**
   * Custom callback for generation events
   */
  onGeneration?: (success: boolean, error?: Error) => void;
}

/**
 * File watcher class for automatic regeneration
 */
export class TypeSyncWatcher {
  private watcher?: chokidar.FSWatcher | undefined;
  private debounceTimer?: NodeJS.Timeout | undefined;
  private config: TypeSyncConfig;
  private options: Required<WatchOptions>;

  constructor(config: TypeSyncConfig, options: WatchOptions) {
    this.config = config;
    this.options = {
      watchPaths: options.watchPaths,
      patterns: options.patterns || ["*.json", "*.yaml", "*.yml"],
      debounceMs: options.debounceMs || 500,
      ignoreInitial: options.ignoreInitial ?? true,
      onFileChange: options.onFileChange || (() => {}),
      onGeneration: options.onGeneration || (() => {}),
    };
  }

  /**
   * Start watching for file changes
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Validate watch paths
        for (const watchPath of this.options.watchPaths) {
          if (!fs.existsSync(watchPath)) {
            throw new Error(`Watch path does not exist: ${watchPath}`);
          }
        }

        // Configure watcher
        this.watcher = chokidar.watch(this.options.watchPaths, {
          ignored: /(^|[\/\\])\../, // ignore dotfiles
          persistent: true,
          ignoreInitial: this.options.ignoreInitial,
        });

        // Add file pattern filters
        const watchGlobs = this.options.watchPaths.flatMap((watchPath) =>
          this.options.patterns.map((pattern) =>
            path.join(watchPath, "**", pattern)
          )
        );

        this.watcher.add(watchGlobs);

        // Set up event handlers
        this.watcher
          .on("add", (filePath) => this.handleFileEvent(filePath, "add"))
          .on("change", (filePath) => this.handleFileEvent(filePath, "change"))
          .on("unlink", (filePath) => this.handleFileEvent(filePath, "unlink"))
          .on("error", (error) => {
            console.error("File watcher error:", error);
            reject(error);
          })
          .on("ready", () => {
            console.log(
              `🔍 Watching for changes in: ${this.options.watchPaths.join(
                ", "
              )}`
            );
            console.log(`📁 Patterns: ${this.options.patterns.join(", ")}`);
            resolve();
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop watching for file changes
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
      console.log("📴 File watcher stopped");
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  /**
   * Handle file system events
   */
  private handleFileEvent(
    filePath: string,
    eventType: "add" | "change" | "unlink"
  ): void {
    console.log(
      `📄 ${eventType.toUpperCase()}: ${path.relative(process.cwd(), filePath)}`
    );

    // Call custom callback
    this.options.onFileChange(filePath, eventType);

    // Debounce regeneration
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.triggerRegeneration(filePath, eventType);
    }, this.options.debounceMs);
  }

  /**
   * Trigger type regeneration
   */
  private async triggerRegeneration(
    triggerFile: string,
    eventType: string
  ): Promise<void> {
    try {
      console.log(
        `🔄 Regenerating types (triggered by ${eventType} of ${path.relative(
          process.cwd(),
          triggerFile
        )})...`
      );

      // Create TypeSync instance with current config
      const typeSync = new TypeSync(this.config);

      // Generate types
      const result = await typeSync.generate();

      if (result.success) {
        console.log(
          `✅ Types regenerated successfully (${result.statistics.generationTime}ms)`
        );
        console.log(`📊 Generated ${result.generatedFiles.length} files`);
        this.options.onGeneration(true);
      } else {
        console.error("❌ Type regeneration failed:");
        result.errors.forEach((error) => {
          console.error(`  - ${error.message}`);
        });
        this.options.onGeneration(
          false,
          new Error(result.errors.map((e) => e.message).join(", "))
        );
      }
    } catch (error) {
      console.error("❌ Type regeneration failed:", error);
      this.options.onGeneration(false, error as Error);
    }
  }

  /**
   * Get information about watched files
   */
  getWatchedFiles(): string[] {
    if (!this.watcher) {
      return [];
    }

    return Object.keys(this.watcher.getWatched()).reduce(
      (files: string[], dir) => {
        const dirFiles = this.watcher!.getWatched()[dir];
        if (dirFiles) {
          return files.concat(
            dirFiles.map((file: string) => path.join(dir, file))
          );
        }
        return files;
      },
      []
    );
  }

  /**
   * Check if watcher is running
   */
  isWatching(): boolean {
    return this.watcher !== undefined;
  }
}

/**
 * Create and start a file watcher
 */
export async function createWatcher(
  config: TypeSyncConfig,
  options: WatchOptions
): Promise<TypeSyncWatcher> {
  const watcher = new TypeSyncWatcher(config, options);
  await watcher.start();
  return watcher;
}

/**
 * Watch a single schema file
 */
export async function watchSchemaFile(
  schemaFile: string,
  config: TypeSyncConfig,
  options?: Partial<WatchOptions>
): Promise<TypeSyncWatcher> {
  const watchDir = path.dirname(path.resolve(schemaFile));

  return createWatcher(config, {
    watchPaths: [watchDir],
    patterns: [path.basename(schemaFile)],
    ...options,
  });
}

/**
 * Watch multiple schema files
 */
export async function watchSchemaFiles(
  schemaFiles: string[],
  config: TypeSyncConfig,
  options?: Partial<WatchOptions>
): Promise<TypeSyncWatcher> {
  // Group files by directory for efficient watching
  const dirMap = new Map<string, string[]>();

  for (const file of schemaFiles) {
    const dir = path.dirname(path.resolve(file));
    const basename = path.basename(file);

    if (!dirMap.has(dir)) {
      dirMap.set(dir, []);
    }
    dirMap.get(dir)!.push(basename);
  }

  // Watch all directories with their specific patterns
  const watchPaths = Array.from(dirMap.keys());
  const patterns = Array.from(new Set(Array.from(dirMap.values()).flat()));

  return createWatcher(config, {
    watchPaths,
    patterns,
    ...options,
  });
}
