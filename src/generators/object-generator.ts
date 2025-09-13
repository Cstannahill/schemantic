/**
 * Object type generator for OpenAPI schema objects
 * Handles generation of TypeScript interfaces from OpenAPI schema objects
 */

import { ResolvedSchema, isOpenAPISchemaObject } from "../types/schema";
import { GenerationContext, GeneratedType } from "../types/core";
import { BaseTypeGenerator, TypeGenerationOptions } from "./base";

/**
 * Object type generator implementation
 */
export class ObjectTypeGenerator extends BaseTypeGenerator {
  constructor(options: TypeGenerationOptions) {
    super(options);
  }

  generate(schema: ResolvedSchema, context: GenerationContext): GeneratedType {
    if (!isOpenAPISchemaObject(schema)) {
      throw new Error("Cannot generate object from reference schema");
    }

    const typeName = this.getTypeName(schema, context);
    const dependencies: string[] = [];

    // Generate interface content
    const content = this.generateInterface(schema, context, dependencies);

    // Generate imports
    const imports = this.generateImports();

    // Generate full content
    const fullContent = imports + content;

    return {
      name: typeName,
      content: fullContent,
      dependencies,
      exports: [typeName],
      isInterface: true,
      isEnum: false,
      isUnion: false,
      sourceSchema: schema,
    };
  }

  canHandle(schema: ResolvedSchema): boolean {
    if (!isOpenAPISchemaObject(schema)) {
      return false;
    }

    return (
      (typeof schema.type === "string" && schema.type === "object") ||
      !!(schema.properties && Object.keys(schema.properties).length > 0) ||
      !!(schema.allOf && schema.allOf.length > 0)
    );
  }

  getPriority(): number {
    return 100;
  }

  getMetadata() {
    return {
      name: "Object Type Generator",
      version: "1.0.0",
      description:
        "Generates TypeScript interfaces from OpenAPI schema objects",
      supportedTypes: ["object"],
      supportedFormats: ["json"],
    };
  }

  /**
   * Generate interface content
   */
  private generateInterface(
    schema: ResolvedSchema,
    context: GenerationContext,
    dependencies: string[]
  ): string {
    if (!isOpenAPISchemaObject(schema)) {
      throw new Error("Cannot generate interface from reference schema");
    }

    const typeName = this.getTypeName(schema, context);
    const comment = this.generateComment(schema.description, schema.example);

    let content = "";

    if (comment) {
      content += comment + "\n";
    }

    // Handle inheritance with allOf
    const extendsClause = this.generateExtendsClause(
      schema,
      context,
      dependencies
    );
    content += `export interface ${typeName}${extendsClause} {\n`;

    if (schema.properties) {
      const properties = this.generateProperties(schema, context, dependencies);
      content += properties;
    }

    // Handle properties from allOf non-reference schemas
    if (schema.allOf) {
      const allOfProperties = this.generateAllOfProperties(
        schema,
        context,
        dependencies
      );
      content += allOfProperties;
    }

    content += "}\n";

    return content;
  }

  /**
   * Generate properties for the interface
   */
  private generateProperties(
    schema: ResolvedSchema,
    context: GenerationContext,
    dependencies: string[]
  ): string {
    if (!isOpenAPISchemaObject(schema) || !schema.properties) {
      return "";
    }

    const properties: string[] = [];

    for (const [propertyName, propertySchema] of Object.entries(
      schema.properties
    )) {
      const property = this.generateProperty(
        propertyName,
        propertySchema as ResolvedSchema,
        schema.required,
        context,
        dependencies
      );
      properties.push(property);
    }

    return properties.map((prop) => `  ${prop}`).join("\n") + "\n";
  }

  /**
   * Generate properties from allOf non-reference schemas
   */
  private generateAllOfProperties(
    schema: ResolvedSchema,
    context: GenerationContext,
    dependencies: string[]
  ): string {
    if (!isOpenAPISchemaObject(schema) || !schema.allOf) {
      return "";
    }

    const properties: string[] = [];

    for (const allOfSchema of schema.allOf) {
      // Skip reference schemas (those are handled by extends clause)
      if ("$ref" in allOfSchema && allOfSchema.$ref) {
        continue;
      }

      // Handle inline object schemas
      if (isOpenAPISchemaObject(allOfSchema) && allOfSchema.properties) {
        for (const [propertyName, propertySchema] of Object.entries(
          allOfSchema.properties
        )) {
          const property = this.generateProperty(
            propertyName,
            propertySchema as ResolvedSchema,
            allOfSchema.required,
            context,
            dependencies
          );
          properties.push(property);
        }
      }
    }

    return (
      properties.map((prop) => `  ${prop}`).join("\n") +
      (properties.length > 0 ? "\n" : "")
    );
  }

