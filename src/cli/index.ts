#!/usr/bin/env node

/**
 * CLI interface for type-sync
 * Provides command-line interface for generating TypeScript types and API clients
 */

import { Command } from "commander";
import { TypeSyncConfig, DEFAULT_CONFIG } from "../types/core";
import { TypeSync } from "../core/typesync";
import { PluginLoader } from "../plugins";
import { getBuiltinPlugins } from "../plugins/builtin";
import { TypeSyncWatcher } from "../core/watcher";
import * as readline from "readline";

// Removed unused CliCommand interface

// Removed unused CliOption interface

/**
 * CLI options interface
 */
interface CliOptions {
  [key: string]: string | boolean | string[];
}

/**
 * Main CLI class
 */
export class TypeSyncCli {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupProgram();
  }

  /**
   * Setup the CLI program
   */
  private setupProgram(): void {
    this.program
      .name("type-sync")
      .description(
        "Generate TypeScript types and API clients from OpenAPI schemas"
      )
      .version("1.0.0")
      .option("-i, --interactive", "Run in interactive mode")
      .option("-v, --verbose", "Verbose output")
      .option("-q, --quiet", "Quiet output")
      .option("--no-color", "Disable colored output");

    // Add commands
    this.addGenerateCommand();
    this.addWatchCommand();
    this.addValidateCommand();
    this.addPluginCommand();
    this.addInitCommand();
  }

  /**
   * Add generate command
   */
  private addGenerateCommand(): void {
    this.program
      .command("generate [source]")
      .alias("gen")
      .description(
        "Generate TypeScript types and API client from OpenAPI schema"
      )
      .option("-u, --url <url>", "OpenAPI schema URL")
      .option("-f, --file <file>", "OpenAPI schema file path")
      .option("-o, --output <dir>", "Output directory", "./src/generated")
      .option("--types", "Generate types only")
      .option("--client", "Generate API client only")
      .option("--hooks", "Generate React hooks")
      .option("--strict", "Use strict TypeScript types", true)
      .option(
        "--naming <convention>",
        "Naming convention (camelCase|snake_case|PascalCase)",
        "camelCase"
      )
      .option("--prefix <prefix>", "Type name prefix", "API")
      .option("--suffix <suffix>", "Type name suffix", "")
      .option("--exclude-paths <paths>", "Exclude paths (comma-separated)")
      .option("--include-paths <paths>", "Include paths (comma-separated)")
      .option(
        "--exclude-schemas <schemas>",
        "Exclude schemas (comma-separated)"
      )
      .option(
        "--include-schemas <schemas>",
        "Include schemas (comma-separated)"
      )
      .option("--plugins <plugins>", "Enable plugins (comma-separated)")
      .option("-c, --config <file>", "Configuration file path")
      .option("--watch", "Watch for changes and regenerate")
      .action(async (source: string, options: CliOptions) => {
        await this.handleGenerateCommand(source, options);
      });
  }

  /**
   * Add watch command
   */
  private addWatchCommand(): void {
    this.program
      .command("watch [source]")
      .description(
        "Watch for schema changes and automatically regenerate types"
      )
      .option("-u, --url <url>", "OpenAPI schema URL")
      .option("-f, --file <file>", "OpenAPI schema file path")
      .option("-o, --output <dir>", "Output directory", "./src/generated")
      .option("--types", "Generate types only")
      .option("--client", "Generate API client only")
      .option("--hooks", "Generate React hooks")
      .option("--strict", "Use strict TypeScript types", true)
      .option(
        "--naming <convention>",
        "Naming convention (camelCase|snake_case|PascalCase)",
        "camelCase"
      )
      .option("--prefix <prefix>", "Type name prefix", "API")
      .option("--suffix <suffix>", "Type name suffix", "")
      .option("--exclude-paths <paths>", "Exclude paths (comma-separated)")
      .option("--include-paths <paths>", "Include paths (comma-separated)")
      .option(
        "--exclude-schemas <schemas>",
        "Exclude schemas (comma-separated)"
      )
      .option(
        "--include-schemas <schemas>",
        "Include schemas (comma-separated)"
      )
      .option("--plugins <plugins>", "Enable plugins (comma-separated)")
      .option("-c, --config <file>", "Configuration file path")
      .option("--debounce <ms>", "Debounce delay in milliseconds", "500")
      .action(async (source: string, options: CliOptions) => {
        await this.handleWatchCommand(source, options);
      });
  }

  /**
   * Add validate command
   */
  private addValidateCommand(): void {
    this.program
      .command("validate [source]")
      .alias("check")
      .description("Validate OpenAPI schema")
      .option("-u, --url <url>", "OpenAPI schema URL")
      .option("-f, --file <file>", "OpenAPI schema file path")
      .option("--fix", "Attempt to fix common issues")
      .action(async (source, options) => {
        await this.handleValidateCommand(source, options);
      });
  }

  /**
   * Add plugin command
   */
  private addPluginCommand(): void {
    const pluginCommand = this.program
      .command("plugin")
      .alias("plugins")
      .description("Manage plugins");

    pluginCommand
      .command("list")
      .alias("ls")
      .description("List available plugins")
      .action(async () => {
        await this.handlePluginListCommand();
      });

    pluginCommand
      .command("load <path>")
      .description("Load plugin from file or package")
      .action(async (path) => {
        await this.handlePluginLoadCommand(path);
      });
  }

  /**
   * Add init command
   */
  private addInitCommand(): void {
    this.program
      .command("init [directory]")
      .description("Initialize a new type-sync configuration")
      .option("-t, --template <template>", "Configuration template", "default")
      .option("--yes", "Skip interactive prompts")
      .action(async (directory, options) => {
        await this.handleInitCommand(directory, options);
      });
  }

  /**
   * Handle generate command
   */
  private async handleGenerateCommand(
    source?: string,
    options: CliOptions = {}
  ): Promise<void> {
    try {
      // Check for interactive mode
      const globalOptions = this.program.opts();
      if (globalOptions.interactive) {
        await this.runInteractiveMode();
        return;
      }

      // Show progress for non-quiet mode
      if (!options.quiet) {
        console.log("🚀 Starting type generation...");
      }

      // Load configuration with progress indicator
      if (!options.quiet) {
        process.stdout.write("📋 Loading configuration... ");
      }
      const config = await this.loadConfiguration(source, options);
      if (!options.quiet) {
        console.log("✓");
      }

      // Validate configuration
      if (!options.quiet) {
        process.stdout.write("🔍 Validating configuration... ");
      }
      await this.validateConfiguration(config);
      if (!options.quiet) {
        console.log("✓");
      }

      // Create TypeSync instance
      if (!options.quiet) {
        process.stdout.write("⚙️  Initializing TypeSync... ");
      }
      const typeSync = new TypeSync(config);
      if (!options.quiet) {
        console.log("✓");
      }

      // Load plugins
      if (!options.quiet) {
        process.stdout.write("🔌 Loading plugins... ");
      }
      await this.loadPlugins(config, typeSync);
      if (!options.quiet) {
        console.log("✓");
      }

      // Generate types and client with progress
      if (!options.quiet) {
        console.log("⚡ Generating TypeScript code...");
      }

      const startTime = Date.now();
      const result = await typeSync.generate();
      const endTime = Date.now();

      // Add timing to result
      if (result.statistics) {
        result.statistics.generationTime = endTime - startTime;
      }

      // Output results
      this.outputResults(result, options);

      // Success exit
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      this.handleError(error, options);
    }
  }

  /**
   * Handle watch command
   */
  private async handleWatchCommand(
    source?: string,
    options: CliOptions = {}
  ): Promise<void> {
    try {
      if (!options.quiet) {
        console.log("🚀 Starting TypeSync watcher...");
        console.log("━".repeat(50));
      }

      // Load configuration with progress indicator
      if (!options.quiet) {
        process.stdout.write("📋 Loading configuration... ");
      }
      const config = await this.loadConfiguration(source, options);
      if (!options.quiet) {
        console.log("✓");
      }

      // Validate configuration
      if (!options.quiet) {
        process.stdout.write("🔍 Validating configuration... ");
      }
      await this.validateConfiguration(config);
      if (!options.quiet) {
        console.log("✓");
      }

      // Create TypeSync instance
      if (!options.quiet) {
        process.stdout.write("⚙️  Initializing TypeSync... ");
      }
      const typeSync = new TypeSync(config);
      if (!options.quiet) {
        console.log("✓");
      }

      // Load plugins
      if (!options.quiet) {
        process.stdout.write("🔌 Loading plugins... ");
      }
      await this.loadPlugins(config, typeSync);
      if (!options.quiet) {
        console.log("✓");
      }

      // Determine what to watch
      const watchPaths: string[] = [];
      if (config.schemaFile) {
        const path = require("path");
        watchPaths.push(path.dirname(config.schemaFile));
      } else {
        // Default to current directory
        watchPaths.push(process.cwd());
      }

      if (!options.quiet) {
        console.log(`🔍 Watching for changes in: ${watchPaths.join(", ")}`);
        console.log(`📁 Patterns: *.json, *.yaml, *.yml`);
      }

      // Create watcher with enhanced callbacks
      const watcher = new TypeSyncWatcher(config, {
        watchPaths,
        patterns: ["*.json", "*.yaml", "*.yml"],
        debounceMs: parseInt(String(options.debounce || "500")),
        onFileChange: (filePath, eventType) => {
          if (!options.quiet) {
            const path = require("path");
            const relativePath = path.relative(process.cwd(), filePath);
            const timestamp = new Date().toLocaleTimeString();
            console.log(
              `📄 ${timestamp} - ${eventType.toUpperCase()}: ${relativePath}`
            );
          }
        },
        onGeneration: (success: boolean, error?: Error) => {
          if (!options.quiet) {
            const timestamp = new Date().toLocaleTimeString();
            if (success) {
              console.log(
                `✅ ${timestamp} - Generation completed successfully!`
              );
            } else {
              console.error(
                `❌ ${timestamp} - Generation failed:`,
                error?.message
              );
              console.error("💡 Check the files and try saving again");
            }
          }
        },
      });

      // Start watching
      if (!options.quiet) {
        process.stdout.write("🎬 Starting file watcher... ");
      }
      await watcher.start();
      if (!options.quiet) {
        console.log("✓");
      }

      // Run initial generation
      if (!options.quiet) {
        console.log("\n🔄 Running initial generation...");
      }

      const startTime = Date.now();
      const result = await typeSync.generate();
      const endTime = Date.now();

      // Add timing to result
      if (result.statistics) {
        result.statistics.generationTime = endTime - startTime;
      }

      this.outputResults(result, options);

      if (!result.success) {
        console.error(
          "⚠️  Initial generation failed, but watch mode is still active"
        );
      }

      // Setup graceful shutdown
      if (!options.quiet) {
        console.log("👀 Watching for changes... Press Ctrl+C to stop");
        console.log("━".repeat(50));
      }

      process.on("SIGINT", async () => {
        if (!options.quiet) {
          console.log("\n🛑 Stopping watcher...");
        }
        await watcher.stop();
        if (!options.quiet) {
          console.log("✅ Watcher stopped successfully. Goodbye!");
        }
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        await watcher.stop();
        process.exit(0);
      });

      // Keep process alive
      await new Promise(() => {}); // This will run indefinitely
    } catch (error) {
      this.handleError(error, options);
    }
  }

  /**
   * Handle validate command
   */
  private async handleValidateCommand(
    source?: string,
    options: CliOptions = {}
  ): Promise<void> {
    try {
      // Load configuration
      const config = await this.loadConfiguration(source, options);

      // Create TypeSync instance
      const typeSync = new TypeSync(config);

      // Validate schema
      const result = await typeSync.validate();

      // Output validation results
      this.outputValidationResults(result, options);
    } catch (error) {
      this.handleError(error, options);
    }
  }

  /**
   * Handle init command
   */
  private async handleInitCommand(
    directory?: string,
    options: CliOptions = {}
  ): Promise<void> {
    try {
      const targetDir = directory || process.cwd();

      if (options.yes) {
        await this.createDefaultConfig(targetDir);
      } else {
        await this.runInitInteractive(targetDir, options);
      }
    } catch (error) {
      this.handleError(error, options);
    }
  }

  /**
   * Handle plugin list command
   */
  private async handlePluginListCommand(): Promise<void> {
    try {
      const builtinPlugins = getBuiltinPlugins();

      console.log("Built-in plugins:");
      for (const plugin of builtinPlugins) {
        console.log(
          `  ${plugin.name} (${plugin.version}) - ${plugin.description}`
        );
      }
    } catch (error) {
      this.handleError(error, {});
    }
  }

  /**
   * Handle plugin load command
   */
  private async handlePluginLoadCommand(path: string): Promise<void> {
    try {
      const loader = new PluginLoader();
      const plugin = await loader.loadPluginFromFile(path);

      console.log(`Loaded plugin: ${plugin.name} (${plugin.version})`);
      console.log(`Description: ${plugin.description}`);
    } catch (error) {
      this.handleError(error, {});
    }
  }

  /**
   * Validate configuration
   */
  private async validateConfiguration(config: TypeSyncConfig): Promise<void> {
    // Check if source exists
    if (config.schemaFile) {
      const fs = await import("fs/promises");
      try {
        await fs.access(config.schemaFile);
      } catch (error) {
        throw new Error(`Schema file not found: ${config.schemaFile}`);
      }
    }

    if (config.schemaUrl) {
      // Basic URL validation
      try {
        new URL(config.schemaUrl);
      } catch (error) {
        throw new Error(`Invalid schema URL: ${config.schemaUrl}`);
      }
    }

    // Check if output directory exists or can be created
    if (config.outputDir) {
      const fs = await import("fs/promises");
      const path = await import("path");

      try {
        const dir = path.dirname(config.outputDir);
        await fs.access(dir);
      } catch (error) {
        // Try to create the directory
        try {
          await fs.mkdir(config.outputDir, { recursive: true });
        } catch (createError) {
          throw new Error(
            `Cannot create output directory: ${config.outputDir}`
          );
        }
      }
    }
  }

  /**
   * Load configuration from options
   */
  private async loadConfiguration(
    source?: string,
    options: CliOptions = {}
  ): Promise<TypeSyncConfig> {
    let config: Partial<TypeSyncConfig> = { ...DEFAULT_CONFIG };

    // Load from config file if specified
    if (options.config) {
      const configFile = await this.loadConfigFile(options.config as string);
      config = { ...config, ...configFile };
    }

    // Handle source parameter (URL or file path)
    if (source) {
      if (source.startsWith("http://") || source.startsWith("https://")) {
        config.schemaUrl = source;
      } else {
        config.schemaFile = source;
      }
    }

    // Override with command line options
    if (options.url) {
      config.schemaUrl = options.url as string;
    }

    if (options.file) {
      config.schemaFile = options.file as string;
    }

    if (options.output) {
      config.outputDir = options.output as string;
    }

    if (options.types) {
      config.generateTypes = true;
    }

    if (options.client) {
      config.generateApiClient = true;
    }

    if (options.hooks) {
      config.generateHooks = true;
    }

    if (options.strict !== undefined) {
      config.useStrictTypes = options.strict as boolean;
    }

    if (options.naming) {
      config.namingConvention = options.naming as
        | "camelCase"
        | "snake_case"
        | "PascalCase";
    }

    if (options.prefix) {
      config.typePrefix = options.prefix as string;
    }

    if (options.suffix) {
      config.typeSuffix = options.suffix as string;
    }

    if (options.excludePaths) {
      config.excludePaths = (options.excludePaths as string).split(",");
    }

    if (options.includePaths) {
      config.includePaths = (options.includePaths as string).split(",");
    }

    if (options.excludeSchemas) {
      config.excludeSchemas = (options.excludeSchemas as string).split(",");
    }

    if (options.includeSchemas) {
      config.includeSchemas = (options.includeSchemas as string).split(",");
    }

    if (options.plugins) {
      config.plugins = (options.plugins as string).split(",").map((name) => ({
        name: name.trim(),
        enabled: true,
      }));
    }

    // Validate required fields
    if (!config.schemaUrl && !config.schemaFile && !config.schemaData) {
      throw new Error(
        "Either source parameter, --url, --file, or schema data must be provided"
      );
    }

    if (!config.outputDir) {
      throw new Error("Output directory must be specified");
    }

    return config as TypeSyncConfig;
  }

  /**
   * Load configuration file
   */
  private async loadConfigFile(
    filePath: string
  ): Promise<Partial<TypeSyncConfig>> {
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(filePath, "utf-8");

      if (filePath.endsWith(".json")) {
        return JSON.parse(content);
      } else if (filePath.endsWith(".js") || filePath.endsWith(".ts")) {
        const module = await import(filePath);
        return module.default || module;
      } else {
        throw new Error(`Unsupported configuration file format: ${filePath}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to load configuration file ${filePath}: ${error}`
      );
    }
  }

  /**
   * Load plugins
   */
  private async loadPlugins(
    config: TypeSyncConfig,
    typeSync: TypeSync
  ): Promise<void> {
    const pluginManager = typeSync.getPluginManager();

    // Load built-in plugins
    const builtinPlugins = getBuiltinPlugins();
    for (const plugin of builtinPlugins) {
      pluginManager.registerPlugin(plugin);
    }

    // Load configured plugins
    if (config.plugins) {
      for (const pluginConfig of config.plugins) {
        if (pluginConfig.enabled) {
          pluginManager.enablePlugin(pluginConfig.name);
        }
      }
    }
  }

  /**
   * Output generation results
   */
  private outputResults(result: any, options: CliOptions): void {
    if (options.quiet) {
      return;
    }

    console.log(); // Empty line for spacing

    if (result.success) {
      console.log("✅ Generation completed successfully!");
      console.log("━".repeat(50));

      // File generation summary
      if (result.generatedFiles && result.generatedFiles.length > 0) {
        console.log(`📁 Generated ${result.generatedFiles.length} files:`);
        result.generatedFiles.forEach((file: any) => {
          const size = file.size ? ` (${this.formatFileSize(file.size)})` : "";
          console.log(`   📄 ${file.path}${size}`);
        });
      } else {
        console.log("� Generated files in output directory");
      }

      // Statistics
      if (result.statistics) {
        console.log("\n�📊 Generation Statistics:");
        console.log(`   🔤 Types: ${result.statistics.totalTypes || 0}`);
        console.log(
          `   🔌 Endpoints: ${result.statistics.totalEndpoints || 0}`
        );
        console.log(`   ⏱️  Time: ${result.statistics.generationTime || 0}ms`);

        if (result.statistics.totalSize) {
          console.log(
            `   📦 Total size: ${this.formatFileSize(
              result.statistics.totalSize
            )}`
          );
        }
      }

      // Next steps
      console.log("\n🎉 Next steps:");
      console.log("   • Import the generated types in your TypeScript files");
      console.log("   • Use the API client to make type-safe requests");
      if (result.hasHooks) {
        console.log("   • Use the React hooks for easy data fetching");
      }
      console.log(
        "   • Run with --watch to automatically regenerate on changes"
      );
    } else {
      console.log("❌ Generation failed!");
      console.log("━".repeat(50));

      if (result.errors && result.errors.length > 0) {
        console.log(`🚨 Found ${result.errors.length} error(s):`);
        result.errors.forEach((error: any, index: number) => {
          console.log(`   ${index + 1}. ${error.message || error}`);
          if (error.details) {
            console.log(`      Details: ${error.details}`);
          }
          if (error.path) {
            console.log(`      Path: ${error.path}`);
          }
        });
      }

      // Warnings
      if (result.warnings && result.warnings.length > 0) {
        console.log(`\n⚠️  Found ${result.warnings.length} warning(s):`);
        result.warnings.forEach((warning: any, index: number) => {
          console.log(`   ${index + 1}. ${warning.message || warning}`);
        });
      }

      console.log("\n💡 Tips for fixing issues:");
      console.log("   • Check your OpenAPI schema for syntax errors");
      console.log("   • Ensure all referenced schemas are defined");
      console.log("   • Verify file paths and permissions");
      console.log("   • Run with --verbose for detailed error information");
    }

    console.log(); // Empty line for spacing
  }

  /**
   * Output validation results
   */
  private outputValidationResults(result: any, options: CliOptions): void {
    if (options.quiet) {
      return;
    }

    console.log(); // Empty line for spacing

    if (result.isValid) {
      console.log("✅ Schema validation passed!");
      console.log("━".repeat(50));
      console.log("🎉 Your OpenAPI schema is valid and ready for generation!");

      if (result.info) {
        console.log("\n📋 Schema Information:");
        if (result.info.title) {
          console.log(`   � Title: ${result.info.title}`);
        }
        if (result.info.version) {
          console.log(`   🏷️  Version: ${result.info.version}`);
        }
        if (result.info.description) {
          console.log(`   📝 Description: ${result.info.description}`);
        }
        if (result.paths) {
          console.log(`   🔌 Endpoints: ${Object.keys(result.paths).length}`);
        }
        if (result.components?.schemas) {
          console.log(
            `   🔤 Schemas: ${Object.keys(result.components.schemas).length}`
          );
        }
      }
    } else {
      console.log("❌ Schema validation failed!");
      console.log("━".repeat(50));

      if (result.errors && result.errors.length > 0) {
        console.log(`🚨 Found ${result.errors.length} error(s):`);
        result.errors.forEach((error: any, index: number) => {
          console.log(`   ${index + 1}. ${error.message || error}`);
          if (error.path) {
            console.log(`      📍 Path: ${error.path}`);
          }
          if (error.code) {
            console.log(`      🔍 Code: ${error.code}`);
          }
        });
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log(`\n⚠️  Found ${result.warnings.length} warning(s):`);
      result.warnings.forEach((warning: any, index: number) => {
        console.log(`   ${index + 1}. ${warning.message || warning}`);
        if (warning.path) {
          console.log(`      📍 Path: ${warning.path}`);
        }
      });

      console.log(
        "\n💡 Warnings don't prevent generation but may affect quality."
      );
    }

    if (!result.isValid) {
      console.log("\n🛠️  Fix these issues and try again:");
      console.log("   • Validate your schema using online OpenAPI validators");
      console.log("   • Check for missing required fields");
      console.log("   • Ensure proper JSON/YAML syntax");
      console.log("   • Verify all $ref references are valid");
    }

    console.log(); // Empty line for spacing
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown, options: CliOptions): void {
    if (options.quiet) {
      process.exit(1);
    }

    // Enhanced error handling with better formatting and actionable advice
    console.error("\n❌ Generation Failed");
    console.error("━".repeat(50));

    if (error instanceof Error) {
      // Parse common error types and provide helpful messages
      if (error.message.includes("ENOENT")) {
        console.error("🚨 File not found");
        console.error(`   ${error.message}`);
        console.error("\n💡 Suggestions:");
        console.error("   • Check if the file path is correct");
        console.error("   • Make sure the file exists");
        console.error("   • Try using an absolute path");
      } else if (error.message.includes("EACCES")) {
        console.error("🚨 Permission denied");
        console.error(`   ${error.message}`);
        console.error("\n💡 Suggestions:");
        console.error("   • Check file permissions");
        console.error("   • Run with appropriate privileges");
        console.error("   • Ensure the output directory is writable");
      } else if (error.message.includes("Cannot find module")) {
        console.error("🚨 Module not found");
        console.error(`   ${error.message}`);
        console.error("\n💡 Suggestions:");
        console.error("   • Check if the file path is correct");
        console.error(
          "   • Make sure the path doesn't contain spaces (use quotes)"
        );
        console.error("   • Verify the file exists and has proper extensions");
      } else if (error.message.includes("Invalid OpenAPI")) {
        console.error("🚨 Invalid OpenAPI schema");
        console.error(`   ${error.message}`);
        console.error("\n💡 Suggestions:");
        console.error("   • Validate your OpenAPI schema using online tools");
        console.error("   • Check for syntax errors in JSON/YAML");
        console.error(
          "   • Ensure the schema follows OpenAPI 3.0+ specification"
        );
      } else if (
        error.message.includes("Network") ||
        error.message.includes("fetch")
      ) {
        console.error("🚨 Network error");
        console.error(`   ${error.message}`);
        console.error("\n💡 Suggestions:");
        console.error("   • Check your internet connection");
        console.error("   • Verify the URL is correct and accessible");
        console.error("   • Try again in a few moments");
      } else {
        console.error("🚨 Unexpected error");
        console.error(`   ${error.message}`);

        if (options.verbose) {
          console.error("\n📋 Stack trace:");
          console.error(error.stack);
        } else {
          console.error("\n💡 For more details, run with --verbose flag");
        }
      }
    } else {
      console.error("🚨 Unknown error occurred");
      console.error(`   ${String(error)}`);
    }

    console.error(
      "\n🆘 Need help? Visit: https://github.com/your-org/type-sync/issues"
    );
    process.exit(1);
  }

  /**
   * Run interactive mode
   */
  private async runInteractiveMode(): Promise<void> {
    console.log("🚀 Type-Sync Interactive Mode\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const config: Partial<TypeSyncConfig> = { ...DEFAULT_CONFIG };

      // Get schema source
      const schemaSource = await this.askQuestion(
        rl,
        "Enter OpenAPI schema URL or file path: "
      );
      if (schemaSource.startsWith("http")) {
        config.schemaUrl = schemaSource;
      } else {
        config.schemaFile = schemaSource;
      }

      // Get output directory
      const outputDir = await this.askQuestion(
        rl,
        "Output directory (default: ./src/generated): "
      );
      config.outputDir = outputDir || "./src/generated";

      // Get type prefix
      const prefix = await this.askQuestion(rl, "Type prefix (default: API): ");
      config.typePrefix = prefix || "API";

      // Get generation options
      const generateTypes = await this.askYesNo(rl, "Generate types? (Y/n): ");
      config.generateTypes = generateTypes !== false;

      const generateClient = await this.askYesNo(
        rl,
        "Generate API client? (Y/n): "
      );
      config.generateApiClient = generateClient !== false;

      const generateHooks = await this.askYesNo(
        rl,
        "Generate React hooks? (y/N): "
      );
      config.generateHooks = generateHooks === true;

      const strictTypes = await this.askYesNo(
        rl,
        "Use strict TypeScript types? (Y/n): "
      );
      config.useStrictTypes = strictTypes !== false;

      // Create TypeSync instance and generate
      const typeSync = new TypeSync(config as TypeSyncConfig);
      await this.loadPlugins(config as TypeSyncConfig, typeSync);

      console.log("\n⚙️ Generating types and API client...");
      const result = await typeSync.generate();

      this.outputResults(result, {});
    } finally {
      rl.close();
    }
  }

  /**
   * Run init interactive mode
   */
  private async runInitInteractive(
    directory: string,
    _options: CliOptions
  ): Promise<void> {
    console.log("🚀 Type-Sync Configuration Initialization\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const config: Partial<TypeSyncConfig> = { ...DEFAULT_CONFIG };

      // Get schema source
      const schemaSource = await this.askQuestion(
        rl,
        "Enter default OpenAPI schema URL or file path: "
      );
      if (schemaSource.startsWith("http")) {
        config.schemaUrl = schemaSource;
      } else {
        config.schemaFile = schemaSource;
      }

      // Get output directory
      const outputDir = await this.askQuestion(
        rl,
        "Default output directory (default: ./src/generated): "
      );
      config.outputDir = outputDir || "./src/generated";

      // Get type prefix
      const prefix = await this.askQuestion(rl, "Type prefix (default: API): ");
      config.typePrefix = prefix || "API";

      // Get naming convention
      const naming = await this.askChoice(
        rl,
        "Naming convention (camelCase/snake_case/PascalCase): ",
        ["camelCase", "snake_case", "PascalCase"],
        "camelCase"
      );
      config.namingConvention = naming as
        | "camelCase"
        | "snake_case"
        | "PascalCase";

      // Get generation options
      const generateTypes = await this.askYesNo(
        rl,
        "Generate types by default? (Y/n): "
      );
      config.generateTypes = generateTypes !== false;

      const generateClient = await this.askYesNo(
        rl,
        "Generate API client by default? (Y/n): "
      );
      config.generateApiClient = generateClient !== false;

      const generateHooks = await this.askYesNo(
        rl,
        "Generate React hooks by default? (y/N): "
      );
      config.generateHooks = generateHooks === true;

      const strictTypes = await this.askYesNo(
        rl,
        "Use strict TypeScript types by default? (Y/n): "
      );
      config.useStrictTypes = strictTypes !== false;

      // Save configuration
      await this.saveConfig(directory, config as TypeSyncConfig);
      console.log("\n✅ Configuration saved to typesync.config.json");
    } finally {
      rl.close();
    }
  }

  /**
   * Create default configuration
   */
  private async createDefaultConfig(directory: string): Promise<void> {
    const config: TypeSyncConfig = {
      ...DEFAULT_CONFIG,
      outputDir: "./src/generated",
      typePrefix: "API",
      generateTypes: true,
      generateApiClient: true,
      generateHooks: false,
      useStrictTypes: true,
      namingConvention: "camelCase",
      typeSuffix: "",
      generateBarrelExports: true,
      useOptionalChaining: true,
      useNullishCoalescing: true,
      preserveComments: true,
      generateIndexFile: true,
    };

    await this.saveConfig(directory, config);
    console.log("✅ Default configuration created");
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(
    directory: string,
    config: TypeSyncConfig
  ): Promise<void> {
    const fs = await import("fs/promises");
    const path = await import("path");

    const configPath = path.join(directory, "typesync.config.json");
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  /**
   * Format file size in human readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(1);

    return `${size} ${sizes[i]}`;
  }

  /**
   * Ask a question and return the answer
   */
  private askQuestion(
    rl: readline.Interface,
    question: string
  ): Promise<string> {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  /**
   * Ask a yes/no question and return boolean
   */
  private askYesNo(rl: readline.Interface, question: string): Promise<boolean> {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        const normalized = answer.toLowerCase().trim();
        if (normalized === "" || normalized === "y" || normalized === "yes") {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Ask a choice question and return selected option
   */
  private askChoice(
    rl: readline.Interface,
    question: string,
    choices: string[],
    defaultChoice: string
  ): Promise<string> {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        const normalized = answer.toLowerCase().trim();
        if (normalized === "") {
          resolve(defaultChoice);
        } else {
          const choice = choices.find((c) => c.toLowerCase() === normalized);
          resolve(choice || defaultChoice);
        }
      });
    });
  }

  /**
   * Run the CLI
   */
  run(): void {
    this.program.parse();
  }
}

// Export CLI class and create instance
export const cli = new TypeSyncCli();

// Run CLI if this file is executed directly
if (require.main === module) {
  cli.run();
}
