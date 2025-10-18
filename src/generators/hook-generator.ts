/**
 * React hooks generator for OpenAPI endpoints
 * Generates lightweight hooks without external deps (uses React useState/useEffect/useCallback)
 */

import {
  OpenAPISchema,
  OpenAPIPaths,
  OpenAPIOperation,
  OpenAPIPathItem,
  OpenAPIParameter,
  OpenAPIRef,
  OpenAPIRequestBody,
  OpenAPIResponses,
  OpenAPISchemaObject,
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

    const body = this.generateHooksBody(clientName, endpoints);
    // Determine React hooks used in the body to avoid unused imports
    const reactHooks: string[] = [];
    if (body.includes("useCallback(")) reactHooks.push("useCallback");
    if (body.includes("useEffect(")) reactHooks.push("useEffect");
    if (body.includes("useMemo(")) reactHooks.push("useMemo");
    if (body.includes("useRef(")) reactHooks.push("useRef");
    if (body.includes("useState(")) reactHooks.push("useState");

    const imports = this.generateImports(endpoints, clientName);
    const reactImport = reactHooks.length
      ? `import { ${reactHooks.join(", ")} } from 'react';\n`
      : "";

    const content = imports.replace("\n\n", "\n") + reactImport + body;

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
        const operation = (pathItem as OpenAPIPathItem)[method] as
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

  private extractParameters(
    parameters: (OpenAPIParameter | OpenAPIRef)[]
  ): GeneratedParameter[] {
    const out: GeneratedParameter[] = [];
    for (const param of parameters) {
      if (!param || typeof param !== "object") continue;

      // Skip refs for now - parameter refs are less common
      if ("$ref" in param) continue;

      // Handle direct OpenAPIParameter
      const type = this.extractSchemaType(param.schema);
      const isRequired = !!param.required;
      out.push({
        name: param.name,
        type,
        isOptional: !isRequired,
        isRequired,
        location: param.in,
        ...(param.description && { description: param.description }),
      });
    }
    return out;
  }

  private extractRequestBody(
    requestBody: OpenAPIRequestBody | OpenAPIRef | undefined
  ): GeneratedRequestBody | undefined {
    if (!requestBody || typeof requestBody !== "object") return undefined;

    if ("$ref" in requestBody) {
      const resolved = this.context.schemaResolver(requestBody.$ref);
      if (resolved) {
        return {
          type: this.extractSchemaType(resolved),
          isOptional: true, // Can't determine from ref
        };
      }
    }

    if ("content" in requestBody && requestBody.content) {
      const ct = Object.keys(requestBody.content)[0];
      if (!ct) return undefined;
      const media = requestBody.content[ct];
      if (media?.schema) {
        return {
          type: this.extractSchemaType(media.schema),
          isOptional: !requestBody.required,
          contentType: ct,
          ...(requestBody.description && {
            description: requestBody.description,
          }),
        };
      }
    }
    return undefined;
  }

  private extractResponses(responses: OpenAPIResponses): GeneratedResponse[] {
    const out: GeneratedResponse[] = [];
    for (const [statusCode, response] of Object.entries(responses)) {
      if (!response || typeof response !== "object") continue;

      if ("$ref" in response) {
        const resolved = this.context.schemaResolver(response.$ref);
        if (resolved) {
          out.push({
            statusCode,
            type: this.extractSchemaType(resolved),
            isOptional: false,
          });
        }
        continue;
      }

      if ("content" in response && response.content) {
        const ct = Object.keys(response.content)[0];
        if (!ct) {
          out.push({
            statusCode,
            type: "void",
            isOptional: false,
            ...(response.description && { description: response.description }),
          });
          continue;
        }
        const media = response.content[ct];
        if (media?.schema) {
          out.push({
            statusCode,
            type: this.extractSchemaType(media.schema),
            isOptional: false,
            ...(response.description && { description: response.description }),
          });
        }
      } else {
        out.push({
          statusCode,
          type: "void",
          isOptional: false,
          ...(response.description && { description: response.description }),
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

  private extractSchemaType(
    schema: OpenAPISchemaObject | OpenAPIRef | undefined
  ): string {
    if (!schema) return "unknown";

    if ("$ref" in schema && typeof schema.$ref === "string") {
      const name = this.extractTypeNameFromRef(schema.$ref);
      return this.formatTypeName(name);
    }

    // Arrays
    if ("type" in schema && schema.type === "array") {
      const items = schema.items as
        | OpenAPISchemaObject
        | OpenAPIRef
        | undefined;
      const itemType = items ? this.extractSchemaType(items) : "unknown";
      return `${itemType}[]`;
    }

    // Objects with properties or additionalProperties
    if ("type" in schema && schema.type === "object") {
      const hasProps =
        !!schema.properties && Object.keys(schema.properties!).length > 0;
      if (hasProps) {
        const lines: string[] = [];
        for (const [propName, propSchema] of Object.entries(
          schema.properties!
        )) {
          const t = this.extractSchemaType(
            propSchema as OpenAPISchemaObject | OpenAPIRef
          );
          lines.push(`${propName}: ${t}`);
        }
        return `{ ${lines.join("; ")} }`;
      }
      if (schema.additionalProperties !== undefined) {
        if (schema.additionalProperties === true)
          return "Record<string, unknown>";
        if (typeof schema.additionalProperties === "object") {
          const vt = this.extractSchemaType(
            schema.additionalProperties as OpenAPISchemaObject | OpenAPIRef
          );
          return `Record<string, ${vt}>`;
        }
      }
      return "Record<string, unknown>";
    }

    if ("type" in schema && schema.type)
      return this.mapSchemaTypeToTypeScript(schema.type, schema.format);
    if ("enum" in schema && schema.enum)
      return schema.enum.map((v: unknown) => JSON.stringify(v)).join(" | ");
    if ("const" in schema && schema.const !== undefined)
      return JSON.stringify(schema.const);
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
    // Filter out TypeScript built-in/global type names that are not generated in ./types
    const builtinNames = new Set([
      "string",
      "number",
      "boolean",
      "unknown",
      "any",
      "void",
      "null",
      "undefined",
      "never",
      "object",
      "Record",
      "Array",
      "Promise",
      "Partial",
      "Readonly",
      "Pick",
      "Omit",
      "Exclude",
      "Extract",
      "Required",
      "NonNullable",
      "ReturnType",
      "Parameters",
      "InstanceType",
      "ConstructorParameters",
      "ThisType",
      "Set",
      "Map",
      "Date",
      "RegExp",
      "Error",
    ]);
    const filteredTypeNames = Array.from(typeNames).filter(
      (n) => !builtinNames.has(n)
    );
    const typesImport =
      filteredTypeNames.length > 0
        ? `import { ${filteredTypeNames.join(", ")} } from './types';\n`
        : "";
    // We'll lazily build the react import after generating the body to avoid unused imports
    const clientImport = `import { ${clientName}, ApiClientError } from './api-client';\n\n`;
    return typesImport + clientImport;
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

    // Build client call argument list in order: path params, query params, [body if any], options
    const orderedArgs: string[] = [];
    for (const p of pathParams) orderedArgs.push(`args!.path.${p.name}`);
    const queryObjectOptional = queryParams.every((p) => p.isOptional);
    const qPrefix = queryObjectOptional ? "args?.query?." : "args!.query.";
    for (const p of queryParams) {
      orderedArgs.push(`${qPrefix}${p.name}`);
    }
    // GET requests should not pass a body placeholder; just pass options
    orderedArgs.push("requestInit"); // options

    let code = "";
    const hasArgs = argsType !== "void";
    const argsParamDecl = hasArgs ? `args: ${argsType}` : "";
    code += `  function ${hookName}(${argsParamDecl}${
      hasArgs ? ", " : ""
    }requestInit?: RequestInit) {\n`;
    code += `    const [data, setData] = useState<${retType} | undefined>(undefined);\n`;
    code += `    const [error, setError] = useState<ApiClientError | undefined>(undefined);\n`;
    code += `    const [loading, setLoading] = useState(false);\n`;
    if (hasArgs) {
      code += `    const argsRef = useRef(args);\n`;
      code += `    useEffect(() => { argsRef.current = args; }, [args]);\n`;
    }
    code += `    const fetcher = useCallback(async () => {\n`;
    code += `      setLoading(true); setError(undefined);\n`;
    code += `      try {\n`;
    code += `        const result = await client.${
      ep.functionName
    }(${orderedArgs.join(", ")});\n`;
    code += `        setData(result);\n`;
    code += `      } catch (e) { setError(e as ApiClientError); } finally { setLoading(false); }\n`;
    code += `    }, [client${hasArgs ? ", args" : ""}, requestInit]);\n`;
    code += `    useEffect(() => { void fetcher(); }, [fetcher]);\n`;
    code += `    const refetch = useCallback(fetcher, [fetcher]);\n`;
    code += `    return { data, error, loading, refetch };\n`;
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

    const orderedArgs: string[] = [];
    for (const p of pathParams) orderedArgs.push(`payload!.path.${p.name}`);
    const q2ObjectOptional = queryParams.every((p) => p.isOptional);
    const q2Prefix = q2ObjectOptional ? "payload?.query?." : "payload!.query.";
    for (const p of queryParams) {
      orderedArgs.push(`${q2Prefix}${p.name}`);
    }
    if (hasBody) {
      orderedArgs.push(
        `payload${ep.requestBody!.isOptional ? "?.body" : ".body"}`
      );
    }
    orderedArgs.push("requestInit");

    let code = "";
    code += `  function ${hookName}() {\n`;
    code += `    const [data, setData] = useState<${retType} | undefined>(undefined);\n`;
    code += `    const [error, setError] = useState<ApiClientError | undefined>(undefined);\n`;
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
    code += `        setData(result);\n`;
    code += `        return result;\n`;
    code += `      } catch (e) { setError(e as ApiClientError); throw e; } finally { setLoading(false); }\n`;
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
    switch (lowerMethod) {
      case "get":
        return `${hasPathParams ? "get" : "list"}${this.capitalize(
          hasPathParams ? singular(resource) : resource
        )}`;
      case "post":
        return `create${this.capitalize(singular(resource))}`;
      case "put":
      case "patch":
        return `update${this.capitalize(singular(resource))}`;
      case "delete":
        return `delete${this.capitalize(singular(resource))}`;
      default:
        return `${lowerMethod}${nonParamSegments
          .map((part) => this.capitalize(part))
          .join("")}`;
    }
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
