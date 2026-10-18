#!/usr/bin/env node

/**
 * CLI interface for schemantic
 * Provides command-line interface for generating TypeScript types and API clients
 */

import { Command } from "commander";
import {
  SchemanticConfig,
  DEFAULT_CONFIG,
  GenerationResult,
  GenerationError,
  GenerationWarning,
} from "../types/core";
import { Schemantic } from "../core/schemantic";
import { resolveConfiguration } from "../core/configuration";
import { PluginLoader } from "../plugins";
import { getBuiltinPlugins } from "../plugins/builtin";
import * as readline from "readline";
import * as path from 'path';
import { watch } from 'chokidar';
import { createRequire } from 'module';

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
export class SchemanticCli {
  private program: Command;
  private pluginDirectory = process.cwd();

  constructor() {
    this.program = new Command();
    this.setupProgram();
  }

  /**
   * Setup the CLI program
   */
  private setupProgram(): void {
    this.program
      .name("schemantic")
      .description(
        "Generate TypeScript types and API clients from OpenAPI schemas"
      )
      .version((require('../../package.json') as { version: string }).version)
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
      .option("-o, --output <dir>", "Output directory")
      .option("--types", "Generate types only")
      .option("--client", "Generate API client only")
      .option("--hooks", "Generate React hooks")
      .option("--strict", "Use strict TypeScript types")
      .option("--no-strict", "Disable strict TypeScript types")
      .option(
        "--naming <convention>",
        "Naming convention (camelCase|snake_case|PascalCase)"
      )
      .option(
        "--prefix <prefix>",
        "Type name prefix (leave blank for none)"
      )
      .option("--suffix <suffix>", "Type name suffix")
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
      // --config may be provided with an explicit path or used as a flag
      // If used as a boolean flag (no value), commander will set it to true.
      // Accept either a path or a boolean and handle in loadConfiguration.
      .option(
        "-c, --config [file]",
        "Configuration file path (defaults to ./schemantic.config.json)"
      )
      .option("--watch", "Watch for changes and regenerate")
      .action(async (source: string, options: CliOptions) => {
        await this.handleGenerateCommand(source, { ...this.program.opts(), ...options });
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
      .option("-c, --config [file]", "Configuration file path (otherwise discover schemantic.config.json/.cjs/.js)")
      .action(async (source, options) => {
        await this.handleValidateCommand(source, { ...this.program.opts(), ...options });
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
      .description("Inspect a plugin file or package (does not persist installation)")
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
      .description("Initialize a new schemantic configuration")
      .option("-t, --template <template>", "Configuration template (default|types|react)", "default")
      .option("--yes", "Skip interactive prompts")
      .option("--force", "Replace an existing schemantic.config.json")
      .action(async (directory, options) => {
        await this.handleInitCommand(directory, { ...this.program.opts(), ...options });
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
      this.outputEffectiveConfiguration(config, options);
      if (options.watch && !config.schemaFile) throw new Error('--watch requires a local schema file');

      // Create Schemantic instance
      const schemanticInstance = new Schemantic(config);

      // Load plugins
      await this.loadPlugins(config, schemanticInstance);

      // Generate types and client
      const result = await schemanticInstance.generate();

      // Output results
      this.outputResults(result, options);
      if (!result.success) process.exitCode = 1;
      if (options.watch) {
        const watcher = watch(config.schemaFile!, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 100 } });
        let generating = false;
        let pending = false;
        watcher.on('change', async () => {
          pending = true;
          if (generating) return;
          generating = true;
          try {
            while (pending) {
              pending = false;
              const update = await schemanticInstance.generate();
              this.outputResults(update, options);
              process.exitCode = update.success ? 0 : 1;
            }
          } finally { generating = false; }
        });
        watcher.on('ready', () => { if (!options.quiet) console.log(`Watching ${config.schemaFile}`); });
        watcher.on('error', error => this.handleError(error, options));
      }
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
      this.outputEffectiveConfiguration(config, options);

      // Create Schemantic instance
      const schemanticInstance = new Schemantic(config);

      // Validate schema
      const result = await schemanticInstance.validate();

      // Output validation results
      this.outputValidationResults(result, options);
      if (!result.isValid) process.exitCode = 1;
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
      if (!['default', 'types', 'react'].includes(String(options.template || 'default'))) {
        throw new Error('Unknown template; choose default, types, or react');
      }

      if (options.yes) {
        await this.createDefaultConfig(targetDir, options);
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
      const plugin = await loader.loadPlugin(path);

      console.log(`Loaded plugin: ${plugin.name} (${plugin.version})`);
      console.log(`Description: ${plugin.description}`);
      console.log('Use this file/package in generate --plugins or the active config; inspection does not persist registration.');
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
        process.exitCode = 1;
        console.log(`Unknown command: ${command}`);
        console.log("Available commands:");
        this.program.commands.forEach((cmd) => {
          console.log(`  ${cmd.name()} - ${cmd.description()}`);
        });
      }
    } else {
      // Show general help with examples
      console.log("📚 Schemantic CLI Examples:");
      console.log("\n� Basic Usage:");
      console.log("  # Generate from FastAPI server");
      console.log(
        "  npx schemantic generate --url http://localhost:8000/openapi.json"
      );
      console.log("\n  # Generate from local file");
      console.log("  npx schemantic generate --file ./openapi-schema.json");
      console.log("\n  # Custom output directory");
      console.log(
        "  npx schemantic generate --url http://localhost:8000/openapi.json --output ./src/api"
      );
      console.log("\n⚛️ React Integration:");
      console.log("  # Generate with React hooks");
      console.log(
        "  npx schemantic generate --url http://localhost:8000/openapi.json --hooks"
      );
      console.log("\n🎛️ Interactive Mode:");
      console.log("  npx schemantic generate --interactive");
      console.log("\n⚙️ Configuration:");
      console.log("  # Initialize configuration");
      console.log("  npx schemantic init");
      console.log("\n  # Use configuration file");
      console.log(
        "  npx schemantic generate --config ./schemantic.config.json"
      );
      console.log("\n✅ Validation:");
      console.log("  # Validate schema");
      console.log(
        "  npx schemantic validate --url http://localhost:8000/openapi.json"
      );
      console.log("\n� Advanced:");
      console.log("  # Custom naming and filtering");
      console.log(
        "  npx schemantic generate --url http://localhost:8000/openapi.json \\"
      );
      console.log(
        "    --naming PascalCase --prefix MyAPI --exclude-paths '/health,/docs'"
      );
      console.log("\n📖 For complete documentation:");
      console.log("  https://github.com/Cstannahill/schemantic#readme");
      console.log("\n💡 Get help for specific commands:");
      console.log("  npx schemantic help generate");
      console.log("  npx schemantic generate --help");
    }
  }

  /**
   * Load configuration from options
   */
  private async loadConfiguration(
    source?: string,
    options: CliOptions = {}
  ): Promise<SchemanticConfig> {
    this.pluginDirectory = process.cwd();
    if (options.url && options.file) throw new Error('Choose one schema source: --url or --file');
    let config: Partial<SchemanticConfig> = { ...DEFAULT_CONFIG };

    const fs = await import('fs/promises');
    let configPath = typeof options.config === 'string' ? path.resolve(options.config) : undefined;
    if (!configPath) {
      for (const name of ['schemantic.config.json', 'schemantic.config.cjs', 'schemantic.config.js']) {
        const candidate = path.resolve(name);
        try { await fs.access(candidate); configPath = candidate; break; } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }
      if (options.config && !configPath) throw new Error('No schemantic.config.json/.cjs/.js found in the current directory');
    }
    if (configPath) {
      const configFile = await this.loadConfigFile(configPath);
      const directory = path.dirname(configPath);
      this.pluginDirectory = directory;
      if (configFile.schemaFile) configFile.schemaFile = path.resolve(directory, configFile.schemaFile);
      if (configFile.outputDir) configFile.outputDir = path.resolve(directory, configFile.outputDir);
      if (configFile.plugins) configFile.plugins = configFile.plugins.map(plugin => ({
        ...plugin,
        name: PluginLoader.isFileSpecifier(plugin.name) ? path.resolve(directory, plugin.name) : plugin.name,
      }));
      config = { ...config, ...configFile };
    }

    // Handle source parameter (URL or file path)
    if (source) {
      delete config.schemaUrl;
      delete config.schemaFile;
      delete config.schemaData;
      if (source.startsWith("http://") || source.startsWith("https://")) {
        config.schemaUrl = source;
      } else {
        config.schemaFile = source;
      }
    }

    // Override with command line options
    if (options.url) {
      delete config.schemaFile;
      delete config.schemaData;
      config.schemaUrl = options.url as string;
    }

    if (options.file) {
      delete config.schemaUrl;
      delete config.schemaData;
      config.schemaFile = options.file as string;
    }

    if (options.output !== undefined) {
      config.outputDir = options.output as string;
    }

    if (options.types) {
      config.generateTypes = true;
      config.generateApiClient = !!options.client;
    }

    if (options.client) {
      config.generateApiClient = true;
      config.generateTypes = true;
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

    if (options.prefix !== undefined) {
      config.typePrefix = options.prefix as string;
    }

    if (options.suffix !== undefined) {
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
    if (!['camelCase', 'snake_case', 'PascalCase'].includes(config.namingConvention!)) {
      throw new Error(`Invalid naming convention: ${config.namingConvention}`);
    }
    if (config.generateHooks && !config.generateApiClient) throw new Error('React hooks require API client generation');
    if (!config.schemaUrl && !config.schemaFile && !config.schemaData) {
      throw new Error(
        "Either source parameter, --url, --file, or schema data must be provided"
      );
    }

    // Ensure outputDir falls back to DEFAULT_CONFIG if not provided
    if (!config.outputDir) {
      // DEFAULT_CONFIG.outputDir may be optional in the type definition;
      // ensure we set a concrete string fallback to satisfy strict types
      config.outputDir = DEFAULT_CONFIG.outputDir || "./src/generated";
    }

    return resolveConfiguration(config);
  }

  /**
   * Load configuration file
   */
  private async loadConfigFile(
    filePath: string
  ): Promise<Partial<SchemanticConfig>> {
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(filePath, "utf-8");

      if (filePath.endsWith(".json")) {
        const parsed: unknown = JSON.parse(content);
        return resolveConfiguration(parsed as SchemanticConfig);
      } else if (filePath.endsWith(".js") || filePath.endsWith(".cjs")) {
        const configModule: unknown = createRequire(path.resolve(filePath))(path.resolve(filePath));
        const loaded = configModule && typeof configModule === 'object' && 'default' in configModule
          ? (configModule as { default: unknown }).default : configModule;
        return resolveConfiguration(loaded as SchemanticConfig);
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
    config: SchemanticConfig,
    Schemantic: Schemantic
  ): Promise<void> {
    const pluginManager = Schemantic.getPluginManager();

    // Load configured plugins
    const loader = new PluginLoader();
    if (config.plugins) {
      for (const pluginConfig of config.plugins) {
        if (pluginConfig.enabled) {
          if (!pluginManager.getPlugin(pluginConfig.name)) {
            const plugin = await loader.loadPlugin(pluginConfig.name, this.pluginDirectory);
            if (pluginManager.getPlugin(plugin.name)) throw new Error(`Duplicate plugin name: ${plugin.name}`);
            pluginManager.registerPlugin(plugin);
            // The config and instance share this entry; generation uses the resolved exported name.
            pluginConfig.name = plugin.name;
          }
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
    process.exitCode = 1;
    if (!options.quiet) console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }

  private outputEffectiveConfiguration(config: SchemanticConfig, options: CliOptions): void {
    if (!options.verbose || options.quiet) return;
    console.log('Effective configuration:', JSON.stringify({
      source: config.schemaFile || config.schemaUrl || '<in-memory schema>',
      output: config.outputDir,
      generateTypes: config.generateTypes,
      generateApiClient: config.generateApiClient,
      generateHooks: config.generateHooks,
      plugins: config.plugins?.filter(plugin => plugin.enabled).map(plugin => plugin.name) || [],
    }, null, 2));
  }

  /**
   * Run interactive mode
   */
  private async runInteractiveMode(): Promise<void> {
    console.log("🚀 Schemantic Interactive Mode\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const config: Partial<SchemanticConfig> = { ...DEFAULT_CONFIG };

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
      const prefix = await this.askQuestion(
        rl,
        "Type prefix (leave blank for none): "
      );
      config.typePrefix = prefix || "";

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
        "Generate React hooks? (y/N): ", false
      );
      config.generateHooks = generateHooks === true;

      const strictTypes = await this.askYesNo(
        rl,
        "Use strict TypeScript types? (Y/n): "
      );
      config.useStrictTypes = strictTypes !== false;

      // Create Schemantic instance and generate
      const resolvedConfig = resolveConfiguration(config);
      const schemanticInstance = new Schemantic(resolvedConfig);
      await this.loadPlugins(resolvedConfig, schemanticInstance);

      console.log("\n⚙️ Generating types and API client...");
      const result = await schemanticInstance.generate();

      this.outputResults(result, {});
      if (!result.success) process.exitCode = 1;
    } finally {
      rl.close();
    }
  }

  /**
   * Run init interactive mode
   */
  private async runInitInteractive(
    directory: string,
    options: CliOptions
  ): Promise<void> {
    console.log("🚀 Schemantic Configuration Initialization\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const config: Partial<SchemanticConfig> = this.templateConfig(options);

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
      const prefix = await this.askQuestion(
        rl,
        "Type prefix (leave blank for none): "
      );
      config.typePrefix = prefix || "";

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
        options.template === 'types' ? "Generate API client by default? (y/N): " : "Generate API client by default? (Y/n): ", options.template !== 'types'
      );
      config.generateApiClient = generateClient !== false;

      const generateHooks = await this.askYesNo(
        rl,
        options.template === 'react' ? "Generate React hooks by default? (Y/n): " : "Generate React hooks by default? (y/N): ", options.template === 'react'
      );
      config.generateHooks = generateHooks === true;

      const strictTypes = await this.askYesNo(
        rl,
        "Use strict TypeScript types by default? (Y/n): "
      );
      config.useStrictTypes = strictTypes !== false;

      // Save configuration
      await this.saveConfig(directory, resolveConfiguration(config), !!options.force);
      console.log("\n✅ Configuration saved to schemantic.config.json");
    } finally {
      rl.close();
    }
  }

  /**
   * Create default configuration
   */
  private async createDefaultConfig(directory: string, options: CliOptions): Promise<void> {
    const config: SchemanticConfig = {
      ...this.templateConfig(options),
      outputDir: "./src/generated",
      typePrefix: "",
      generateTypes: true,
      generateApiClient: options.template !== 'types',
      generateHooks: options.template === 'react',
      useStrictTypes: true,
      namingConvention: "camelCase",
      typeSuffix: "",
      // generateBarrelExports removed - barrel.ts is no longer generated
      useOptionalChaining: true,
      useNullishCoalescing: true,
      preserveComments: true,
      generateIndexFile: true,
    };

    await this.saveConfig(directory, config, !!options.force);
    console.log("✅ Default configuration created");
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(
    directory: string,
    config: SchemanticConfig,
    force = false
  ): Promise<void> {
    const fs = await import("fs/promises");
    const path = await import("path");

    const configPath = path.join(directory, "schemantic.config.json");
    await fs.mkdir(directory, { recursive: true });
    try {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), { encoding: 'utf-8', flag: force ? 'w' : 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Configuration already exists: ${configPath}; use init --force to replace it`);
      throw error;
    }
  }

  private templateConfig(options: CliOptions): Partial<SchemanticConfig> {
    return { ...DEFAULT_CONFIG, outputDir: './src/generated', generateApiClient: options.template !== 'types', generateHooks: options.template === 'react' };
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
  private askYesNo(rl: readline.Interface, question: string, defaultValue = true): Promise<boolean> {
    return new Promise((resolve, reject) => {
      rl.question(question, (answer) => {
        const normalized = answer.toLowerCase().trim();
        if (normalized === '') resolve(defaultValue);
        else if (normalized === "y" || normalized === "yes") {
          resolve(true);
        } else if (normalized === 'n' || normalized === 'no') {
          resolve(false);
        } else reject(new Error('Answer yes or no'));
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
    return new Promise((resolve, reject) => {
      rl.question(question, (answer) => {
        const normalized = answer.toLowerCase().trim();
        if (normalized === "") {
          resolve(defaultChoice);
        } else {
          const choice = choices.find((c) => c.toLowerCase() === normalized);
          if (choice) resolve(choice);
          else reject(new Error(`Choose one of: ${choices.join(', ')}`));
        }
      });
    });
  }

  /**
   * Run the CLI
   */
  async run(argv?: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }
}

// Export CLI class and create instance
export const cli = new SchemanticCli();

// Run CLI if this file is executed directly
if (require.main === module) {
  void cli.run();
}
