/**
 * Base type generator interface and abstract implementation
 * Provides the foundation for all type generators in the schemantic system
 */

import { ResolvedSchema } from "../types/schema";
import { GenerationContext, GeneratedType } from "../types/core";

/**
 * Base interface for all type generators
 */
export interface TypeGenerator {
  /**
   * Generate TypeScript types from a schema
   */
  generate(schema: ResolvedSchema, context: GenerationContext): GeneratedType;

  /**
   * Check if this generator can handle the given schema
   */
  canHandle(schema: ResolvedSchema): boolean;

  /**
   * Get the priority of this generator (higher = more priority)
   */
  getPriority(): number;

  /**
   * Get generator metadata
   */
  getMetadata(): GeneratorMetadata;
}

/**
 * Generator metadata
 */
export interface GeneratorMetadata {
  name: string;
  version: string;
  description: string;
  supportedTypes: string[];
  supportedFormats: string[];
}

/**
 * Type generation options
 */
export interface TypeGenerationOptions {
  useStrictTypes: boolean;
  useOptionalChaining: boolean;
  useNullishCoalescing: boolean;
  namingConvention: "camelCase" | "snake_case" | "PascalCase";
  typePrefix?: string;
  typeSuffix?: string;
  customTypeMappings?: Record<string, string>;
  preserveComments: boolean;
}

/**
 * Abstract base type generator implementation
 */
export abstract class BaseTypeGenerator implements TypeGenerator {
  protected options: TypeGenerationOptions;

  constructor(options: TypeGenerationOptions) {
    this.options = options;
  }

  abstract generate(
    schema: ResolvedSchema,
    context: GenerationContext
  ): GeneratedType;
  abstract canHandle(schema: ResolvedSchema): boolean;
  abstract getPriority(): number;
  abstract getMetadata(): GeneratorMetadata;

  /**
   * Common utility methods for type generation
   */

  /**
   * Convert a name to the configured naming convention
   */
  protected convertName(name: string): string {
    // Convert square brackets to angle brackets for TypeScript generics (kept for future generic support)
    let convertedName = name.replace(/\[/g, "<").replace(/\]/g, ">");

    // Replace any non-alphanumeric characters with underscores, collapse repeats, and trim
    convertedName = convertedName
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");

    switch (this.options.namingConvention) {
      case "camelCase":
        return this.toCamelCase(convertedName);
      case "snake_case":
        return this.toSnakeCase(convertedName);
      case "PascalCase":
        return this.toPascalCase(convertedName);
      default:
        return convertedName;
    }
  }

  /**
   * Add prefix and suffix to type name
   */
  protected formatTypeName(name: string): string {
    // Sanitize to identifier-friendly tokens
    let sanitized = name
      .replace(/\[/g, "<")
      .replace(/\]/g, ">")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");

    // For type names, prefer PascalCase regardless of namingConvention
    let formattedName = this.toPascalCase(sanitized);

    if (this.options.typePrefix) {
      formattedName = this.options.typePrefix + formattedName;
    }

    if (this.options.typeSuffix) {
      formattedName = formattedName + this.options.typeSuffix;
    }

    return formattedName;
  }

  /**
   * Generate TypeScript type from OpenAPI schema type
   */
  protected mapSchemaTypeToTypeScript(
    type: string | string[],
    format?: string
  ): string {
    const types = Array.isArray(type) ? type : [type];

    // Handle custom type mappings first
    if (this.options.customTypeMappings) {
      for (const t of types) {
        if (this.options.customTypeMappings[t]) {
          return this.options.customTypeMappings[t];
        }
      }
    }

    // Handle format-specific mappings
    if (format) {
      const formatMapping = this.getFormatMapping(format);
      if (formatMapping) {
        return formatMapping;
      }
    }

    // Handle basic type mappings
    const typeMapping = types
      .map((t) => this.getBasicTypeMapping(t))
      .filter(Boolean);

    if (typeMapping.length === 0) {
      return "unknown";
    }

    if (typeMapping.length === 1) {
      return typeMapping[0]!;
    }

    return typeMapping.join(" | ");
  }

  /**
   * Get format-specific type mapping
   */
  private getFormatMapping(format: string): string | undefined {
    const formatMappings: Record<string, string> = {
      date: "string",
      "date-time": "string",
      time: "string",
      email: "string",
      hostname: "string",
      ipv4: "string",
      ipv6: "string",
      uri: "string",
      "uri-reference": "string",
      "uri-template": "string",
      url: "string",
      uuid: "string",
      password: "string",
      byte: "string",
      binary: "string",
      int32: "number",
      int64: "number",
      float: "number",
      double: "number",
      decimal: "number",
    };

    return formatMappings[format];
  }

  /**
   * Get basic type mapping
   */
  private getBasicTypeMapping(type: string): string | undefined {
    const typeMappings: Record<string, string> = {
      string: "string",
      number: "number",
      integer: "number",
      boolean: "boolean",
      array: "unknown[]",
      object: "Record<string, unknown>",
      null: "null",
    };

    return typeMappings[type];
  }

  /**
   * Generate JSDoc comment from description
   */
  protected generateComment(description?: string, example?: unknown): string {
    if (!description && !example) {
      return "";
    }

    const lines: string[] = ["/**"];

    if (description) {
      lines.push(` * ${description}`);
    }

    if (example !== undefined) {
      lines.push(` * @example ${JSON.stringify(example)}`);
    }

    lines.push(" */");

    return lines.join("\n");
  }

  /**
   * Check if a property is optional
   */
  protected isOptional(required?: string[], propertyName?: string): boolean {
    if (!required || !propertyName) {
      return true;
    }

    return !required.includes(propertyName);
  }

  /**
   * Generate optional type wrapper
   */
  protected wrapOptional(type: string, isOptional: boolean): string {
    // For optional properties, append | undefined to the type
    if (isOptional) {
      return `${type} | undefined`;
    }
    return type;
  }

  /**
   * Convert to camelCase
   */
  private toCamelCase(str: string): string {
    if (!str) return str;
    const tokens = str.split(/_+/).filter(Boolean);
    if (tokens.length === 0) return "";
    const [firstToken, ...rest] = tokens;
    const first = firstToken || "";
    const head = first ? first.charAt(0).toLowerCase() + first.slice(1) : "";
    const tail = rest.map((t) => t.charAt(0).toUpperCase() + t.slice(1));
    return head + tail.join("");
  }

  /**
   * Convert to snake_case
   */
  private toSnakeCase(str: string): string {
    if (!str) return str;
    return (
      str
        // split camel/pascal boundaries
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/_+/g, "_")
        .toLowerCase()
    );
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    if (!str) return str;
    const tokens = str.split(/_+/).filter(Boolean);
    return tokens
      .map((t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : ""))
      .join("");
  }

  /**
   * Extract type name from schema reference
   */
  protected extractTypeNameFromRef(ref: string): string {
    const parts = ref.split("/");
    const last = parts[parts.length - 1] || "Unknown";
    // Preserve existing capitals in token, but normalize separators
    return last
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
  }

  /**
   * Generate imports for dependencies
   */
  protected generateImports(): string {
    // Don't generate imports if types are in the same file
    // This will be handled by the main generator
    return "";
  }
}