  /**
   * Generate a single property
   */
  private generateProperty(
    propertyName: string,
    propertySchema: ResolvedSchema,
    required?: string[],
    context?: GenerationContext,
    dependencies?: string[]
  ): string {
    const isOptional = this.isOptional(required, propertyName);
    const isNullable = this.isNullable(propertySchema);
    const comment = isOpenAPISchemaObject(propertySchema)
      ? this.generateComment(propertySchema.description, propertySchema.example)
      : "";

    let property = "";

    if (comment) {
      property += comment + "\n";
    }

    const baseType = this.generatePropertyType(
      propertySchema,
      context,
      dependencies
    );

    // Handle nullable vs optional correctly
    let finalType = baseType;
    if (isNullable && !finalType.includes("| null")) {
      finalType += " | null";
    }
    if (isOptional && !finalType.includes("| undefined")) {
      finalType += " | undefined";
    }

    const formattedName = this.convertName(propertyName);
    property += `${formattedName}${isOptional ? "?" : ""}: ${finalType};`;

    return property;
  }

  /**
   * Check if a property schema is nullable (but not already handled by type array)
   */
  private isNullable(schema: ResolvedSchema): boolean {
    if (!isOpenAPISchemaObject(schema)) {
      return false;
    }

    // Check for nullable property
    if (schema.nullable === true) {
      return true;
    }

    // DON'T add | null if the type array already includes null
    // (this is handled by mapSchemaTypeToTypeScript)
    if (Array.isArray(schema.type) && schema.type.includes("null")) {
      return false; // Already handled by type mapping
    }

    return false;
  }

  /**
   * Generate extends clause for inheritance
   */
  private generateExtendsClause(
    schema: ResolvedSchema,
    _context: GenerationContext,
    dependencies: string[]
  ): string {
    if (!isOpenAPISchemaObject(schema) || !schema.allOf) {
      return "";
    }

    const baseTypes: string[] = [];

    for (const baseSchema of schema.allOf) {
      if ("$ref" in baseSchema && baseSchema.$ref) {
        const baseType = this.extractTypeNameFromRef(baseSchema.$ref as string);
        const refType = this.formatTypeName(baseType);
        if (!dependencies.includes(refType)) {
          dependencies.push(refType);
        }
        baseTypes.push(refType);
      }
    }

    if (baseTypes.length > 0) {
      return ` extends ${baseTypes.join(", ")}`;
    }

    return "";
  }

  /**
   * Generate property type
   */
  private generatePropertyType(
    schema: ResolvedSchema,
    context?: GenerationContext,
    dependencies?: string[]
  ): string {
    // Handle references
    if ("$ref" in schema && schema.$ref) {
      const baseType = this.extractTypeNameFromRef(schema.$ref as string);
      const refType = this.formatTypeName(baseType);
      if (dependencies && !dependencies.includes(refType)) {
        dependencies.push(refType);
      }
      return refType;
    }

    if (!isOpenAPISchemaObject(schema)) {
      return "unknown";
    }

    // Handle arrays
    if (schema.type === "array") {
      const itemType = schema.items
        ? this.generatePropertyType(schema.items, context, dependencies)
        : "unknown";
      return `${itemType}[]`;
    }

    // Handle unions (oneOf, anyOf)
    if (schema.oneOf || schema.anyOf) {
      const unionSchemas = [...(schema.oneOf || []), ...(schema.anyOf || [])];
      const unionTypes = unionSchemas.map((s: ResolvedSchema) =>
        this.generatePropertyType(s, context, dependencies)
      );
      return unionTypes.join(" | ");
    }

    // Handle intersections (allOf)
    if (schema.allOf) {
      const intersectionTypes = schema.allOf.map((s: ResolvedSchema) =>
        this.generatePropertyType(s, context, dependencies)
      );
      return intersectionTypes.join(" & ");
    }

    // Handle const (highest priority for exact values)
    if (schema.const !== undefined) {
      return JSON.stringify(schema.const);
    }

    // Handle enums (prioritize over basic types)
    if (schema.enum) {
      return this.generateEnumType(schema.enum);
    }

    // Handle basic types
    if (schema.type) {
      return this.mapSchemaTypeToTypeScript(schema.type, schema.format);
    }

    // Default fallback
    return "unknown";
  }

  /**
   * Generate enum type
   */
  private generateEnumType(enumValues: unknown[]): string {
    const stringValues = enumValues.map((val) => JSON.stringify(val));
    return stringValues.join(" | ");
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
      let baseName = "GeneratedType";

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
    return "GeneratedType";
  }
}
