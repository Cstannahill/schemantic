/**
 * API client generator for OpenAPI specifications
 * Generates TypeScript API client classes with proper typing from OpenAPI schemas
 */

import {
  OpenAPISchema,
  OpenAPIPaths,
  OpenAPIOperation,
} from "../types/openapi";
import {
  GenerationContext,
  GeneratedApiClient,
  GeneratedEndpoint,
  GeneratedParameter,
  GeneratedRequestBody,
  GeneratedResponse,
} from "../types/core";
// Removed unused TypeGeneratorFactory import

/**
 * API client generator implementation
 */
export class ApiClientGenerator {
  private context: GenerationContext;
  constructor(context: GenerationContext) {
    // Store context for access to config (namingConvention, etc.)
    this.context = context;
  }

  /**
   * Generate API client from OpenAPI schema
   */
  generate(context: GenerationContext): GeneratedApiClient {
    const schema = context.schema;
    const clientName = this.getClientName(schema);

    // Extract endpoints from paths
    const endpoints = this.extractEndpoints(schema.paths, context);

    // Generate client class
    const clientContent = this.generateClientClass(clientName, endpoints);

    // Generate imports
    const imports = this.generateImports(endpoints);

    // Generate full content
    const fullContent = imports + clientContent;

    return {
      name: clientName,
      content: fullContent,
      dependencies: this.getDependencies(endpoints),
      exports: [clientName, "ApiClientError"],
      endpoints,
    };
  }

  /**
   * Extract endpoints from OpenAPI paths
   */
  private extractEndpoints(
    paths: OpenAPIPaths,
    context: GenerationContext
  ): GeneratedEndpoint[] {
    const endpoints: GeneratedEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== "object") {
        continue;
      }

      // Extract operations from path item
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

