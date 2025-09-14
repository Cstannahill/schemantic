#!/usr/bin/env node

/**
 * CLI interface for sync-type
 * Provides command-line interface for generating TypeScript types and API clients
 */

import { Command } from "commander";
import {
  TypeSyncConfig,
  DEFAULT_CONFIG,
  GenerationResult,
  GenerationError,
  GenerationWarning,
} from "../types/core";
import { TypeSync } from "../core/typesync";
import { PluginLoader } from "../plugins";
import { getBuiltinPlugins } from "../plugins/builtin";
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
      .name("sync-type")
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
    this.addValidateCommand();
    this.addPluginCommand();
    this.addInitCommand();
    this.addHelpCommand();
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
      .description("Initialize a new sync-type configuration")
      .option("-t, --template <template>", "Configuration template", "default")
      .option("--yes", "Skip interactive prompts")
      .action(async (directory, options) => {
        await this.handleInitCommand(directory, options);
      });
  }

  /**
   * Add help command
   */
  private addHelpCommand(): void {
    this.program
      .command("help [command]")
      .description("Display help for a specific command")
      .action((command?: string) => {
        this.handleHelpCommand(command);
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

      // Load configuration
      const config = await this.loadConfiguration(source, options);

      // Create TypeSync instance
      const typeSync = new TypeSync(config);

      // Load plugins
      await this.loadPlugins(config, typeSync);

      // Generate types and client
      const result = await typeSync.generate();

      // Output results
      this.outputResults(result, options);
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
   * Handle help command
   */
  private handleHelpCommand(command?: string): void {
    if (command) {
      // Show help for specific command
      const subCommand = this.program.commands.find(
        (cmd) => cmd.name() === command
      );
      if (subCommand) {
        subCommand.help();
      } else {
        console.log(`Unknown command: ${command}`);
        console.log("Available commands:");
        this.program.commands.forEach((cmd) => {
          console.log(`  ${cmd.name()} - ${cmd.description()}`);
        });
      }
    } else {
      // Show general help with examples
      console.log("📚 Sync-Type CLI Examples:");
      console.log("\n� Basic Usage:");
      console.log("  # Generate from FastAPI server");
      console.log(
        "  npx sync-type generate --url http://localhost:8000/openapi.json"
      );
      console.log("\n  # Generate from local file");
      console.log("  npx sync-type generate --file ./openapi-schema.json");
      console.log("\n  # Custom output directory");
      console.log(
        "  npx sync-type generate --url http://localhost:8000/openapi.json --output ./src/api"
      );
      console.log("\n⚛️ React Integration:");
      console.log("  # Generate with React hooks");
      console.log(
        "  npx sync-type generate --url http://localhost:8000/openapi.json --hooks"
      );
      console.log("\n🎛️ Interactive Mode:");
      console.log("  npx sync-type generate --interactive");
      console.log("\n⚙️ Configuration:");
      console.log("  # Initialize configuration");
      console.log("  npx sync-type init");
      console.log("\n  # Use configuration file");
      console.log("  npx sync-type generate --config ./typesync.config.json");
      console.log("\n✅ Validation:");
      console.log("  # Validate schema");
      console.log(
        "  npx sync-type validate --url http://localhost:8000/openapi.json"
      );
      console.log("\n� Advanced:");
      console.log("  # Custom naming and filtering");
      console.log(
        "  npx sync-type generate --url http://localhost:8000/openapi.json \\"
      );
      console.log(
        "    --naming PascalCase --prefix MyAPI --exclude-paths '/health,/docs'"
      );
      console.log("\n📖 For complete documentation:");
      console.log("  https://github.com/Cstannahill/sync-type#readme");
      console.log("\n💡 Get help for specific commands:");
      console.log("  npx sync-type help generate");
      console.log("  npx sync-type generate --help");
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
  private outputResults(result: GenerationResult, options: CliOptions): void {
    if (options.quiet) {
      return;
    }

    if (result.success) {
      console.log("✅ Generation completed successfully!");
      console.log(`📁 Generated ${result.generatedFiles.length} files`);
      console.log(
        `📊 Statistics: ${result.statistics.totalTypes} types, ${result.statistics.totalEndpoints} endpoints`
      );
      console.log(`⏱️  Generation time: ${result.statistics.generationTime}ms`);
    } else {
      console.log("❌ Generation failed!");
      console.log(`🚨 Errors: ${result.errors.length}`);
      for (const error of result.errors) {
        console.log(`  - ${error.message}`);
      }
    }
  }

  /**
   * Output validation results
   */
  private outputValidationResults(
    result: {
      isValid: boolean;
      errors: GenerationError[];
      warnings: GenerationWarning[];
    },
    options: CliOptions
  ): void {
    if (options.quiet) {
      return;
    }

    if (result.isValid) {
      console.log("✅ Schema validation passed!");
    } else {
      console.log("❌ Schema validation failed!");
      console.log(`🚨 Errors: ${result.errors.length}`);
      for (const error of result.errors) {
        console.log(
          `  - ${error.message}${error.source ? ` (${error.source})` : ""}`
        );
      }
    }

    if (result.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${result.warnings.length}`);
      for (const warning of result.warnings) {
        console.log(
          `  - ${warning.message}${
            warning.source ? ` (${warning.source})` : ""
          }`
        );
      }
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown, options: CliOptions): void {
    if (options.quiet) {
      process.exit(1);
    }

    console.error("❌ Error:", error);
    process.exit(1);
  }

  /**
   * Run interactive mode
   */
  private async runInteractiveMode(): Promise<void> {
    console.log("🚀 Sync-Type Interactive Mode\n");

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
    console.log("🚀 Sync-Type Configuration Initialization\n");

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
