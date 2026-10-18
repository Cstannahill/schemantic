/**
 * Primitive type generator for OpenAPI schema primitives
 * Handles generation of TypeScript types for basic OpenAPI schema types
 */

import { ResolvedSchema, isOpenAPISchemaObject } from "../types/schema";
import { GenerationContext, GeneratedType } from "../types/core";
import { BaseTypeGenerator, TypeGenerationOptions } from "./base";
import { schemaType } from "./schema-type";

/**
 * Primitive type generator implementation
 */
export class PrimitiveTypeGenerator extends BaseTypeGenerator {
  constructor(options: TypeGenerationOptions) {
    super(options);
  }

  generate(schema: ResolvedSchema, context: GenerationContext): GeneratedType {


    const typeName = this.getTypeName(schema, context);
    const comment = isOpenAPISchemaObject(schema) ? this.generateComment(schema.description, schema.example) : "";

    let content = "";

    if (comment) {
      content += comment + "\n";
    }

    // Generate type alias
    const dependencies: string[] = [];
    const expression = schemaType(schema, ref => {
      const name = this.formatTypeName(this.extractTypeNameFromRef(ref));
      dependencies.push(name);
      return name;
    }, this.options.customTypeMappings, context.schemaResolver);
    const typeAlias = 'export type ' + typeName + ' = ' + expression + ';\n';
    content += typeAlias;

    return {
      name: typeName,
      content,
      dependencies,
      exports: [typeName],
      isInterface: false,
      isEnum: false,
      isUnion: false,
      sourceSchema: schema,
    };
  }

  canHandle(_schema: ResolvedSchema): boolean { return true; }

  getPriority(): number {
    return 50; // Lower priority than specialized generators
  }

  getMetadata() {
    return {
      name: "Primitive Type Generator",
      version: "1.0.0",
      description: "Generates TypeScript types for OpenAPI primitive types",
      supportedTypes: ["string", "number", "integer", "boolean", "array"],
      supportedFormats: ["json"],
    };
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
      let baseName = "GeneratedPrimitive";

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
    return "GeneratedPrimitive";
  }
}
