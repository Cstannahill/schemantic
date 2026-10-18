/**
 * Enum type generator for OpenAPI schema enums
 * Handles generation of TypeScript enums from OpenAPI schema enum definitions
 */

import { ResolvedSchema, isOpenAPISchemaObject } from "../types/schema";
import { GenerationContext, GeneratedType } from "../types/core";
import { BaseTypeGenerator, TypeGenerationOptions } from "./base";

/**
 * Enum type generator implementation
 */
export class EnumTypeGenerator extends BaseTypeGenerator {
  constructor(options: TypeGenerationOptions) {
    super(options);
  }

  generate(schema: ResolvedSchema, context: GenerationContext): GeneratedType {
    if (!isOpenAPISchemaObject(schema)) {
      throw new Error("Cannot generate enum from reference schema");
    }

    const typeName = this.getTypeName(schema, context);
    if (schema.enum && (schema.nullable || schema.enum.some(value => typeof value !== 'string' && typeof value !== 'number'))) {
      const values = [...new Set([...schema.enum.map(value => JSON.stringify(value)), ...(schema.nullable ? ['null'] : [])])].join(' | ');
      const used = new Set<string>();
      const entries = schema.enum.map((value, index) => {
        const base = this.generateEnumKey(value, index);
        let key = base;
        let suffix = 2;
        while (used.has(key)) key = `${base}_${suffix++}`;
        used.add(key);
        return `${key}: ${JSON.stringify(value)}`;
      });
      return { name: typeName, content: `export const ${typeName} = { ${entries.join(', ')} } as const;\nexport type ${typeName} = ${values};\nexport type ${typeName}Values = ${typeName};`,
        dependencies: [], exports: [typeName, `${typeName}Values`], isInterface: false, isEnum: true, isUnion: true, sourceSchema: schema };
    }
    const comment = this.generateComment(schema.description, schema.example);

    let content = "";

    if (comment) {
      content += comment + "\n";
    }

    // Generate enum content
    const enumContent = this.generateEnum(schema, typeName);
    content += enumContent;

    // Generate union type alias for better TypeScript support
    const unionType = this.generateUnionType(schema, typeName);
    if (unionType) {
      content += "\n" + unionType;
    }

    return {
      name: typeName,
      content,
      dependencies: [],
      exports: [typeName, `${typeName}Values`],
      isInterface: false,
      isEnum: true,
      isUnion: false,
      sourceSchema: schema,
    };
  }

  canHandle(schema: ResolvedSchema): boolean {
    if (!isOpenAPISchemaObject(schema)) {
      return false;
    }

    return !!(schema.enum && schema.enum.length > 0);
  }

  getPriority(): number {
    return 200; // Higher priority than object generator for enum schemas
  }

  getMetadata() {
    return {
      name: "Enum Type Generator",
      version: "1.0.0",
      description: "Generates TypeScript enums from OpenAPI schema enums",
      supportedTypes: ["enum"],
      supportedFormats: ["json"],
    };
  }

  /**
   * Generate enum content
   */
  private generateEnum(schema: ResolvedSchema, typeName: string): string {
    if (!isOpenAPISchemaObject(schema) || !schema.enum) {
      return "";
    }

    const enumValues = schema.enum;
    const isStringEnum = this.isStringEnum(enumValues);

    if (isStringEnum) {
      return this.generateStringEnum(typeName, enumValues);
    } else {
      return this.generateNumericEnum(typeName, enumValues);
    }
  }

  /**
   * Generate string enum
   */
  private generateStringEnum(typeName: string, enumValues: unknown[]): string {
    const enumEntries: string[] = [];
    const usedKeys = new Set<string>();

    for (const value of enumValues) {
      if (typeof value === "string") {
        const baseKey = this.generateEnumKey(value, enumEntries.length);
        let key = baseKey;
        let suffix = 2;
        while (usedKeys.has(key)) key = `${baseKey}_${suffix++}`;
        usedKeys.add(key);
        const enumValue = JSON.stringify(value);
        enumEntries.push(`  ${key} = ${enumValue}`);
      }
    }

    return `export enum ${typeName} {\n${enumEntries.join(",\n")}\n}`;
  }

  /**
   * Generate numeric enum
   */
  private generateNumericEnum(typeName: string, enumValues: unknown[]): string {
    const enumEntries: string[] = [];
    const used = new Set<string>();

    for (let i = 0; i < enumValues.length; i++) {
      const value = enumValues[i];
      const base = this.generateEnumKey(value, i);
      let key = base;
      let suffix = 2;
      while (used.has(key)) key = `${base}_${suffix++}`;
      used.add(key);
      const enumValue =
        typeof value === "number" ? value.toString() : JSON.stringify(value);
      enumEntries.push(`  ${key} = ${enumValue}`);
    }

    return `export enum ${typeName} {\n${enumEntries.join(",\n")}\n}`;
  }

  /**
   * Generate union type alias for better TypeScript support
   */
  private generateUnionType(schema: ResolvedSchema, typeName: string): string {
    if (!isOpenAPISchemaObject(schema) || !schema.enum) {
      return "";
    }

    const unionValues = schema.enum
      .map((val: unknown) => JSON.stringify(val))
      .join(" | ");
    return `export type ${typeName}Values = ${unionValues};`;
  }

  /**
   * Check if enum values are strings
   */
  private isStringEnum(enumValues: unknown[]): boolean {
    return enumValues.every((val) => typeof val === "string");
  }

  /**
   * Generate enum key from value
   */
  private generateEnumKey(value: unknown, index?: number): string {
    if (typeof value === "string") {
      // Convert string to valid enum key
      let key = value
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      // Ensure key starts with letter or underscore
      if (!/^[A-Z_]/.test(key)) {
        key = "_" + key;
      }

      // Handle empty or invalid keys
      if (!key || key === "_") {
        key = `VALUE_${index || 0}`;
      }

      return key;
    }

    if (typeof value === "number") {
      return `VALUE_${String(value).replace(/-/g, 'NEGATIVE_').replace(/[^A-Za-z0-9_]/g, '_')}`;
    }

    return `VALUE_${index || 0}`;
  }

  /**
   * Get type name from schema
   */
  private getTypeName(
    schema: ResolvedSchema,
    context: GenerationContext
  ): string {
    // Check if type name is already set
    if ("_generatedTypeName" in schema && schema._generatedTypeName) {
      return this.formatTypeName(schema._generatedTypeName as string);
    }

    // Try to extract from title
    if (isOpenAPISchemaObject(schema) && schema.title) {
      return this.formatTypeName(schema.title);
    }

    // Generate from context if available
    if (context && context.typeRegistry) {
      const existingTypes = context.typeRegistry.getAllTypes();
      let counter = 1;
      let baseName = "GeneratedEnum";

      while (
        existingTypes.some(
          (t) => t.name === baseName + (counter > 1 ? counter : "")
        )
      ) {
        counter++;
      }

      return baseName + (counter > 1 ? counter : "");
    }

    // Fallback
    return "GeneratedEnum";
  }
}
