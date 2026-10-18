/**
 * Object type generator for OpenAPI schema objects
 * Handles generation of TypeScript interfaces from OpenAPI schema objects
 */

import { ResolvedSchema, isOpenAPISchemaObject } from "../types/schema";
import { GenerationContext, GeneratedType } from "../types/core";
import { BaseTypeGenerator, TypeGenerationOptions } from "./base";
import { propertyKey, schemaType } from "./schema-type";

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

    if (schema.oneOf?.length || schema.anyOf?.length || schema.allOf?.length || schema.nullable || Array.isArray(schema.type) || schema.additionalProperties !== undefined || !schema.properties) {
      const expression = this.generatePropertyType(schema, context, dependencies);
      return { name: typeName, content: 'export type ' + typeName + ' = ' + expression + ';\n',
        dependencies, exports: [typeName], isInterface: false, isEnum: false,
        isUnion: !!(schema.oneOf || schema.anyOf), sourceSchema: schema };
    }

    // Generate interface content (supports allOf merging/extends)
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
      !!(schema.properties && Object.keys(schema.properties).length > 0)
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

    // Support allOf inheritance: extract first $ref as base and merge inline object props
    let extendsClause = "";
    let workingSchema: ResolvedSchema = schema;
    if (schema.allOf && schema.allOf.length > 0) {
      let baseType: string | undefined;
      const mergedProps: Record<string, ResolvedSchema> = {};
      let mergedRequired: string[] | undefined;

      for (const s of schema.allOf) {
        if ("$ref" in s && s.$ref) {
          const baseName = this.extractTypeNameFromRef(s.$ref as string);
          baseType = this.formatTypeName(baseName);
          if (dependencies && baseType && !dependencies.includes(baseType)) {
            dependencies.push(baseType);
          }
        } else if (isOpenAPISchemaObject(s)) {
          if (s.properties) {
            Object.assign(
              mergedProps,
              s.properties as Record<string, ResolvedSchema>
            );
          }
          if (Array.isArray(s.required)) {
            mergedRequired = [...(mergedRequired || []), ...s.required];
          }
        }
      }

      if (baseType) {
        extendsClause = ` extends ${baseType}`;
      }

      if (Object.keys(mergedProps).length > 0) {
        workingSchema = {
          type: "object",
          properties: mergedProps,
          ...(mergedRequired ? { required: mergedRequired } : {}),
        } as ResolvedSchema;
      }
    }

    content += `export interface ${typeName}${extendsClause} {\n`;

    if (isOpenAPISchemaObject(workingSchema) && workingSchema.properties) {
      const properties = this.generateProperties(
        workingSchema,
        context,
        dependencies
      );
      content += properties;
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
    const comment = isOpenAPISchemaObject(propertySchema)
      ? this.generateComment(propertySchema.description, propertySchema.example)
      : "";

    let property = "";

    if (comment) {
      property += comment + "\n";
    }

    const type = this.generatePropertyType(
      propertySchema,
      context,
      dependencies
    );
    const optionalType = this.wrapOptional(type, isOptional);

    const formattedName = propertyKey(propertyName);
    property += `${formattedName}${isOptional ? "?" : ""}: ${optionalType};`;

    return property;
  }

  /**
   * Generate property type
   */
  private generatePropertyType(schema: ResolvedSchema, context?: GenerationContext, dependencies?: string[]): string {
    return schemaType(schema, ref => {
      const name = this.formatTypeName(this.extractTypeNameFromRef(ref));
      if (dependencies && !dependencies.includes(name)) dependencies.push(name);
      return name;
    }, this.options.customTypeMappings, context?.schemaResolver);
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
