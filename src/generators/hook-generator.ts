/**
 * React hooks generator for OpenAPI endpoints
 * Generates lightweight hooks without external deps (uses React useState/useEffect/useCallback)
 */

import {
  OpenAPISchema,
  OpenAPIPaths,
  OpenAPIOperation,
} from "../types/openapi";
import {
  GenerationContext,
  GeneratedEndpoint,
  GeneratedParameter,
  GeneratedRequestBody,
  GeneratedResponse,
} from "../types/core";

export interface GeneratedHooksFile {
  name: string; // e.g., ApiHooks
  content: string;
  exports: string[]; // exported values, e.g., ["createApiHooks"]
  endpoints: GeneratedEndpoint[];
}

export class HookGenerator {
  constructor(private context: GenerationContext) {}

  generate(): GeneratedHooksFile {
    const schema = this.context.schema;
    const clientName = this.getClientName(schema);
    const endpoints = this.extractEndpoints(schema.paths);

    const imports = this.generateImports(endpoints, clientName);
    const body = this.generateHooksBody(clientName, endpoints);
    const content = imports + body;

    return {
      name: "ApiHooks",
      content,
      exports: ["createApiHooks"],
      endpoints,
    };
  }

  private extractEndpoints(paths: OpenAPIPaths): GeneratedEndpoint[] {
    const endpoints: GeneratedEndpoint[] = [];
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

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== "object") continue;
      for (const method of operations) {
        const operation = (pathItem as any)[method] as
          | OpenAPIOperation
          | undefined;
        if (!operation) continue;
        const endpoint = this.extractEndpoint(
          path,
          method.toUpperCase(),
          operation
        );
        if (endpoint) endpoints.push(endpoint);
      }
    }
    return endpoints;
  }

  private extractEndpoint(
    path: string,
    method: string,
    operation: OpenAPIOperation
  ): GeneratedEndpoint | undefined {
    const operationId =
      operation.operationId ||
      this.generateOperationId(path, method, operation);
    const functionName = this.convertToFunctionName(operationId);

    const parameters = this.extractParameters(operation.parameters || []);
    const requestBody = this.extractRequestBody(operation.requestBody);
    const responses = this.extractResponses(operation.responses);
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

    if (requestBody) endpoint.requestBody = requestBody;
    return endpoint;
  }

  private extractParameters(parameters: any[]): GeneratedParameter[] {
    const out: GeneratedParameter[] = [];
    for (const param of parameters) {
      if (!param || typeof param !== "object") continue;
      const type = this.extractSchemaType(param.schema);
      const isRequired = !!param.required;
      out.push({
        name: param.name,
        type,
        isOptional: !isRequired,
        isRequired,
        location: param.in,
        description: param.description,
      });
    }
    return out;
  }

  private extractRequestBody(
    requestBody: any
  ): GeneratedRequestBody | undefined {
    if (!requestBody || typeof requestBody !== "object") return undefined;

    if (requestBody.$ref) {
      const resolved = this.context.schemaResolver(requestBody.$ref);
      if (resolved) {
        return {
          type: this.extractSchemaType(resolved),
          isOptional: !requestBody.required,
          description: requestBody.description,
        };
      }
    }

    if (requestBody.content) {
      const ct = Object.keys(requestBody.content)[0];
      if (!ct) return undefined;
      const media = requestBody.content[ct];
      if (media?.schema) {
        return {
          type: this.extractSchemaType(media.schema),
          isOptional: !requestBody.required,
          contentType: ct,
          description: requestBody.description,
        };
      }
    }
    return undefined;
  }

  private extractResponses(responses: any): GeneratedResponse[] {
    const out: GeneratedResponse[] = [];
    for (const [statusCode, response] of Object.entries(responses)) {
      if (!response || typeof response !== "object") continue;
      const r: any = response;
      if (r.$ref) {
        const resolved = this.context.schemaResolver(r.$ref);
        if (resolved) {
          out.push({
            statusCode,
            type: this.extractSchemaType(resolved),
            isOptional: false,
            description: r.description,
          });
        }
        continue;
      }
      if (r.content) {
        const ct = Object.keys(r.content)[0];
        if (!ct) {
          out.push({
            statusCode,
            type: "void",
            isOptional: false,
            description: r.description,
          });
          continue;
        }
        const media = r.content[ct];
        if (media?.schema) {
          out.push({
            statusCode,
            type: this.extractSchemaType(media.schema),
            isOptional: false,
            description: r.description,
          });
        }
      } else {
        out.push({
          statusCode,
          type: "void",
          isOptional: false,
          description: r.description,
        });
      }
    }
    return out;
  }

  private determineReturnType(responses: GeneratedResponse[]): string {
    if (responses.length === 0) return "void";
    if (responses.length === 1) return responses[0]!.type;
    return responses.map((r) => r.type).join(" | ");
  }

  private extractSchemaType(schema: any): string {
    if (schema?.$ref) {
      const name = this.extractTypeNameFromRef(schema.$ref);
      return this.formatTypeName(name);
    }
    if (schema?.type)
      return this.mapSchemaTypeToTypeScript(schema.type, schema.format);
    if (schema?.enum)
      return schema.enum.map((v: any) => JSON.stringify(v)).join(" | ");
    if (schema?.const !== undefined) return JSON.stringify(schema.const);
    return "unknown";
  }

  private generateImports(
    endpoints: GeneratedEndpoint[],
    clientName: string
  ): string {
    const typeNames = new Set<string>();
    for (const ep of endpoints) {
      this.extractTypeNamesFromType(ep.returnType).forEach((n) =>
        typeNames.add(n)
      );
      if (ep.requestBody)
        this.extractTypeNamesFromType(ep.requestBody.type).forEach((n) =>
          typeNames.add(n)
        );
      for (const p of ep.parameters)
        this.extractTypeNamesFromType(p.type).forEach((n) => typeNames.add(n));
    }
    const typesImport =
      typeNames.size > 0
        ? `import { ${Array.from(typeNames).join(", ")} } from './types';\n`
        : "";
    const reactImport = `import { useCallback, useEffect, useMemo, useRef, useState } from 'react';\n`;
    const clientImport = `import { ${clientName} } from './api-client';\n\n`;
    return typesImport + reactImport + clientImport;
  }

  private generateHooksBody(
    clientName: string,
    endpoints: GeneratedEndpoint[]
  ): string {
    let out = "";
    out += `export function createApiHooks(client: ${clientName}) {\n`;
    // Generate per-endpoint hooks
    for (const ep of endpoints) {
      const isQuery = ep.method === "GET";
      const hookName = isQuery
        ? `use${this.capitalize(ep.functionName)}Query`
        : `use${this.capitalize(ep.functionName)}Mutation`;
      if (isQuery) {
        out += this.generateQueryHook(hookName, ep);
      } else {
        out += this.generateMutationHook(hookName, ep);
      }
    }
    // Return all hook functions
    const names = endpoints.map((ep) =>
      ep.method === "GET"
        ? `use${this.capitalize(ep.functionName)}Query`
        : `use${this.capitalize(ep.functionName)}Mutation`
    );
    out += `  return { ${names.join(", ")} };\n`;
    out += `}\n`;
    return out;
  }

  private generateQueryHook(hookName: string, ep: GeneratedEndpoint): string {
    const pathParams = ep.parameters.filter((p) => p.location === "path");
    const queryParams = ep.parameters.filter((p) => p.location === "query");
    const argsTypeParts: string[] = [];
    if (pathParams.length > 0)
      argsTypeParts.push(
        `path: { ${pathParams
          .map((p) => `${p.name}${p.isOptional ? "?" : ""}: ${p.type}`)
          .join("; ")} }`
      );
    if (queryParams.length > 0) {
      // Make the query object optional only if ALL query params are optional
      const queryObjectOptional = queryParams.every((p) => p.isOptional);
      argsTypeParts.push(
        `query${queryObjectOptional ? "?" : ""}: { ${queryParams
          .map((p) => `${p.name}${p.isOptional ? "?" : ""}: ${p.type}`)
          .join("; ")} }`
      );
    }
    const argsType =
      argsTypeParts.length > 0 ? `{ ${argsTypeParts.join("; ")} }` : "void";
    const retType = ep.returnType;

    // Build client call argument list to match API client method signature:
    // Sort parameters: required first, then optional (to match API client parameter ordering)
    const orderedArgs: string[] = [];

    // Collect all parameters first
    const allParameters: {
      name: string;
      expression: string;
      isOptional: boolean;
    }[] = [];

    // Add path parameters (always required)
    for (const p of pathParams) {
      allParameters.push({
        name: p.name,
        expression: `args!.path.${p.name}`,
        isOptional: false,
      });
    }

    // Add query parameters
    const queryObjectOptional = queryParams.every((q) => q.isOptional);
    const qPrefix = queryObjectOptional ? "args?.query?." : "args!.query.";
    for (const p of queryParams) {
      allParameters.push({
        name: p.name,
        expression: `${qPrefix}${p.name}`,
        isOptional: p.isOptional,
      });
    }

    // Add body parameter if exists
    if (ep.method.toLowerCase() !== "get" && ep.requestBody) {
      const bodyPrefix = ep.requestBody.isOptional
        ? "args?.body"
        : "args!.body";
      allParameters.push({
        name: "body",
        expression: bodyPrefix,
        isOptional: ep.requestBody.isOptional,
      });
    }

    // Sort parameters: required first, then optional (to match API client)
    allParameters.sort((a, b) => {
      if (a.isOptional === b.isOptional) return 0;
      return a.isOptional ? 1 : -1; // Required (false) comes before optional (true)
    });

    // Extract expressions in sorted order
    orderedArgs.push(...allParameters.map((p) => p.expression));

    // Always add options parameter last
    orderedArgs.push("requestInit");

    let code = "";
    code += `  function ${hookName}(args${argsType === "void" ? "?" : ""}: ${
      argsType === "void" ? "void | undefined" : argsType
    }, requestInit?: RequestInit) {\n`;
    code += `    const [data, setData] = useState<${retType} | undefined>(undefined);\n`;
    code += `    const [error, setError] = useState<unknown>(undefined);\n`;
    code += `    const [loading, setLoading] = useState(false);\n`;
    code += `    const argsRef = useRef(args);\n`;
    code += `    useEffect(() => { argsRef.current = args; }, [args]);\n`;
    code += `    const fetcher = useCallback(async () => {\n`;
    code += `      setLoading(true); setError(undefined);\n`;
    code += `      try {\n`;
    code += `        const result = await client.${
      ep.functionName
    }(${orderedArgs.join(", ")});\n`;
    code += `        setData(result as ${retType});\n`;
    code += `      } catch (e) { setError(e); } finally { setLoading(false); }\n`;
    code += `    }, [client, args, requestInit]);\n`;
    code += `    useEffect(() => { void fetcher(); }, [fetcher]);\n`;
    code += `    return { data, error, loading, refetch: fetcher };\n`;
    code += `  }\n`;
    return code;
  }

  private generateMutationHook(
    hookName: string,
    ep: GeneratedEndpoint
  ): string {
    const pathParams = ep.parameters.filter((p) => p.location === "path");
    const queryParams = ep.parameters.filter((p) => p.location === "query");
    const hasBody = !!ep.requestBody;
    const retType = ep.returnType === "void" ? "void" : ep.returnType;

    const payloadParts: string[] = [];
    if (pathParams.length > 0)
      payloadParts.push(
        `path: { ${pathParams
          .map((p) => `${p.name}${p.isOptional ? "?" : ""}: ${p.type}`)
          .join("; ")} }`
      );
    if (queryParams.length > 0) {
      // Make the query object optional only if ALL query params are optional
      const queryObjectOptional = queryParams.every((p) => p.isOptional);
      payloadParts.push(
        `query${queryObjectOptional ? "?" : ""}: { ${queryParams
          .map((p) => `${p.name}${p.isOptional ? "?" : ""}: ${p.type}`)
          .join("; ")} }`
      );
    }
    if (hasBody)
      payloadParts.push(
        `body${ep.requestBody!.isOptional ? "?" : ""}: ${ep.requestBody!.type}`
      );
    const payloadType =
      payloadParts.length > 0 ? `{ ${payloadParts.join("; ")} }` : "void";

    // Build client call argument list to match API client method signature:
    // Sort parameters: required first, then optional (to match API client parameter ordering)
    const orderedArgs: string[] = [];

    // Collect all parameters first
    const allParameters: {
      name: string;
      expression: string;
      isOptional: boolean;
    }[] = [];

    // Add path parameters (always required)
    for (const p of pathParams) {
      allParameters.push({
        name: p.name,
        expression: `payload!.path.${p.name}`,
        isOptional: false,
      });
    }

    // Add query parameters
    const q2ObjectOptional = queryParams.every((q) => q.isOptional);
    const q2Prefix = q2ObjectOptional ? "payload?.query?." : "payload!.query.";
    for (const p of queryParams) {
      allParameters.push({
        name: p.name,
        expression: `${q2Prefix}${p.name}`,
        isOptional: p.isOptional,
      });
    }

    // Add body parameter if exists
    if (hasBody && ep.requestBody) {
      const bodyPrefix = ep.requestBody.isOptional
        ? "payload?.body"
        : "payload!.body";
      allParameters.push({
        name: "body",
        expression: bodyPrefix,
        isOptional: ep.requestBody.isOptional,
      });
    }

    // Sort parameters: required first, then optional (to match API client)
    allParameters.sort((a, b) => {
      if (a.isOptional === b.isOptional) return 0;
      return a.isOptional ? 1 : -1; // Required (false) comes before optional (true)
    });

    // Extract expressions in sorted order
    orderedArgs.push(...allParameters.map((p) => p.expression));

    // Always add options parameter last
    orderedArgs.push("requestInit");

    let code = "";
    code += `  function ${hookName}() {\n`;
    code += `    const [data, setData] = useState<${retType} | undefined>(undefined);\n`;
    code += `    const [error, setError] = useState<unknown>(undefined);\n`;
    code += `    const [loading, setLoading] = useState(false);\n`;
    code += `    const mutate = useCallback(async (payload${
      payloadType === "void" ? "?" : ""
    }: ${
      payloadType === "void" ? "void | undefined" : payloadType
    }, requestInit?: RequestInit) => {\n`;
    code += `      setLoading(true); setError(undefined);\n`;
    code += `      try {\n`;
    code += `        const result = await client.${
      ep.functionName
    }(${orderedArgs.join(", ")});\n`;
    code += `        setData(result as ${retType});\n`;
    code += `        return result as ${retType};\n`;
    code += `      } catch (e) { setError(e); throw e; } finally { setLoading(false); }\n`;
    code += `    }, [client]);\n`;
    code += `    const reset = useCallback(() => { setData(undefined); setError(undefined); setLoading(false); }, []);\n`;
    code += `    return { mutate, data, error, loading, reset };\n`;
    code += `  }\n`;
    return code;
  }

  // Utilities similar to client generator
  private extractTypeNameFromRef(ref: string): string {
    const parts = ref.split("/");
    return parts[parts.length - 1] || "Unknown";
  }

  private mapSchemaTypeToTypeScript(
    type: string | string[],
    format?: string
  ): string {
    const types = Array.isArray(type) ? type : [type];
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
    if (format && formatMappings[format]) return formatMappings[format];
    const map: Record<string, string> = {
      string: "string",
      number: "number",
      integer: "number",
      boolean: "boolean",
      array: "unknown[]",
      object: "Record<string, unknown>",
      null: "null",
    };
    const mapped = types.map((t) => map[t] || "unknown");
    return mapped.length === 1 ? mapped[0]! : mapped.join(" | ");
  }

  private formatTypeName(name: string): string {
    // sanitize + PascalCase + prefix/suffix from config
    const sanitized = name
      .replace(/\[/g, "<")
      .replace(/\]/g, ">")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
    const pascal = sanitized
      .split(/_+/)
      .filter(Boolean)
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join("");
    const { typePrefix, typeSuffix } = this.context.config;
    return `${typePrefix || ""}${pascal}${typeSuffix || ""}`;
  }

  private getClientName(schema: OpenAPISchema): string {
    if (schema.info?.title) {
      const raw = schema.info.title.trim();
      const tokens = raw
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (tokens.length > 1 && /^(api)$/i.test(tokens[tokens.length - 1]!))
        tokens.pop();
      const pascal = tokens
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .join("");
      return (pascal || "Api") + "ApiClient";
    }
    return "ApiClient";
  }

  private generateOperationId(
    path: string,
    method: string,
    _op: OpenAPIOperation
  ): string {
    const parts = path.split("/").filter((p) => p && !p.startsWith("{"));
    const m = method.toLowerCase();
    return parts.length > 0
      ? `${m}${parts.map((p) => this.capitalize(p)).join("")}`
      : `${m}${this.capitalize(path.replace(/[^a-zA-Z0-9]/g, ""))}`;
  }

  private convertToFunctionName(operationId: string): string {
    const cleaned = operationId.replace(/[^a-zA-Z0-9]+/g, " ").trim();
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return "operation";
    const [first, ...rest] = tokens;
    let name =
      first!.charAt(0).toLowerCase() +
      first!.slice(1) +
      rest.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join("");
    if (/^[0-9]/.test(name)) name = "op" + name;
    return name;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private extractTypeNamesFromType(type: string): string[] {
    const matches = type.match(/[A-Z][A-Za-z0-9_]*|[A-Za-z0-9_]+(?=\])/g);
    return matches || [];
  }
}
