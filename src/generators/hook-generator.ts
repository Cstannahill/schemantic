/**
 * React hooks generator for OpenAPI endpoints
 * Generates lightweight hooks without external deps (uses React useState/useEffect/useCallback)
 */

import { GenerationContext, GeneratedEndpoint, GeneratedApiClient } from '../types/core';
import { ApiClientGenerator } from './api-client-generator';
import { propertyKey } from './schema-type';

export interface GeneratedHooksFile {
  name: string; // e.g., ApiHooks
  content: string;
  exports: string[]; // exported values, e.g., ["createApiHooks"]
  endpoints: GeneratedEndpoint[];
}

export class HookGenerator {
  constructor(private context: GenerationContext) {}

  generate(existingClient?: GeneratedApiClient): GeneratedHooksFile {
    const client = existingClient || new ApiClientGenerator(this.context).generate(this.context);
    const clientName = client.name;
    const endpoints = client.endpoints;

    const body = this.generateHooksBody(clientName, endpoints);
    // Determine React hooks used in the body to avoid unused imports
    const reactHooks: string[] = [];
    if (body.includes("useCallback(")) reactHooks.push("useCallback");
    if (body.includes("useEffect(")) reactHooks.push("useEffect");
    if (body.includes("useMemo(")) reactHooks.push("useMemo");
    if (body.includes("useRef(")) reactHooks.push("useRef");
    if (body.includes("useState(")) reactHooks.push("useState");

    const typeImports = (client.content.split('export interface ApiClientConfig')[0] || '').split('\n').filter(line => line.startsWith('import type ')).join('\n') + '\n';
    const clientModule = (this.context.config.outputFileName || 'api-client.ts').replace(/\.ts$/, '.js').replace(/\\/g, '/');
    const imports = typeImports + 'import type { ' + clientName + (endpoints.length ? ', ApiClientError' : '') + ' } from ' + JSON.stringify('./' + clientModule) + ';\n\n';
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

  private generateHooksBody(
    clientName: string,
    endpoints: GeneratedEndpoint[]
  ): string {
    let out = "";
    out += `export function createApiHooks(${endpoints.length ? 'client' : '_client'}: ${clientName}) {\n`;
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
    const { shape: argsType, call: orderedArgs } = this.hookArguments(ep, 'argsRef.current');
    orderedArgs[orderedArgs.length - 1] = 'requestInitRef.current';
    const retType = ep.returnType;

    let code = "";
    const hasArgs = argsType !== "void";
    const argsParamDecl = hasArgs ? `args: ${argsType}` : "";
    code += `  function ${hookName}(${argsParamDecl}${
      hasArgs ? ", " : ""
    }requestInit?: RequestInit) {\n`;
    code += `    const [data, setData] = useState<${retType} | undefined>(undefined);\n`;
    code += `    const [error, setError] = useState<ApiClientError | undefined>(undefined);\n`;
    code += `    const [loading, setLoading] = useState(false);\n`;
    if (hasArgs) code += `    const argsRef = useRef(args); argsRef.current = args;\n`;
    code += `    const requestInitRef = useRef(requestInit); requestInitRef.current = requestInit;\n`;
    code += `    const requestId = useRef(0);\n`;
    code += `    const normalizedHeaders: Record<string, string> = {}; new Headers(requestInit?.headers).forEach((value, key) => { normalizedHeaders[key] = value; });\n`;
    code += `    const requestKey = JSON.stringify([${hasArgs ? 'args' : 'null'}, { ...requestInit, headers: normalizedHeaders }]);\n`;
    code += `    const fetcher = useCallback(async () => {\n`;
    code += `      const id = ++requestId.current;\n`;
    code += `      setLoading(true); setError(undefined);\n`;
    code += `      try {\n`;
    code += `        const result = await client.${
      ep.functionName
    }(${orderedArgs.join(", ")});\n`;
    code += `        if (id === requestId.current) setData(result);\n`;
    code += `      } catch (e) { if (id === requestId.current) setError(e as ApiClientError); } finally { if (id === requestId.current) setLoading(false); }\n`;
    code += `    }, [client, requestKey, requestInit?.signal]);\n`;
    code += `    useEffect(() => { void fetcher(); return () => { requestId.current++; }; }, [fetcher]);\n`;
    code += `    const refetch = useCallback(fetcher, [fetcher]);\n`;
    code += `    return { data, error, loading, refetch };\n`;
    code += `  }\n`;
    return code;
  }

  private generateMutationHook(
    hookName: string,
    ep: GeneratedEndpoint
  ): string {
    const { shape: payloadType, call: orderedArgs } = this.hookArguments(ep, 'payload');
    const retType = ep.returnType;

    let code = "";
    code += `  function ${hookName}() {\n`;
    code += `    const [data, setData] = useState<${retType} | undefined>(undefined);\n`;
    code += `    const [error, setError] = useState<ApiClientError | undefined>(undefined);\n`;
    code += `    const [loading, setLoading] = useState(false);\n`;
    code += `    const requestId = useRef(0); const mounted = useRef(true); const activeClient = useRef(client);\n`;
    code += `    useEffect(() => { mounted.current = true; if (activeClient.current !== client) { activeClient.current = client; setData(undefined); setError(undefined); setLoading(false); } return () => { mounted.current = false; requestId.current++; }; }, [client]);\n`;
    code += `    const mutate = useCallback(async (payload${
      payloadType === "void" ? "?" : ""
    }: ${
      payloadType === "void" ? "void | undefined" : payloadType
    }, requestInit?: RequestInit) => {\n`;
    code += `      const id = ++requestId.current;\n`;
    code += `      if (mounted.current) { setLoading(true); setError(undefined); }\n`;
    code += `      try {\n`;
    code += `        const result = await client.${
      ep.functionName
    }(${orderedArgs.join(", ")});\n`;
    code += `        if (mounted.current && id === requestId.current) setData(result);\n`;
    code += `        return result;\n`;
    code += `      } catch (e) { if (mounted.current && id === requestId.current) setError(e as ApiClientError); throw e; } finally { if (mounted.current && id === requestId.current) setLoading(false); }\n`;
    code += `    }, [client]);\n`;
    code += `    const reset = useCallback(() => { requestId.current++; if (mounted.current) { setData(undefined); setError(undefined); setLoading(false); } }, []);\n`;
    code += `    return { mutate, data, error, loading, reset };\n`;
    code += `  }\n`;
    return code;
  }

  private hookArguments(endpoint: GeneratedEndpoint, root: string): { shape: string; call: string[] } {
    const fields: string[] = [];
    const call: string[] = [];
    for (const location of ['path', 'query', 'header', 'cookie']) {
      const parameters = endpoint.parameters.filter(parameter => parameter.location === location);
      if (!parameters.length) continue;
      const optional = parameters.every(parameter => parameter.isOptional);
      fields.push(location + (optional ? '?' : '') + ': { ' + parameters.map(parameter =>
        propertyKey(parameter.name) + (parameter.isOptional ? '?' : '') + ': ' + parameter.type).join('; ') + ' }');
      for (const parameter of parameters) {
        call.push(optional ? root + '?.' + location + '?.[' + JSON.stringify(parameter.name) + ']' : root + '!.' + location + '[' + JSON.stringify(parameter.name) + ']');
      }
    }
    if (endpoint.requestBody) {
      const body = endpoint.requestBody;
      const type = /^multipart\/form-data/i.test(body.contentType || '') ? body.type + ' | FormData' : body.type;
      fields.push('body' + (body.isOptional ? '?' : '') + ': ' + type);
      call.push(root + (body.isOptional ? '?.body' : '.body'));
    }
    call.push('requestInit');
    return { shape: fields.length ? '{ ' + fields.join('; ') + ' }' : 'void', call };
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

}
