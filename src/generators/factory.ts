/**
 * Type generator factory for creating and managing different type generators
 * Provides a centralized way to instantiate and configure generators
 */

import { ResolvedSchema } from "../types/schema";
import {
  GenerationContext,
  GeneratedType,
  TypeSyncConfig,
} from "../types/core";
import {
  TypeGenerator,
  GeneratorMetadata,
  TypeGenerationOptions,
} from "./base";
import { ObjectTypeGenerator } from "./object-generator";
import { EnumTypeGenerator } from "./enum-generator";
import { PrimitiveTypeGenerator } from "./primitive-generator";
import { UnionTypeGenerator } from "./union-generator";

/**
 * Type generator factory class
 */
export class TypeGeneratorFactory {
  private static generators: TypeGenerator[] = [];
  private static initialized = false;

  /**
   * Initialize default generators
   */
  private static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Default generators will be registered when createFromConfig is called
    this.initialized = true;
  }

  /**
   * Register a generator
   */
  static registerGenerator(generator: TypeGenerator): void {
    this.generators.push(generator);
    // Sort by priority (higher priority first)
    this.generators.sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Create generators from configuration
   */
  static createFromConfig(config: TypeSyncConfig): TypeGenerator[] {
    this.initialize();

    const options: TypeGenerationOptions = {
      useStrictTypes: config.useStrictTypes,
      useOptionalChaining: config.useOptionalChaining,
      useNullishCoalescing: config.useNullishCoalescing,
      namingConvention: config.namingConvention,
      preserveComments: config.preserveComments,
    };

    if (config.typePrefix !== undefined) {
      options.typePrefix = config.typePrefix;
    }

    if (config.typeSuffix !== undefined) {
      options.typeSuffix = config.typeSuffix;
    }

    if (config.customTypeMappings !== undefined) {
      options.customTypeMappings = config.customTypeMappings;
    }

    // Create default generators
    const generators: TypeGenerator[] = [
      new UnionTypeGenerator(options), // Higher priority for discriminated unions
      new EnumTypeGenerator(options),
      new ObjectTypeGenerator(options),
      new PrimitiveTypeGenerator(options),
    ];

    return generators;
  }

  /**
   * Get the best generator for a schema
   */
  static getBestGenerator(
    schema: ResolvedSchema,
    generators: TypeGenerator[]
  ): TypeGenerator | undefined {
    for (const generator of generators) {
      if (generator.canHandle(schema)) {
        return generator;
      }
    }

    return undefined;
  }

  /**
   * Generate type from schema using available generators
   */
  static generateType(
    schema: ResolvedSchema,
    context: GenerationContext,
    generators: TypeGenerator[]
  ): GeneratedType | undefined {
    const generator = this.getBestGenerator(schema, generators);

    if (!generator) {
      return undefined;
    }

    return generator.generate(schema, context);
  }

  /**
   * Get all registered generators
   */
  static getRegisteredGenerators(): TypeGenerator[] {
    return [...this.generators];
  }

  /**
   * Get generator metadata
   */
  static getGeneratorMetadata(): GeneratorMetadata[] {
    return this.generators.map((g) => g.getMetadata());
  }

  /**
   * Clear all registered generators
   */
  static clearGenerators(): void {
    this.generators = [];
    this.initialized = false;
  }
}

/**
 * Convenience function to create generators from config
 */
export function createGenerators(config: TypeSyncConfig): TypeGenerator[] {
  return TypeGeneratorFactory.createFromConfig(config);
}

/**
 * Convenience function to generate a type
 */
export function generateType(
  schema: ResolvedSchema,
  context: GenerationContext,
  generators: TypeGenerator[]
): GeneratedType | undefined {
  return TypeGeneratorFactory.generateType(schema, context, generators);
}

/**
 * Convenience function to get the best generator
 */
export function getBestGenerator(
  schema: ResolvedSchema,
  generators: TypeGenerator[]
): TypeGenerator | undefined {
  return TypeGeneratorFactory.getBestGenerator(schema, generators);
}
