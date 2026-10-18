/**
 * OpenAPI 3.0+ schema parser implementation
 * Handles parsing and validation of OpenAPI specifications from FastAPI applications
 */

import * as fs from "fs/promises";
// Removed unused path import
import axios from "axios";
import {
  OpenAPISchema,
  OpenAPIPaths,
  OpenAPIOperation,
  OpenAPIRef,
  OpenAPIComponents,
  OpenAPISchemaObject,
  OpenAPIParameter,
} from "../types/openapi";
import { ResolvedSchema } from "../types/schema";
import { SchemanticConfig } from "../types/core";
import {
  BaseSchemaParser,
  SchemaInput,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ParserMetadata,
  parseJsonSchemaText,
} from "./base";

/**
 * OpenAPI parser implementation
 */
export class OpenAPIParser extends BaseSchemaParser<OpenAPISchema> {
  private readonly SUPPORTED_VERSIONS = ['3.0.0', '3.0.1', '3.0.2', '3.0.3', '3.0.x', '3.1.0', '3.1.x'];

  private supportsVersion(version: string): boolean { return /^3\.(0|1)\.\d+$/.test(version); }

  constructor(config: SchemanticConfig) {
    super(config);
  }

  async parse(input: SchemaInput): Promise<OpenAPISchema> {
    let schemaData: unknown;

    if (input.data) {
      schemaData = input.data;
    } else if (input.string) {
      schemaData = parseJsonSchemaText(input.string);
    } else if (input.filePath) {
      const fileContent = await fs.readFile(input.filePath, "utf-8");
      schemaData = parseJsonSchemaText(fileContent);
    } else if (input.url) {
      const response = await axios.get(input.url, {
        headers: {
          Accept: "application/json",
        },
      });
      schemaData = typeof response.data === 'string' ? parseJsonSchemaText(response.data) : response.data;
    } else {
      throw new Error("No valid input source provided");
    }

    return this.validateAndTransform(schemaData);
  }

  async validate(schema: OpenAPISchema): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate OpenAPI version
    if (!this.supportsVersion(schema.openapi)) {
      errors.push({
        code: "UNSUPPORTED_VERSION",
        message: `Unsupported OpenAPI version: ${schema.openapi}`,
        path: "openapi",
        severity: "error",
      });
    }

    // Validate required fields
    if (!schema.info) {
      errors.push({
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: info",
        path: "info",
        severity: "error",
      });
    }

    if (!schema.paths && !(schema.openapi.startsWith('3.1.') && (schema.components || schema.webhooks))) {
      errors.push({
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: paths",
        path: "paths",
        severity: "error",
      });
    }

    // Validate info object
    if (schema.info) {
      if (!schema.info.title) {
        errors.push({
          code: "MISSING_REQUIRED_FIELD",
          message: "Missing required field: info.title",
          path: "info.title",
          severity: "error",
        });
      }

      if (!schema.info.version) {
        errors.push({
          code: "MISSING_REQUIRED_FIELD",
          message: "Missing required field: info.version",
          path: "info.version",
          severity: "error",
        });
      }
    }

    // Validate paths
    if (schema.paths) {
      this.validatePaths(schema.paths, errors, warnings);
    }

    // Validate components
    if (schema.components) {
      this.validateComponents(schema.components, errors, warnings, schema.openapi.startsWith('3.1.'));
    }

    this.validateReferencesAndApproximations(schema, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  createResolver(
    schema: OpenAPISchema
  ): (ref: string) => ResolvedSchema | undefined {
    return (ref: string): ResolvedSchema | undefined => {
      return this.resolveReference(ref, schema);
    };
  }

  getMetadata(): ParserMetadata {
    return {
      name: "OpenAPI Parser",
      version: "1.0.0",
      supportedFormats: ["json"],
      supportedVersions: this.SUPPORTED_VERSIONS,
      description:
        "Parser for OpenAPI 3.0+ specifications from FastAPI applications",
    };
  }

  /**
   * Validate and transform raw schema data
   */
  private validateAndTransform(data: unknown): OpenAPISchema {
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid schema data: expected object");
    }

    const schema = structuredClone(data) as Record<string, unknown>;

    // Ensure required fields exist
    if (!schema.openapi || typeof schema.openapi !== "string") {
      throw new Error("Invalid schema: missing or invalid openapi field");
    }

    if (!schema.info || typeof schema.info !== "object" || Array.isArray(schema.info)) {
      throw new Error("Invalid schema: missing or invalid info field");
    }

    const dialect31 = schema.openapi.startsWith('3.1.');
    if (schema.paths === undefined && dialect31 && (schema.components || schema.webhooks)) schema.paths = {};
    if (!schema.paths || typeof schema.paths !== "object" || Array.isArray(schema.paths)) {
      throw new Error("Invalid schema: missing or invalid paths field");
    }

    this.normalizeSchemaLocations(schema, dialect31);
    return schema as unknown as OpenAPISchema;
  }

