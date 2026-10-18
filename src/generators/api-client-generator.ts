/**
 * API client generator for OpenAPI specifications
 * Generates TypeScript API client classes with proper typing from OpenAPI schemas
 */

import {
  OpenAPISchema,
  OpenAPIPaths,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRef,
  OpenAPIRequestBody,
  OpenAPIResponses,
  OpenAPIResponse,
  OpenAPISchemaObject,
  OpenAPIPathItem,
} from "../types/openapi";
import {
  GenerationContext,
  GeneratedApiClient,
  GeneratedEndpoint,
  GeneratedParameter,
  GeneratedRequestBody,
  GeneratedResponse,
} from "../types/core";
import { schemaType, typeName, referenceName, projectSchema } from './schema-type';
import { ParserFactory } from '../parsers';
// Removed unused TypeGeneratorFactory import

/**
 * API client generator implementation
 */
export class ApiClientGenerator {
  private context: GenerationContext;
  private referencedTypes = new Set<string>();
  private typeAliases = new Map<string, string>();
  private clientName = '';
  private usesSerialization = false;
  private usesDeserialization = false;
  constructor(context: GenerationContext) {
    // Store context for access to config (namingConvention, etc.)
    this.context = context;
  }

  /**
   * Generate API client from OpenAPI schema
   */
  generate(context: GenerationContext): GeneratedApiClient {
    this.context = context;
    this.referencedTypes.clear();
    this.typeAliases.clear();
    this.usesSerialization = false;
    this.usesDeserialization = false;
    const schema = context.schema;
    const clientName = this.getClientName(schema);
    this.clientName = clientName;

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
  private resolveComponent<T>(value: T | OpenAPIRef): T {
    const visited = new Set<string>();
    while (value && typeof value === 'object' && '$ref' in value) {
      const ref = (value as OpenAPIRef).$ref;
      if (visited.has(ref)) throw new Error(`Circular component reference: ${ref}`);
      visited.add(ref);
      const resolved = this.context.schemaResolver(ref);
      if (!resolved) throw new Error(`Unresolved component reference: ${ref}`);
      value = resolved as T;
    }
    return value as T;
  }

  private mergeParameters(inherited: (OpenAPIParameter | OpenAPIRef)[], own: (OpenAPIParameter | OpenAPIRef)[]): OpenAPIParameter[] {
    const parameters = new Map<string, OpenAPIParameter>();
    for (const value of [...inherited, ...own]) {
      const parameter = this.resolveComponent<OpenAPIParameter>(value);
      parameters.set(`${parameter.in}:${parameter.name}`, parameter);
    }
    return [...parameters.values()];
  }

  private extractEndpoints(
    paths: OpenAPIPaths,
    context: GenerationContext
  ): GeneratedEndpoint[] {
    const endpoints: GeneratedEndpoint[] = [];
    const usedMethodNames = new Set(['request', 'buildPath', 'appendQuery', 'simpleHeader', 'toFormData', 'toUrlEncoded', 'setDefaultHeader', 'removeDefaultHeader', 'setAuthToken', 'clearAuthToken', 'baseUrl', 'config', 'constructor']);

    for (const [path, rawPathItem] of Object.entries(paths)) {
      if (!rawPathItem || typeof rawPathItem !== "object") {
        continue;
      }
      const pathItem = this.resolveComponent<OpenAPIPathItem>(rawPathItem);

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
            { ...operation, parameters: this.mergeParameters(pathItem.parameters || [], operation.parameters || []) },
            context
          );
          if (endpoint) {
            const baseName = endpoint.functionName;
            let suffix = 2;
            while (usedMethodNames.has(endpoint.functionName)) endpoint.functionName = `${baseName}${suffix++}`;
            usedMethodNames.add(endpoint.functionName);
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
    // Keep original Schema Objects for boundary conversion; declarations use application names.
    if (context.wireSchema) {
      const wireResolver = ParserFactory.autoCreateParser({ data: context.wireSchema }, context.config).createResolver(context.wireSchema);
      const directional = (value: OpenAPISchemaObject | OpenAPIRef, direction: 'request' | 'response', binary = false) => projectSchema(value, { direction, binary }, wireResolver, ref => {
        if (!/^#\/components\/schemas\/[^/]+$/.test(ref)) return ref;
        const projection = context.projections?.[referenceName(ref)];
        const target = binary ? projection?.binary || projection?.request : projection?.[direction];
        return target ? '#/components/schemas/' + encodeURIComponent(target.replace(/~/g, '~0').replace(/\//g, '~1')) : ref;
      });
      const resolve = <T>(input: T | OpenAPIRef): T => {
        const seen = new Set<string>();
        while (input && typeof input === 'object' && '$ref' in input) {
          const ref = (input as OpenAPIRef).$ref;
          if (seen.has(ref)) throw new Error(`Circular component reference: ${ref}`);
          seen.add(ref); input = wireResolver(ref) as T;
        }
        return input as T;
      };
      const item = resolve<OpenAPIPathItem>(context.wireSchema.paths[path]!);
      const wireOperation = item[method.toLowerCase() as 'get']!;
      const wireParameters = [...(item.parameters || []), ...(wireOperation.parameters || [])].map(value => resolve<OpenAPIParameter>(value));
      for (const parameter of parameters) {
        const wire = wireParameters.filter(value => value.name === parameter.name && value.in === parameter.location).pop();
        if (wire?.schema) parameter.schema = directional(wire.schema, 'request');
      }
      if (requestBody && wireOperation.requestBody) {
        const body = resolve<OpenAPIRequestBody>(wireOperation.requestBody);
        const bodySchema = body.content[requestBody.contentType!]?.schema;
        if (bodySchema) requestBody.schema = directional(bodySchema, 'request', this.mediaMode(requestBody.contentType!) === 'blob');
      }
      for (const response of responses) {
        const wire = resolve<OpenAPIResponse>(wireOperation.responses[response.statusCode]!);
        const responseSchema = wire.content?.[response.contentType!]?.schema;
        if (responseSchema) response.schema = directional(responseSchema, 'response');
      }
    }

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
    parameters: (OpenAPIParameter | OpenAPIRef)[],
    context: GenerationContext
  ): GeneratedParameter[] {
    const validParameters: GeneratedParameter[] = [];
    const usedNames = new Set(['body', 'options', 'url', 'headers', 'requestOptions', 'cookies', 'queryValue', 'serializeValue', 'deserializeValue', 'URL', 'Headers', 'FormData', 'JSON', 'String', 'Array', 'Blob', 'File']);

    for (const parameter of parameters) {
      const param = this.resolveComponent<OpenAPIParameter>(parameter);
      if (typeof param !== "object" || param === null) {
        continue;
      }
      const supportedStyles: Record<string, string[]> = { query: ['form', 'deepObject', 'spaceDelimited', 'pipeDelimited'], path: ['simple'], header: ['simple'], cookie: ['form'] };
      if (param.style && !supportedStyles[param.in]?.includes(param.style)) throw new Error(`Unsupported ${param.in} parameter style ${param.style}: ${param.name}`);
      if (param.content) throw new Error(`Content-encoded parameter ${param.name} is unsupported; use schema/style/explode parameters`);

      const type = this.extractParameterType(param.schema, context);
      const complex = (value: OpenAPISchemaObject | OpenAPIRef, seen = new Set<string>()): boolean => {
        if ('$ref' in value && typeof value.$ref === 'string') {
          if (seen.has(value.$ref)) return false;
          const target = context.schemaResolver(value.$ref);
          return target ? complex(target, new Set([...seen, value.$ref])) : false;
        }
        const object = value as OpenAPISchemaObject;
        return object.type === 'object' || object.type === 'array' || Array.isArray(object.type) && object.type.some(type => type === 'object' || type === 'array')
          || !!object.properties || object.additionalProperties !== undefined || [...(object.oneOf || []), ...(object.anyOf || []), ...(object.allOf || [])].some(branch => complex(branch, seen));
      };
      if (param.in === 'cookie' && param.schema && complex(param.schema)) throw new Error(`Complex cookie parameter ${param.name} is unsupported; use scalar cookies or explicit request headers`);
      const isRequired = param.in === 'path' || !!param.required;
      const baseName = this.convertToFunctionName(param.name);
      let variableName = baseName;
      let suffix = 2;
      while (usedNames.has(variableName)) variableName = `${baseName}${suffix++}`;
      usedNames.add(variableName);

      validParameters.push({
        name: param.name,
        variableName,
        ...(param.style !== undefined && { style: param.style }),
        ...(param.explode !== undefined && { explode: param.explode }),
        type,
        ...(param.schema && { schema: param.schema }),
        isOptional: !isRequired,
        isRequired,
        location: param.in,
        ...(param.description && { description: param.description }),
      });
    }

    return validParameters;
  }

  /**
   * Extract request body from operation
   */
  private extractRequestBody(
    requestBody: OpenAPIRequestBody | OpenAPIRef | undefined,
    context: GenerationContext
  ): GeneratedRequestBody | undefined {
    if (!requestBody || typeof requestBody !== "object") {
      return undefined;
    }

    // Resolve the Request Body Object, then inspect its content and required flag.
    if ("$ref" in requestBody) {
      return this.extractRequestBody(this.resolveComponent<OpenAPIRequestBody>(requestBody), context);
    }

    // Handle inline request body
    if ("content" in requestBody && requestBody.content) {
      const contentType = requestBody.content['application/json'] ? 'application/json' : Object.keys(requestBody.content)[0];
      if (!contentType) return undefined;
      const mediaType = requestBody.content[contentType];
      if (mediaType?.encoding && Object.keys(mediaType.encoding).length) throw new Error(`Per-property request encoding is unsupported for ${contentType}; supply encoded request data through an explicit transport adapter`);

      if (mediaType) {
        const binary = this.mediaMode(contentType) === 'blob';
        if (contentType.includes('*')) throw new Error(`Wildcard request media ${contentType} is unsupported; declare a concrete request media type`);
        const type = mediaType.schema ? this.extractSchemaType(mediaType.schema, context, 'request', binary)
          : this.mediaMode(contentType) === 'json' ? 'unknown' : this.mediaMode(contentType) === 'text' && contentType !== 'application/x-www-form-urlencoded' ? 'string'
            : /^(?:multipart\/form-data|application\/x-www-form-urlencoded)$/i.test(contentType) ? 'Record<string, unknown>' : "NonNullable<RequestInit['body']>";
        const body: GeneratedRequestBody = {
          type,
          isOptional: !requestBody.required,
          ...(mediaType.schema && { schema: mediaType.schema }),
          ...(requestBody.description && {
            description: requestBody.description,
          }),
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
    responses: OpenAPIResponses,
    context: GenerationContext
  ): GeneratedResponse[] {
    const responseList: GeneratedResponse[] = [];

    for (const [statusCode, response] of Object.entries(responses)) {
      if (typeof response !== "object" || response === null) {
        continue;
      }

      const responseObj = this.resolveComponent<OpenAPIResponse>(response);

      // Handle inline response
      if ("content" in responseObj && responseObj.content) {
        const media = Object.entries(responseObj.content);
        if (!media.length) {
          // Response without content type
          responseList.push({
            statusCode,
            type: "void",
            isOptional: false,
            description: responseObj.description || "",
          });
          continue;
        }
        for (const [contentType, mediaType] of media) {
          const mode = this.mediaMode(contentType);
          const type = contentType.includes('*') ? 'unknown' : mode === 'text' ? 'string' : mode === 'blob' ? 'globalThis.Blob' : mediaType.schema ? this.extractSchemaType(mediaType.schema, context, 'response', false, this.isReturnStatus(statusCode)) : 'unknown';
          responseList.push({
            statusCode,
            type,
            contentType,
            isOptional: false,
            description: responseObj.description || "",
            ...(mediaType.schema && { schema: mediaType.schema }),
          });
        }
      } else {
        // Response without content
        responseList.push({
          statusCode,
          type: "void",
          isOptional: false,
          description: responseObj.description || "",
        });
      }
    }

    return responseList;
  }

  private isReturnStatus(statusCode: string): boolean {
    return /^2(?:\d{2}|XX)$/i.test(statusCode) || statusCode === 'default';
  }

  /**
   * Determine return type from responses
   */
  private determineReturnType(responses: GeneratedResponse[]): string {
    // Non-success responses are thrown as ApiClientError by the runtime.
    responses = responses.filter(response => this.isReturnStatus(response.statusCode));
    if (responses.length === 0) {
      return "void";
    }

    if (responses.length === 1) {
      return responses[0]!.type;
    }

    // Multiple responses - create union type
    const types = [...new Set(responses.map((r) => r.type))];
    return types.join(" | ");
  }

  /**
   * Extract parameter type from schema
   */
  private extractParameterType(
    schema: OpenAPISchemaObject | OpenAPIRef | undefined,
    context: GenerationContext
  ): string {
    if (!schema) {
      return "unknown";
    }

    return this.extractSchemaType(schema, context, 'request');
  }

  /**
   * Extract schema type
   */
  private extractSchemaType(schema: OpenAPISchemaObject | OpenAPIRef, context: GenerationContext, direction?: 'request' | 'response', binary = false, importReferences = true): string {
    return schemaType(schema, ref => {
      const original = referenceName(ref);
      const projection = context.projections?.[original];
      const target = binary ? projection?.binary || projection?.request || original : direction ? projection?.[direction] || original : original;
      const name = typeName(target, context.config.typePrefix, context.config.typeSuffix);
      // Error response metadata is retained, but only emitted signatures need type imports.
      if (importReferences) this.referencedTypes.add(name);
      const globals = new Set(['Blob', 'File', 'FormData', 'Headers', 'URL', 'URLSearchParams', 'Response', 'RequestInit', 'BodyInit', 'AbortController', 'Error', 'ApiClientConfig', 'ApiClientError', this.clientName]);
      let alias = this.typeAliases.get(name) || name;
      if (globals.has(name) && !this.typeAliases.has(name)) {
        const occupied = new Set([...Object.keys(context.schema.components?.schemas || {}).map(value => typeName(value, context.config.typePrefix, context.config.typeSuffix)), ...this.typeAliases.values()]);
        const base = 'Schema' + name; alias = base; let index = 2;
        while (occupied.has(alias)) alias = base + index++;
      }
      this.typeAliases.set(name, alias);
      return alias;
    }, context.config.customTypeMappings, context.schemaResolver, undefined, { ...(direction && { direction }), binary });
  }

  private mediaMode(contentType: string): 'json' | 'text' | 'blob' {
    const media = contentType.toLowerCase();
    return /(?:\/json|\+json)(?:;|$)/.test(media) ? 'json' : media.startsWith('text/') || /(?:\/xml|\+xml)(?:;|$)/.test(media) || media === 'application/x-www-form-urlencoded' ? 'text' : 'blob';
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
    content += `  public readonly baseUrl: string;\n`;
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
    content += this.generateUtilityMethods(endpoints);

    content += "}\n";

    return content;
  }

  /**
   * Generate configuration interface
   */
  private generateConfigInterface(): string {
    return `export interface ApiClientConfig {
  /** Defaults to window.location.origin in browsers. Required in non-browser runtimes. */
  baseUrl?: string;
  timeout?: number;
  headers?: RequestInit['headers'];
  retries?: number;
  retryDelay?: number;
}`;
  }

  /**
   * Generate error class
   */
  private generateErrorClass(): string {
    return `export class ApiClientError extends globalThis.Error {
  public status?: number | undefined;
  public response?: Response | undefined;
  public body?: unknown;
  public detail?: unknown;

  constructor(
    message: string,
    status?: number,
    response?: Response,
    body?: unknown
  ) {
    super(message);
    this.status = status;
    this.response = response;
    this.body = body;
    this.detail = body !== null && typeof body === 'object' && 'detail' in body ? (body as { detail?: unknown }).detail : undefined;
    this.name = 'ApiClientError';
  }
}`;
  }

  /**
   * Generate constructor
   */
  private generateConstructor(): string {
    return `  constructor(config: ApiClientConfig = {}) {
    const browserOrigin = (globalThis as typeof globalThis & { window?: { location?: { origin?: string } } }).window?.location?.origin;
    const configuredBaseUrl = config.baseUrl ?? browserOrigin;
    if (!configuredBaseUrl) throw new Error('ApiClientConfig.baseUrl is required outside a browser runtime');
    this.baseUrl = new URL(configuredBaseUrl, browserOrigin).toString().replace(/\\/$/, '');
    this.config = {
      timeout: 15000,
      retries: 1,
      retryDelay: 250,
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
    const parameters = ['path', 'query', 'header', 'cookie'].flatMap(location => endpoint.parameters.filter(p => p.location === location))
      .map(p => ({ name: p.variableName || p.name, type: p.type, optional: p.isOptional }));
    if (endpoint.requestBody) {
      const body = endpoint.requestBody;
      parameters.push({ name: 'body', type: /^multipart\/form-data/i.test(body.contentType || '') ? body.type + ' | globalThis.FormData' : body.type, optional: body.isOptional });
    }
    const declarations = parameters.map((p, i) => {
      const requiredFollows = parameters.slice(i + 1).some(next => !next.optional);
      return p.name + (p.optional && !requiredFollows ? '?' : '') + ': ' + p.type + (p.optional && requiredFollows ? ' | undefined' : '');
    });
    return [...declarations, 'options?: RequestInit'].join(', ');
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
    const entries = endpoint.parameters.filter(p => p.location === 'path').map(p => JSON.stringify(p.name) + ': ' + this.serializeExpression(p.variableName || p.name, p.schema));
    const metadata = Object.fromEntries(endpoint.parameters.filter(parameter => parameter.location === 'path').map(parameter => [parameter.name, { explode: parameter.explode ?? false }]));
    let output = '    const url = new URL(this.baseUrl + this.buildPath(' + JSON.stringify(endpoint.path) + ', { ' + entries.join(', ') + ' }, ' + JSON.stringify(metadata) + '));\n';
    for (const p of endpoint.parameters.filter(p => p.location === 'query')) {
      const variable = p.variableName || p.name;
      const key = JSON.stringify(p.name);
      output += '    if (' + variable + ' !== undefined) {\n';
      output += '      this.appendQuery(url.searchParams, ' + key + ', ' + this.serializeExpression(variable, p.schema) + ', ' + JSON.stringify(p.style || 'form') + ', ' + String(p.explode ?? (p.style === undefined || p.style === 'form' || p.style === 'deepObject')) + ');\n';
      output += '    }\n';
    }
    return output;
  }

  /**
   * Generate request options
   */
  private generateRequestOptions(endpoint: GeneratedEndpoint): string {
    let output = '    const headers = new Headers(this.config.headers);\n';
    const contentType = endpoint.requestBody?.contentType || '';
    const json = /(?:application\/json|\+json)/i.test(contentType);
    const multipart = /^multipart\/form-data/i.test(contentType);
    if (endpoint.requestBody && !multipart && contentType) output += '    headers.set("Content-Type", ' + JSON.stringify(contentType) + ');\n';
    for (const p of endpoint.parameters.filter(p => p.location === 'header')) {
      const variable = p.variableName || p.name;
      output += '    if (' + variable + ' !== undefined) headers.set(' + JSON.stringify(p.name) + ', this.simpleHeader(' + this.serializeExpression(variable, p.schema) + ', ' + String(p.explode ?? false) + '));\n';
    }
    const cookies = endpoint.parameters.filter(p => p.location === 'cookie');
    if (cookies.length) {
      output += '    const cookies: string[] = [];\n';
      for (const p of cookies) { const variable=p.variableName||p.name; output += '    if ('+variable+' !== undefined) cookies.push('+JSON.stringify(p.name+'=')+' + encodeURIComponent(String('+variable+')));\n'; }
      output += '    if (cookies.length) headers.set("Cookie", [headers.get("Cookie"), ...cookies].filter(Boolean).join("; "));\n';
    }
    output += '    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));\n';
    output += '    const requestOptions: RequestInit = {\n      ...options,\n      method: '+JSON.stringify(endpoint.method)+',\n      headers,\n';
    if (endpoint.requestBody) {
      const value = json || multipart || contentType === 'application/x-www-form-urlencoded' ? this.serializeExpression('body', endpoint.requestBody.schema) : 'body';
      const expression = json ? 'JSON.stringify(' + value + ')' : multipart ? '(body instanceof globalThis.FormData ? body : this.toFormData(' + value + '))' : contentType === 'application/x-www-form-urlencoded' ? 'this.toUrlEncoded(' + value + ')' : "body as NonNullable<RequestInit['body']>";
      output += '      ...(body !== undefined ? { body: '+expression+' } : {}),\n';
    }
    return output + '    };\n';
  }

  /**
   * Generate fetch call
   */
  private generateFetchCall(_endpoint: GeneratedEndpoint): string {
    // Delegate to typed request<T> with retry
    return "";
  }

  /**
   * Generate response handling
   */
  private generateResponseHandling(endpoint: GeneratedEndpoint): string {
    const metadata = endpoint.responses.map(response => ({ status: response.statusCode,
      ...(response.contentType && { contentType: response.contentType }), ...(response.schema && { schema: response.schema }), mode: response.type === 'void' ? 'empty' : this.mediaMode(response.contentType || 'application/json') }));
    return `    return this.request<${endpoint.returnType}>(url.toString(), requestOptions, ${JSON.stringify(metadata)});\n`;
  }

  /**
   * Generate utility methods
   */
  private generateUtilityMethods(endpoints: GeneratedEndpoint[]): string {
    this.usesDeserialization = this.context.config.propertyNaming === 'camelCase' && endpoints.length > 0;
    const headerHelper = endpoints.some(endpoint => endpoint.parameters.some(parameter => parameter.location === 'header')) ? `  private simpleHeader(value: unknown, explode: boolean): string {
    const scalar = (item: unknown): string => {
      if (item !== null && typeof item === 'object') throw new Error('Nested header parameter values are unsupported');
      return String(item);
    };
    if (Array.isArray(value)) return value.map(scalar).join(',');
    if (value !== null && typeof value === 'object') return Object.entries(value).filter(([, item]) => item !== undefined)
      .map(([key, item]) => key + (explode ? '=' : ',') + scalar(item)).join(',');
    return scalar(value);
  }` : '';
    const pathHelper = endpoints.length ? `  private buildPath(template: string, params: Record<string, unknown>, metadata: Record<string, { explode?: boolean }> = {}): string {
    return template.replace(/\\{([^}]+)\\}/g, (_match, key: string) => {
      const value = params[key];
      if (value === undefined) throw new Error('Missing required path parameter: ' + key);
      if (Array.isArray(value)) return value.map(item => encodeURIComponent(String(item))).join(',');
      if (value !== null && typeof value === 'object') return Object.entries(value).map(([name, item]) =>
        encodeURIComponent(name) + (metadata[key]?.explode ? '=' : ',') + encodeURIComponent(String(item))).join(',');
      return encodeURIComponent(String(value));
    });
  }` : '';
    const queryHelper = endpoints.some(endpoint => endpoint.parameters.some(parameter => parameter.location === 'query')) ? `  private appendQuery(params: URLSearchParams, name: string, value: unknown, style = 'form', explode = true): void {
    const scalar = (item: unknown): string => {
      if (item !== null && typeof item === 'object') throw new Error('Nested query values require an explicit supported encoding: ' + name);
      return String(item);
    };
    if (Array.isArray(value)) {
      if (style === 'deepObject') throw new Error('deepObject requires an object: ' + name);
      if (style === 'spaceDelimited' || style === 'pipeDelimited' || !explode) params.append(name, value.map(scalar).join(style === 'spaceDelimited' ? ' ' : style === 'pipeDelimited' ? '|' : ','));
      else for (const item of value) params.append(name, scalar(item));
    } else if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value).filter(([, item]) => item !== undefined);
      if (style === 'deepObject') for (const [key, item] of entries) params.append(name + '[' + key + ']', scalar(item));
      else if (style !== 'form') throw new Error('Unsupported object query style: ' + style);
      else if (explode) for (const [key, item] of entries) params.append(key, scalar(item));
      else params.append(name, entries.flatMap(([key, item]) => [key, scalar(item)]).join(','));
    } else params.append(name, scalar(value));
  }` : '';
    const encodedHelper = endpoints.some(endpoint => endpoint.requestBody?.contentType === 'application/x-www-form-urlencoded') ? `  private toUrlEncoded(input: unknown): URLSearchParams {
    const form = new URLSearchParams();
    if (input && typeof input === 'object') for (const [key, value] of Object.entries(input)) {
      if (value === undefined || value === null) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item !== null && typeof item === 'object') throw new Error('Nested URL-encoded form values are unsupported: ' + key);
        form.append(key, String(item));
      }
    }
    return form;
  }` : '';
    const multipartHelper = endpoints.some(endpoint => /^multipart\/form-data/i.test(endpoint.requestBody?.contentType || '')) ? `  private toFormData(input: unknown): globalThis.FormData {
    const form = new globalThis.FormData();
    if (input && typeof input === 'object') for (const [key, value] of Object.entries(input)) {
      if (value === undefined || value === null) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item instanceof globalThis.Blob) form.append(key, item);
        else if (typeof item === 'object') form.append(key, new globalThis.Blob([JSON.stringify(item)], { type: 'application/json' }));
        else form.append(key, String(item));
      }
    }
    return form;
  }` : '';
    const requestHelper = endpoints.length ? `  private async request<T>(url: string, options: RequestInit, responses: Array<{ status: string; contentType?: string; schema?: unknown; mode: 'json' | 'text' | 'blob' | 'empty' }>): Promise<T> {
    const retries = this.config.retries ?? 0;
    const delayMs = this.config.retryDelay ?? 0;
    const canRetry = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(options.method || 'GET');
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timeout = this.config.timeout ?? 0;
      const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;
      const onAbort = () => controller.abort();
      if (options.signal?.aborted) controller.abort();
      else options.signal?.addEventListener('abort', onAbort, { once: true });
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) {
          let errorBody: unknown;
          try {
            const text = await response.clone().text();
            if (text) {
              const contentType = response.headers.get('Content-Type') || '';
              if (/(?:\\/json|\\+json)(?:;|$)/i.test(contentType)) {
                try { errorBody = JSON.parse(text); } catch { errorBody = text; }
              } else errorBody = text;
            }
          } catch { /* Keep the HTTP error even when the body cannot be read. */ }
          throw new ApiClientError('Request failed: ' + response.status + ' ' + response.statusText, response.status, response, errorBody);
        }
        if (response.status === 204 || response.status === 205 || options.method === 'HEAD') return undefined as T;
        let candidates = responses.filter(item => item.status === String(response.status));
        if (!candidates.length) candidates = responses.filter(item => item.status.toUpperCase() === Math.floor(response.status / 100) + 'XX');
        if (!candidates.length) candidates = responses.filter(item => item.status === 'default');
        const contentType = (response.headers.get('Content-Type') || '').split(';')[0]!.trim().toLowerCase();
        const declared = candidates.find(item => item.contentType?.toLowerCase() === contentType) || candidates[0];
        if (declared?.mode === 'empty') return undefined as T;
        const mode = contentType ? /(?:\\/json|\\+json)$/.test(contentType) ? 'json' : contentType.startsWith('text/') || /(?:\\/xml|\\+xml)$/.test(contentType) || contentType === 'application/x-www-form-urlencoded' ? 'text' : 'blob' : declared?.mode || 'json';
        if (mode === 'json') return ${this.usesDeserialization ? 'deserializeValue(await response.json(), declared?.schema)' : 'await response.json()'} as T;
        if (mode === 'text') return await response.text() as T;
        return await response.blob() as T;
      } catch (error) {
        const status = error instanceof ApiClientError ? error.status : undefined;
        const transient = status === undefined || status === 408 || status === 429 || (status !== undefined && status >= 500);
        if (!canRetry || !transient || attempt >= retries || options.signal?.aborted || controller.signal.aborted || error instanceof SyntaxError) throw error;
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
      }
      if (delayMs > 0) await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); reject(options.signal?.reason || new Error('Request aborted')); };
        const timer = setTimeout(() => { options.signal?.removeEventListener('abort', abort); resolve(); }, delayMs);
        if (options.signal?.aborted) abort(); else options.signal?.addEventListener('abort', abort, { once: true });
      });
    }
  }` : '';
    const authHelpers = `  public setDefaultHeader(name: string, value: string): void {
    const headers = new globalThis.Headers(this.config.headers); headers.set(name, value); this.config.headers = headers;
  }
  public removeDefaultHeader(name: string): void {
    const headers = new globalThis.Headers(this.config.headers); headers.delete(name); this.config.headers = headers;
  }
  public setAuthToken(token: string): void { this.setDefaultHeader('Authorization', 'Bearer ' + token); }
  public clearAuthToken(): void { this.removeDefaultHeader('Authorization'); }`;
    return [pathHelper, queryHelper, headerHelper, encodedHelper, multipartHelper, requestHelper, authHelpers].filter(Boolean).join('\n\n') + '\n';
  }

  /**
   * Generate imports
   */
  private generateImports(endpoints: GeneratedEndpoint[]): string {
    const imports: string[] = [];
    const converters = [...(this.usesSerialization ? ['serializeValue'] : []), ...(this.usesDeserialization ? ['deserializeValue'] : [])];
    if (converters.length) imports.push(`import { ${converters.join(', ')} } from './conversion.js';`);

    // Add type imports. Endpoint types are already formatted; don't re-apply prefix/suffix.
    const typeNames = this.getTypeNamesFromEndpoints(endpoints);
    if (typeNames.length > 0) {
      imports.push(`import type { ${typeNames.map(name => this.typeAliases.get(name) && this.typeAliases.get(name) !== name ? name + ' as ' + this.typeAliases.get(name) : name).join(", ")} } from './types.js';`);
    }

    return imports.length > 0 ? imports.join("\n") + "\n\n" : "";
  }

  private serializeExpression(value: string, schema?: OpenAPISchemaObject | OpenAPIRef): string {
    if (this.context.config.propertyNaming !== 'camelCase' || !schema) return value;
    this.usesSerialization = true;
    return `serializeValue(${value}, ${JSON.stringify(schema)})`;
  }

  /**
   * Get type names from endpoints
   */
  private getTypeNamesFromEndpoints(_endpoints: GeneratedEndpoint[]): string[] {
    return [...this.referencedTypes];
  }

  /**
   * Get dependencies from endpoints
   */
  private getDependencies(endpoints: GeneratedEndpoint[]): string[] {
    return this.getTypeNamesFromEndpoints(endpoints);
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
      return typeName((pascal || "") + "ApiClient");
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
    const tokens = path.split("/").filter(Boolean);
    const nonParamSegments = tokens.filter((t) => !t.startsWith("{"));
    const hasPathParams = tokens.some((t) => t.startsWith("{"));
    const resource = nonParamSegments.length
      ? nonParamSegments[nonParamSegments.length - 1]!
      : path.replace(/[^a-zA-Z0-9]/g, "");

    const singular = (name: string) => {
      if (/ies$/i.test(name)) return name.replace(/ies$/i, "y");
      if (/ses$/i.test(name)) return name.replace(/es$/i, "");
      if (/s$/i.test(name)) return name.replace(/s$/i, "");
      return name;
    };

    const lowerMethod = method.toLowerCase();
    let opVerb = lowerMethod;

    switch (lowerMethod) {
      case "get":
        opVerb = hasPathParams ? "get" : "list";
        return `${opVerb}${this.capitalize(
          hasPathParams ? singular(resource) : resource
        )}`;
      case "post":
        opVerb = "create";
        return `${opVerb}${this.capitalize(singular(resource))}`;
      case "put":
      case "patch":
        opVerb = "update";
        return `${opVerb}${this.capitalize(singular(resource))}`;
      case "delete":
        opVerb = "delete";
        return `${opVerb}${this.capitalize(singular(resource))}`;
      default:
        return `${lowerMethod}${nonParamSegments
          .map((part) => this.capitalize(part))
          .join("")}`;
    }
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

    const reserved = new Set(['class', 'default', 'delete', 'new', 'function', 'var', 'let', 'const', 'return', 'switch', 'case', 'this', 'super', 'import', 'export', 'await', 'yield', 'constructor', 'break', 'catch', 'continue', 'debugger', 'do', 'else', 'enum', 'extends', 'finally', 'for', 'if', 'in', 'instanceof', 'throw', 'try', 'typeof', 'void', 'while', 'with', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static', 'true', 'false', 'null', 'eval', 'arguments']);
    return reserved.has(name) ? `${name}Operation` : name;
  }

  /**
   * Capitalize string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

}