      for (const method of operations) {
        const operation = pathItem[method];
        if (operation) {
          const endpoint = this.extractEndpoint(
            path,
            method.toUpperCase(),
            operation,
            context
          );
          if (endpoint) {
            endpoints.push(endpoint);
          }
        }
      }
    }

    return endpoints;
  }

  /**
   * Extract endpoint information from operation
   */
  private extractEndpoint(
    path: string,
    method: string,
    operation: OpenAPIOperation,
    context: GenerationContext
  ): GeneratedEndpoint | undefined {
    const operationId =
      operation.operationId ||
      this.generateOperationId(path, method, operation);
    const functionName = this.convertToFunctionName(operationId);

    // Extract parameters
    const parameters = this.extractParameters(
      operation.parameters || [],
      context
    );

    // Extract request body
    const requestBody = this.extractRequestBody(operation.requestBody, context);

    // Extract responses
    const responses = this.extractResponses(operation.responses, context);

    // Determine return type
    const returnType = this.determineReturnType(responses);

    const endpoint: GeneratedEndpoint = {
      operationId,
      method,
      path,
      parameters,
      responses,
      returnType,
      functionName,
    };

    if (requestBody) {
      endpoint.requestBody = requestBody;
    }

    return endpoint;
  }

  /**
   * Extract parameters from operation
   */
  private extractParameters(
    parameters: any[],
    context: GenerationContext
  ): GeneratedParameter[] {
    const validParameters: GeneratedParameter[] = [];

    for (const param of parameters) {
      if (typeof param !== "object" || param === null) {
        continue;
      }

      const type = this.extractParameterType(param.schema, context);
      const isRequired = param.required || false;

      validParameters.push({
        name: param.name,
        type,
        isOptional: !isRequired,
        isRequired,
        location: param.in,
        description: param.description,
      });
    }

    return validParameters;
  }

  /**
   * Extract request body from operation
   */
  private extractRequestBody(
    requestBody: any,
    context: GenerationContext
  ): GeneratedRequestBody | undefined {
    if (!requestBody || typeof requestBody !== "object") {
      return undefined;
    }

    // Handle reference
    if (requestBody.$ref) {
      const resolvedSchema = context.schemaResolver(requestBody.$ref);
      if (resolvedSchema) {
        const type = this.extractSchemaType(resolvedSchema, context);
        return {
          type,
          isOptional: !requestBody.required,
          description: requestBody.description,
        };
      }
    }

    // Handle inline request body
    if (requestBody.content) {
      const contentType = Object.keys(requestBody.content)[0];
      if (!contentType) return undefined;
      const mediaType = requestBody.content[contentType];

      if (mediaType && mediaType.schema) {
        const type = this.extractSchemaType(mediaType.schema, context);
        const body: GeneratedRequestBody = {
          type,
          isOptional: !requestBody.required,
          description: requestBody.description,
        };

        if (contentType) {
          body.contentType = contentType;
        }

        return body;
      }
    }

    return undefined;
  }

  /**
   * Extract responses from operation
   */
  private extractResponses(
    responses: any,
    context: GenerationContext
  ): GeneratedResponse[] {
    const responseList: GeneratedResponse[] = [];

    for (const [statusCode, response] of Object.entries(responses)) {
      if (typeof response !== "object" || response === null) {
        continue;
      }

      const responseObj = response as any; // Type assertion for OpenAPI response object

      // Handle reference
      if (responseObj.$ref) {
        const resolvedSchema = context.schemaResolver(responseObj.$ref);
        if (resolvedSchema) {
          const type = this.extractSchemaType(resolvedSchema, context);
          responseList.push({
            statusCode,
            type,
            isOptional: false,
            description: responseObj.description,
          });
        }
        continue;
      }

      // Handle inline response
      if (responseObj.content) {
        const contentType = Object.keys(responseObj.content)[0];
        if (!contentType) {
          // Response without content type
          responseList.push({
            statusCode,
            type: "void",
            isOptional: false,
            description: responseObj.description,
          });
          continue;
        }
        const mediaType = responseObj.content[contentType];

        if (mediaType && mediaType.schema) {
          const type = this.extractSchemaType(mediaType.schema, context);
          responseList.push({
            statusCode,
            type,
            isOptional: false,
            description: responseObj.description,
          });
        }
      } else {
        // Response without content
        responseList.push({
          statusCode,
          type: "void",
          isOptional: false,
          description: responseObj.description,
        });
      }
    }

    return responseList;
  }

  /**
   * Determine return type from responses
   */
  private determineReturnType(responses: GeneratedResponse[]): string {
    if (responses.length === 0) {
      return "void";
    }

    if (responses.length === 1) {
      return responses[0]!.type;
    }

    // Multiple responses - create union type
    const types = responses.map((r) => r.type);
    return types.join(" | ");
  }

  /**
   * Extract parameter type from schema
   */
  private extractParameterType(
    schema: any,
    context: GenerationContext
  ): string {
    if (!schema) {
      return "unknown";
    }

    return this.extractSchemaType(schema, context);
  }

  /**
   * Extract schema type
   */
  private extractSchemaType(schema: any, context: GenerationContext): string {
    // Handle reference
    if (schema.$ref) {
      const refType = this.extractTypeNameFromRef(schema.$ref);
      // Normalize and apply prefix/suffix to match type generator output
      return this.formatTypeName(refType, context);
    }

    // Handle basic types
    if (schema.type) {
      return this.mapSchemaTypeToTypeScript(schema.type, schema.format);
    }

    // Handle enums
    if (schema.enum) {
      return schema.enum.map((val: any) => JSON.stringify(val)).join(" | ");
    }

    // Handle const
    if (schema.const !== undefined) {
      return JSON.stringify(schema.const);
    }

    return "unknown";
  }

  /**
   * Generate client class
   */
  private generateClientClass(
    clientName: string,
    endpoints: GeneratedEndpoint[]
  ): string {
    let content = "";

    // Generate configuration interface
    content += this.generateConfigInterface();
    content += "\n\n";

    // Generate error class
    content += this.generateErrorClass();
    content += "\n\n";

    // Generate client class
    content += `export class ${clientName} {\n`;
    content += `  private baseUrl: string;\n`;
    content += `  private config: ApiClientConfig;\n\n`;

    // Generate constructor
    content += this.generateConstructor();
    content += "\n\n";

    // Generate endpoint methods
    for (const endpoint of endpoints) {
      content += this.generateEndpointMethod(endpoint);
      content += "\n\n";
    }

    // Generate utility methods
    content += this.generateUtilityMethods();

    content += "}\n";

    return content;
  }

  /**
   * Generate configuration interface
   */
  private generateConfigInterface(): string {
    return `export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
}`;
  }

  /**
   * Generate error class
   */
  private generateErrorClass(): string {
    return `export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}`;
  }

  /**
   * Generate constructor
   */
  private generateConstructor(): string {
    return `  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\\/$/, '');
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }`;
  }

  /**
   * Generate endpoint method
   */
  private generateEndpointMethod(endpoint: GeneratedEndpoint): string {
    const methodName = endpoint.functionName;
    const parameters = this.generateMethodParameters(endpoint);
    const returnType = endpoint.returnType;

    let method = `  async ${methodName}(${parameters}): Promise<${returnType}> {\n`;

    // Generate method body
    method += this.generateMethodBody(endpoint);

    method += "  }";

    return method;
  }

  /**
   * Generate method parameters
   */
  private generateMethodParameters(endpoint: GeneratedEndpoint): string {
    const params: string[] = [];

    // Collect all parameters
    const allParams: { name: string; type: string; isOptional: boolean }[] = [];

    // Add path parameters (always required)
    const pathParams = endpoint.parameters.filter((p) => p.location === "path");
    pathParams.forEach((p) => {
      allParams.push({ name: p.name, type: p.type, isOptional: false });
    });

    // Add query parameters
    const queryParams = endpoint.parameters.filter(
      (p) => p.location === "query"
    );
    queryParams.forEach((p) => {
      allParams.push({ name: p.name, type: p.type, isOptional: p.isOptional });
    });

    // Add request body
    if (endpoint.requestBody) {
      allParams.push({
        name: "body",
        type: endpoint.requestBody.type,
        isOptional: endpoint.requestBody.isOptional,
      });
    }

    // Sort parameters: required first, then optional
    allParams.sort((a, b) => {
      if (a.isOptional === b.isOptional) return 0;
      return a.isOptional ? 1 : -1; // Required (false) comes before optional (true)
    });

    // Convert to string format
    allParams.forEach((p) => {
      params.push(`${p.name}${p.isOptional ? "?" : ""}: ${p.type}`);
    });

    // Add options parameter (always optional, always last)
    params.push("options?: RequestInit");

    return params.join(", ");
  }

  /**
   * Generate method body
   */
  private generateMethodBody(endpoint: GeneratedEndpoint): string {
    let body = "";

    // Generate URL construction
    body += this.generateUrlConstruction(endpoint);
    body += "\n";

    // Generate request options
    body += this.generateRequestOptions(endpoint);
    body += "\n";

    // Generate fetch call
    body += this.generateFetchCall(endpoint);
    body += "\n";

    // Generate response handling
    body += this.generateResponseHandling(endpoint);

    return body;
  }

  /**
   * Generate URL construction
   */
  private generateUrlConstruction(endpoint: GeneratedEndpoint): string {
    let urlConstruction =
      "    const url = new URL(`${this.baseUrl}${this.buildPath(`";

    // Replace path parameters
    const pathParams = endpoint.parameters.filter((p) => p.location === "path");
    let path = endpoint.path;

    for (const param of pathParams) {
      path = path.replace(`{${param.name}}`, `\${${param.name}}`);
    }

    urlConstruction += path;
    // Add path parameters
    if (pathParams.length > 0) {
      const pathParamEntries = pathParams.map((p) => `${p.name}`).join(", ");
      // Close buildPath first argument backtick, add params object, close buildPath, close ${}, close template, then close new URL
      urlConstruction += "`, { " + pathParamEntries + " })}`);\n";
    } else {
      // Close buildPath first argument backtick, add empty params, close buildPath, close ${}, close template, then close new URL
      urlConstruction += "`, {})}`);\n";
    }

    // Add query parameters
    const queryParams = endpoint.parameters.filter(
      (p) => p.location === "query"
    );
    if (queryParams.length > 0) {
      urlConstruction += "\n    // Add query parameters\n";
      for (const param of queryParams) {
        urlConstruction += "    if (" + param.name + " !== undefined) {\n";
        urlConstruction +=
          "      url.searchParams.set('" +
          param.name +
          "', String(" +
          param.name +
          "));\n";
        urlConstruction += "    }\n";
      }
    }

    return urlConstruction;
  }

  /**
   * Generate request options
   */
  private generateRequestOptions(endpoint: GeneratedEndpoint): string {
    let options = "    const requestOptions: RequestInit = {\n";
    options += "      method: '" + endpoint.method + "',\n";
    options += "      headers: {\n";
    options += "        ...this.config.headers,\n";

    // Add content type for request body
    if (endpoint.requestBody) {
      options += "        'Content-Type': 'application/json',\n";
    }

    options += "        ...options?.headers,\n";
    options += "      },\n";

    // Add request body
    if (endpoint.requestBody) {
      options += "      body: body ? JSON.stringify(body) : undefined,\n";
    }

    options += "      ...options,\n";
    options += "    };\n";

    return options;
  }

  /**
   * Generate fetch call
   */
  private generateFetchCall(_endpoint: GeneratedEndpoint): string {
    let fetchCall =
      "    const response = await fetch(url.toString(), requestOptions);\n";
    fetchCall += "\n";
    fetchCall += "    if (!response.ok) {\n";
    fetchCall += "      throw new ApiClientError(\n";
    fetchCall +=
      "        'Request failed: ' + response.status + ' ' + response.statusText,\n";
    fetchCall += "        response.status,\n";
    fetchCall += "        response\n";
    fetchCall += "      );\n";
    fetchCall += "    }\n";

    return fetchCall;
  }

  /**
   * Generate response handling
   */
  private generateResponseHandling(endpoint: GeneratedEndpoint): string {
    let handling = "";

    if (endpoint.returnType === "void") {
      handling += "    return;\n";
    } else {
      handling += "    return response.json();\n";
    }

    return handling;
  }

  /**
   * Generate utility methods
   */
  private generateUtilityMethods(): string {
    return (
      "  private buildPath(template: string, params: Record<string, string | number>): string {\n" +
      "    return template.replace(/\\{([^}]+)\\}/g, (match, key) => {\n" +
      "      const value = params[key];\n" +
      "      if (value === undefined) {\n" +
      "        throw new Error('Missing required path parameter: ' + key);\n" +
      "      }\n" +
      "      return String(value);\n" +
      "    });\n" +
      "  }"
    );
  }

  /**
   * Generate imports
   */
  private generateImports(endpoints: GeneratedEndpoint[]): string {
    const imports: string[] = [];

    // Add type imports. Endpoint types are already formatted; don't re-apply prefix/suffix.
    const typeNames = this.getTypeNamesFromEndpoints(endpoints);
    if (typeNames.length > 0) {
      imports.push(`import { ${typeNames.join(", ")} } from './types';`);
    }

    return imports.length > 0 ? imports.join("\n") + "\n\n" : "";
  }

  /**
   * Get type names from endpoints
   */
  private getTypeNamesFromEndpoints(endpoints: GeneratedEndpoint[]): string[] {
    const typeNames = new Set<string>();

    for (const endpoint of endpoints) {
      // Extract type names from return type
      const returnTypeNames = this.extractTypeNamesFromType(
        endpoint.returnType
      );
      returnTypeNames.forEach((name) => typeNames.add(name));

      // Extract type names from request body
      if (endpoint.requestBody) {
        const bodyTypeNames = this.extractTypeNamesFromType(
          endpoint.requestBody.type
        );
        bodyTypeNames.forEach((name) => typeNames.add(name));
      }

      // Extract type names from parameters
      for (const param of endpoint.parameters) {
        const paramTypeNames = this.extractTypeNamesFromType(param.type);
        paramTypeNames.forEach((name) => typeNames.add(name));
      }
    }

    return Array.from(typeNames);
  }

  /**
   * Extract type names from type string
   */
  private extractTypeNamesFromType(type: string): string[] {
    // Simple extraction - in a real implementation, this would be more sophisticated
    // Capture PascalCase and bracketed/generic-like names and underscores
    const matches = type.match(/[A-Z][A-Za-z0-9_]*|[A-Za-z0-9_]+(?=\])/g);
    return matches || [];
  }

  /**
   * Get dependencies from endpoints
   */
  private getDependencies(endpoints: GeneratedEndpoint[]): string[] {
    return this.getTypeNamesFromEndpoints(endpoints);
  }

  /**
   * Apply configured prefix/suffix to a type name
   */
  /**
   * Normalize a type name using the same rules as BaseTypeGenerator and apply prefix/suffix
   */
  private formatTypeName(name: string, context: GenerationContext): string {
    // Sanitize and convert to PascalCase for type identifiers
    const sanitized = name
      .replace(/\[/g, "<")
      .replace(/\]/g, ">")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
    const converted = this.toPascalCase(sanitized);
    const { typePrefix, typeSuffix } = context.config;
    let result = converted;
    if (typePrefix) result = `${typePrefix}${result}`;
    if (typeSuffix) result = `${result}${typeSuffix}`;
    return result;
  }

  private toPascalCase(str: string): string {
    if (!str) return str;
    const tokens = str.split(/_+/).filter(Boolean);
    return tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join("");
  }

  /**
   * Get client name
   */
  private getClientName(schema: OpenAPISchema): string {
    if (schema.info && schema.info.title) {
      const raw = schema.info.title.trim();
      // Tokenize on non-alphanumerics, drop empty
      const tokens = raw
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      // Avoid duplicate 'Api'
      if (tokens.length > 1 && /^(api)$/i.test(tokens[tokens.length - 1]!)) {
        tokens.pop();
      }
      const pascal = tokens
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .join("");
      return (pascal || "Api") + "ApiClient";
    }

    return "ApiClient";
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(
    path: string,
    method: string,
    _operation: OpenAPIOperation
  ): string {
    const pathParts = path
      .split("/")
      .filter((part) => part && !part.startsWith("{"));
    const methodPrefix = method.toLowerCase();

    if (pathParts.length > 0) {
      return `${methodPrefix}${pathParts
        .map((part) => this.capitalize(part))
        .join("")}`;
    }

    return `${methodPrefix}${this.capitalize(
      path.replace(/[^a-zA-Z0-9]/g, "")
    )}`;
  }

  /**
   * Convert to function name
   */
  private convertToFunctionName(operationId: string): string {
    // Normalize to tokens (split on non-alphanumerics)
    const cleaned = operationId.replace(/[^a-zA-Z0-9]+/g, " ").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "operation";

    const toPascal = (tokens: string[]) =>
      tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join("");
    const toCamel = (tokens: string[]) => {
      const [first, ...rest] = tokens;
      return (
        first!.charAt(0).toLowerCase() +
        first!.slice(1) +
        rest.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join("")
      );
    };
    const toSnake = (tokens: string[]) =>
      tokens.map((t) => t.toLowerCase()).join("_");

    const convention = this.context.config.namingConvention || "camelCase";
    let name: string;
    switch (convention) {
      case "PascalCase":
        name = toPascal(parts);
        break;
      case "snake_case":
        name = toSnake(parts);
        break;
      case "camelCase":
      default:
        name = toCamel(parts);
        break;
    }

    // Ensure it starts with a valid character
    if (/^[0-9]/.test(name)) {
      name = "op" + name;
    }

    return name;
  }

  /**
   * Capitalize string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Extract type name from reference
   */
  private extractTypeNameFromRef(ref: string): string {
    const parts = ref.split("/");
    return parts[parts.length - 1] || "Unknown";
  }

  /**
   * Map schema type to TypeScript
   */
  private mapSchemaTypeToTypeScript(
    type: string | string[],
    format?: string
  ): string {
    const types = Array.isArray(type) ? type : [type];

    // Handle format-specific mappings
    if (format) {
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

      if (formatMappings[format]) {
        return formatMappings[format];
      }
    }

    // Handle basic type mappings
    const typeMappings: Record<string, string> = {
      string: "string",
      number: "number",
      integer: "number",
      boolean: "boolean",
      array: "unknown[]",
      object: "Record<string, unknown>",
      null: "null",
    };

    const mappedTypes = types.map((t) => typeMappings[t] || "unknown");

    if (mappedTypes.length === 1) {
      return mappedTypes[0]!;
    }

    return mappedTypes.join(" | ");
  }
}