  /** Normalize only Schema Object locations: booleans in examples/defaults are payload data. */
  private normalizeSchemaLocations(document: Record<string, unknown>, dialect31: boolean): void {
    const normalize = (value: unknown): unknown => {
      if (typeof value === 'boolean') {
        if (!dialect31) throw new Error('Boolean schemas require the OpenAPI 3.1 dialect');
        return value ? {} : { not: {} };
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
      const schema = value as Record<string, unknown>;
      if (typeof schema.$ref === 'string' && !dialect31) return { $ref: schema.$ref };
      if (schema.properties && typeof schema.properties === 'object') {
        schema.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, child]) => [key, normalize(child)]));
      }
      for (const keyword of ['items', 'not', 'if', 'then', 'else', 'contains', 'propertyNames', 'unevaluatedProperties', 'unevaluatedItems']) {
        if (schema[keyword] !== undefined) schema[keyword] = normalize(schema[keyword]);
      }
      // additionalProperties booleans have their own well-supported object semantics.
      if (schema.additionalProperties && typeof schema.additionalProperties === 'object') schema.additionalProperties = normalize(schema.additionalProperties);
      for (const keyword of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
        if (Array.isArray(schema[keyword])) schema[keyword] = (schema[keyword] as unknown[]).map(normalize);
      }
      for (const keyword of ['$defs', 'definitions', 'patternProperties', 'dependentSchemas']) {
        if (schema[keyword] && typeof schema[keyword] === 'object') schema[keyword] = Object.fromEntries(
          Object.entries(schema[keyword] as Record<string, unknown>).map(([key, child]) => [key, normalize(child)]));
      }
      return schema;
    };
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const object = value as Record<string, unknown>;
      for (const [key, child] of Object.entries(object)) {
        if (key === 'schema') object[key] = normalize(child);
        else if (key === 'schemas' && child && typeof child === 'object') object[key] = Object.fromEntries(
          Object.entries(child).map(([name, schema]) => [name, normalize(schema)]));
        else if (!['example', 'examples', 'default', 'enum', 'const'].includes(key)) visit(child);
      }
    };
    visit(document);
  }

  private validateReferencesAndApproximations(schema: OpenAPISchema, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const resolver = this.createResolver(schema);
    const visit = (value: unknown, path: string): void => {
      if (!value || typeof value !== 'object') return;
      const object = value as Record<string, unknown>;
      if (typeof object.$ref === 'string') {
        const unsupported = !object.$ref.startsWith('#/');
        let resolved: ResolvedSchema | undefined;
        try { resolved = resolver(object.$ref); } catch { resolved = undefined; }
        if (unsupported || resolved === undefined) errors.push({
          code: unsupported ? 'UNSUPPORTED_REFERENCE' : 'UNRESOLVED_REFERENCE',
          message: `${unsupported ? 'External references are not supported' : 'Unresolved local reference'}: ${object.$ref}`,
          path: `${path}.$ref`, severity: 'error',
        });
      }
      if (object.properties && typeof object.properties === 'object' && Object.keys(object.properties).length
        && object.additionalProperties && typeof object.additionalProperties === 'object') warnings.push({
        code: 'DICTIONARY_TYPE_APPROXIMATION', path,
        message: 'TypeScript string index signatures include declared property keys; additional property values are widened to include declared member types.',
        suggestion: 'Validate dictionary payloads at runtime when exact additionalProperties constraints are required.',
      });
      for (const [key, child] of Object.entries(object)) {
        if (!['example', 'examples', 'default', 'enum', 'const'].includes(key)) visit(child, path ? `${path}.${key}` : key);
      }
    };
    visit(schema, '');
  }

  /**
   * Validate paths object
   */
  private validatePaths(
    paths: OpenAPIPaths,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    for (const [pathKey, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== "object") {
        errors.push({
          code: "INVALID_PATH_ITEM",
          message: `Invalid path item for path: ${pathKey}`,
          path: `paths.${pathKey}`,
          severity: "error",
        });
        continue;
      }

      // Validate path parameters
      if (pathItem.parameters) {
        this.validateParameters(
          pathItem.parameters,
          `paths.${pathKey}.parameters`,
          errors,
          warnings
        );
      }

      // Validate operations
      const operations = [
        "get",
        "put",
        "post",
        "delete",
        "options",
        "head",
        "patch",
        "trace",
      ] as const;
      for (const operation of operations) {
        if (pathItem[operation]) {
          this.validateOperation(
            pathItem[operation]!,
            `paths.${pathKey}.${operation}`,
            errors,
            warnings
          );
        }
      }
    }
  }

  /**
   * Validate operation object
   */
  private validateOperation(
    operation: OpenAPIOperation,
    path: string,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    // Validate operationId
    if (!operation.operationId) {
      _warnings.push({
        code: "MISSING_OPERATION_ID",
        message: "Operation missing operationId - will generate automatically",
        path: `${path}.operationId`,
      });
    }

    // Validate parameters
    if (operation.parameters) {
      this.validateParameters(
        operation.parameters,
        `${path}.parameters`,
        errors,
        _warnings
      );
    }

    // Validate requestBody
    if (
      operation.requestBody &&
      typeof operation.requestBody === "object" &&
      !("$ref" in operation.requestBody)
    ) {
      if (!operation.requestBody.content) {
        errors.push({
          code: "MISSING_REQUEST_BODY_CONTENT",
          message: "Request body missing content",
          path: `${path}.requestBody.content`,
          severity: "error",
        });
      }
    }

    // Validate responses
    if (!operation.responses || Object.keys(operation.responses).length === 0) {
      errors.push({
        code: "MISSING_RESPONSES",
        message: "Operation missing responses",
        path: `${path}.responses`,
        severity: "error",
      });
    }
  }

  /**
   * Validate parameters array
   */
  private validateParameters(
    parameters: (OpenAPIParameter | OpenAPIRef)[],
    path: string,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    if (!Array.isArray(parameters)) {
      errors.push({
        code: "INVALID_PARAMETERS",
        message: "Parameters must be an array",
        path,
        severity: "error",
      });
      return;
    }

    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i]!;
      if (typeof param !== "object" || param === null) {
        errors.push({
          code: "INVALID_PARAMETER",
          message: `Invalid parameter at index ${i}`,
          path: `${path}[${i}]`,
          severity: "error",
        });
        continue;
      }

      // Skip $ref parameters
      if ("$ref" in param) {
        continue;
      }

      const concreteParam: OpenAPIParameter = param;

      if (!concreteParam.name) {
        errors.push({
          code: "MISSING_PARAMETER_NAME",
          message: `Parameter missing name at index ${i}`,
          path: `${path}[${i}].name`,
          severity: "error",
        });
      }

      if (!concreteParam.in) {
        errors.push({
          code: "MISSING_PARAMETER_LOCATION",
          message: `Parameter missing 'in' field at index ${i}`,
          path: `${path}[${i}].in`,
          severity: "error",
        });
      }
    }
  }

  /**
   * Validate components object
   */
  private validateComponents(
    components: OpenAPIComponents,
    errors: ValidationError[],
    _warnings: ValidationWarning[],
    allowBoolean: boolean
  ): void {
    // Validate schemas
    if (components.schemas) {
      this.validateSchemas(
        components.schemas,
        "components.schemas",
        errors,
        _warnings,
        allowBoolean
      );
    }

    // Validate other component types
    const componentTypes: (keyof OpenAPIComponents)[] = [
      "responses",
      "parameters",
      "examples",
      "requestBodies",
      "headers",
      "securitySchemes",
      "links",
      "callbacks",
      "pathItems",
    ];
    for (const componentType of componentTypes) {
      const value = components[componentType];
      if (value) {
        this.validateComponentType(
          value as Record<string, unknown>,
          `components.${String(componentType)}`,
          errors,
          _warnings
        );
      }
    }
  }

  /**
   * Validate schemas object
   */
  private validateSchemas(
    schemas: Record<string, OpenAPISchemaObject | OpenAPIRef | boolean>,
    path: string,
    errors: ValidationError[],
    _warnings: ValidationWarning[],
    allowBoolean: boolean
  ): void {
    for (const [schemaName, schema] of Object.entries(schemas)) {
      if (typeof schema === 'boolean' && allowBoolean) continue; // Raw 3.1 inputs are normalized by parse().
      if (typeof schema !== "object" || schema === null) {
        errors.push({
          code: "INVALID_SCHEMA",
          message: `Invalid schema: ${schemaName}`,
          path: `${path}.${schemaName}`,
          severity: "error",
        });
        continue;
      }

      // Skip $ref schemas
      if ("$ref" in (schema as OpenAPIRef)) {
        continue;
      }

      // Check for circular references
      if (this.hasCircularReference(schema as OpenAPISchemaObject, new Set())) {
        _warnings.push({
          code: "CIRCULAR_REFERENCE",
          message: `Potential circular reference in schema: ${schemaName}`,
          path: `${path}.${schemaName}`,
          suggestion: "Consider using $ref for circular references",
        });
      }
    }
  }

  /**
   * Validate component type object
   */
  private validateComponentType(
    componentType: Record<string, unknown>,
    path: string,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    for (const [componentName, component] of Object.entries(componentType)) {
      if (typeof component !== "object" || component === null) {
        errors.push({
          code: "INVALID_COMPONENT",
          message: `Invalid component: ${componentName}`,
          path: `${path}.${componentName}`,
          severity: "error",
        });
      }
    }
  }

  /**
   * Check for circular references in schema
   */
  private hasCircularReference(obj: unknown, visited: Set<string>): boolean {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }

    const objStr = JSON.stringify(obj);
    if (visited.has(objStr)) {
      return true;
    }

    visited.add(objStr);

    for (const value of Object.values(obj)) {
      if (this.hasCircularReference(value, new Set(visited))) {
        return true;
      }
    }

    return false;
  }
}
