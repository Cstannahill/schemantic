/**
 * Parser factory for creating and managing different schema parsers
 * Provides a centralized way to instantiate and configure parsers
 */

import { SchemanticConfig } from "../types/core";
import { SchemaParser, ParserMetadata } from "./base";
import { OpenAPIParser } from "./openapi";

/**
 * Supported parser types
 */
export type ParserType = "openapi" | "swagger" | "json-schema";

/**
 * Parser factory class
 */
export class ParserFactory {
  private static parsers: Map<
    ParserType,
    new (config: SchemanticConfig) => SchemaParser
  > = new Map();

  /**
   * Register a parser type
   */
  static registerParser(
    type: ParserType,
    parserClass: new (config: SchemanticConfig) => SchemaParser
  ): void {
    this.parsers.set(type, parserClass);
  }

  /**
   * Create a parser instance
   */
  static createParser(
    type: ParserType,
    config: SchemanticConfig
  ): SchemaParser {
    const ParserClass = this.parsers.get(type);
    if (!ParserClass) {
      throw new Error(`Unsupported parser type: ${type}`);
    }

    return new ParserClass(config);
  }

  /**
   * Get available parser types
   */
  static getAvailableParsers(): ParserType[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Get parser metadata
   */
  static getParserMetadata(type: ParserType): ParserMetadata | undefined {
    const ParserClass = this.parsers.get(type);
    if (!ParserClass) {
      return undefined;
    }

    // Create a temporary instance to get metadata
    const tempInstance = new ParserClass({} as SchemanticConfig);
    return tempInstance.getMetadata();
  }

  /**
   * Detect parser type from input
   */
  static detectParserType(input: {
    url?: string;
    filePath?: string;
    data?: unknown;
    string?: string;
  }): ParserType {
    // Check URL
    if (input.url) {
      if (
        input.url.includes("openapi.json") ||
        input.url.includes("openapi.yaml")
      ) {
        return "openapi";
      }
      if (
        input.url.includes("swagger.json") ||
        input.url.includes("swagger.yaml")
      ) {
        return "swagger";
      }
    }

    // Check file path
    if (input.filePath) {
      const ext = input.filePath.toLowerCase();
      if (ext.endsWith("openapi.json") || ext.endsWith("openapi.yaml")) {
        return "openapi";
      }
      if (ext.endsWith("swagger.json") || ext.endsWith("swagger.yaml")) {
        return "swagger";
      }
    }

    // Check data structure
    if (input.data || input.string) {
      const data = input.data || JSON.parse(input.string!);
      if (typeof data === "object" && data !== null) {
        if ("openapi" in data) {
          return "openapi";
        }
        if ("swagger" in data) {
          return "swagger";
        }
        if ("$schema" in data) {
          return "json-schema";
        }
      }
    }

    // Default to OpenAPI for FastAPI applications
    return "openapi";
  }

  /**
   * Auto-detect and create parser
   */
  static autoCreateParser(
    input: { url?: string; filePath?: string; data?: unknown; string?: string },
    config: SchemanticConfig
  ): SchemaParser {
    const parserType = this.detectParserType(input);
    return this.createParser(parserType, config);
  }
}

// Register default parsers
ParserFactory.registerParser("openapi", OpenAPIParser);

/**
 * Convenience function to create a parser
 */
export function createParser(
  type: ParserType,
  config: SchemanticConfig
): SchemaParser {
  return ParserFactory.createParser(type, config);
}

/**
 * Convenience function to auto-detect and create parser
 */
export function autoCreateParser(
  input: { url?: string; filePath?: string; data?: unknown; string?: string },
  config: SchemanticConfig
): SchemaParser {
  return ParserFactory.autoCreateParser(input, config);
}
