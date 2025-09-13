/**
 * Union type generator for OpenAPI oneOf, anyOf, and discriminated unions
 * Handles generation of TypeScript union types from OpenAPI union schemas
 */

import { ResolvedSchema, isOpenAPISchemaObject } from "../types/schema";
import { GenerationContext, GeneratedType } from "../types/core";
import { BaseTypeGenerator, TypeGenerationOptions } from "./base";

/**
 * Union type generator implementation
 */
export class UnionTypeGenerator extends BaseTypeGenerator {
  constructor(options: TypeGenerationOptions) {
    super(options);
  }

  generate(schema: ResolvedSchema, context: GenerationContext): GeneratedType {
    if (!isOpenAPISchemaObject(schema)) {
      throw new Error("Cannot generate union from reference schema");
    }

    const typeName = this.getTypeName(schema, context);
    const dependencies: string[] = [];

    // Generate union content
    const content = this.generateUnion(schema, context, dependencies);

    // Generate imports
    const imports = this.generateImports();

    // Generate full content
    const fullContent = imports + content;

    return {
      name: typeName,
      content: fullContent,
      dependencies,
      exports: [typeName],
      isInterface: false,
      isEnum: false,
      isUnion: true,
      sourceSchema: schema,
    };
  }

  canHandle(schema: ResolvedSchema): boolean {
    if (!isOpenAPISchemaObject(schema)) {
      return false;
    }

    // Handle oneOf (discriminated unions)
    if (
      schema.oneOf &&
      Array.isArray(schema.oneOf) &&
      schema.oneOf.length > 0
    ) {
      return true;
    }

    // Handle anyOf (union types)
    if (
      schema.anyOf &&
      Array.isArray(schema.anyOf) &&
      schema.anyOf.length > 0
    ) {
      return true;
    }

    // Handle discriminated unions with discriminator
    if (schema.discriminator && (schema.oneOf || schema.anyOf)) {
      return true;
    }

    return false;
  }

  getPriority(): number {
    return 150; // Higher priority than object generator to handle discriminated unions first
  }

  getMetadata() {
    return {
      name: "Union Type Generator",
      version: "1.0.0",
      description:
        "Generates TypeScript union types from OpenAPI oneOf/anyOf schemas",
      supportedTypes: ["oneOf", "anyOf", "discriminated-union"],
      supportedFormats: ["json"],
    };
  }

  /**
   * Generate union type content
   */
  private generateUnion(
    schema: ResolvedSchema,
    context: GenerationContext,
    dependencies: string[]
  ): string {
    if (!isOpenAPISchemaObject(schema)) {
      throw new Error("Cannot generate union from reference schema");
    }

    const typeName = this.getTypeName(schema, context);
    const comment = this.generateComment(schema.description, schema.example);

    let content = "";

    if (comment) {
      content += comment + "\n";
    }

    // Generate union type
    const unionTypes = this.generateUnionTypes(schema, context, dependencies);
    content += `export type ${typeName} = ${unionTypes.join(" | ")};\n`;

    return content;
  }

  /**
   * Generate union types
   */
  private generateUnionTypes(
    schema: ResolvedSchema,
    context: GenerationContext,
    dependencies: string[]
  ): string[] {
    if (!isOpenAPISchemaObject(schema)) {
      return [];
    }

    const unionSchemas = [...(schema.oneOf || []), ...(schema.anyOf || [])];
    const unionTypes: string[] = [];

    for (const unionSchema of unionSchemas) {
      const unionType = this.generateUnionMemberType(
        unionSchema,
        context,
        dependencies
      );
      if (unionType) {
        unionTypes.push(unionType);
      }
    }

    return unionTypes;
  }

  /**
   * Generate type for a union member
   */
  private generateUnionMemberType(
    schema: ResolvedSchema,
    context: GenerationContext,
    dependencies: string[]
  ): string | null {
    // Handle references
    if ("$ref" in schema && schema.$ref) {
      const baseType = this.extractTypeNameFromRef(schema.$ref as string);
      const refType = this.formatTypeName(baseType);
      if (!dependencies.includes(refType)) {
        dependencies.push(refType);
      }
      return refType;
    }

    if (!isOpenAPISchemaObject(schema)) {
      return null;
    }

    // For inline objects, we'll need to generate an interface first
    // This is a simplified approach - in a full implementation, we'd need
    // to ensure the inline object gets its own generated type
    if (schema.type === "object" && schema.properties) {
      // Generate a type name based on the properties or discriminator
      let typeName = this.generateInlineTypeName(schema, context);

      // Check if this type already exists or needs to be generated
      if (!context.generatedTypes.has(typeName)) {
        // For now, return a placeholder - this would need more sophisticated handling
        // to generate the interface and register it properly
        typeName = "unknown";
      }

      if (!dependencies.includes(typeName)) {
        dependencies.push(typeName);
      }
      return typeName;
    }

    // Handle primitive types
    if (schema.type) {
      return this.mapSchemaTypeToTypeScript(schema.type, schema.format);
    }

    // Handle const values (literal types)
    if (schema.const !== undefined) {
      return JSON.stringify(schema.const);
    }

    // Handle enums
    if (schema.enum) {
      const enumValues = schema.enum.map((val) => JSON.stringify(val));
      return enumValues.join(" | ");
    }

    return null;
  }

  /**
   * Generate type name for inline objects
   */
  private generateInlineTypeName(
    schema: ResolvedSchema,
    _context: GenerationContext
  ): string {
    if (!isOpenAPISchemaObject(schema)) {
      return "Unknown";
    }

    // Try to use discriminator property value
    if (schema.properties && typeof schema.properties === "object") {
      // Look for discriminator property with const value
      for (const [_propName, propSchema] of Object.entries(schema.properties)) {
        if (
          typeof propSchema === "object" &&
          propSchema !== null &&
          "const" in propSchema &&
          propSchema.const
        ) {
          // Use the const value to generate a type name
          const constValue = propSchema.const as string;
          return this.formatTypeName(
            this.convertToPascalCase(constValue) + "Type"
          );
        }
      }
    }

    // Fallback to generic name
    return "InlineType";
  }

  /**
   * Convert string to PascalCase
   */
  private convertToPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
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

    // Try to extract from discriminator
    if (isOpenAPISchemaObject(schema) && schema.discriminator) {
      const discriminatorProperty = schema.discriminator.propertyName;
      return this.formatTypeName(
        this.convertToPascalCase(discriminatorProperty) + "Union"
      );
    }

    // Generate from context if available
    if (context && context.typeRegistry) {
      const existingTypes = context.typeRegistry.getAllTypes();
      let counter = 1;
      let baseName = "UnionType";

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
    return "UnionType";
  }
}
