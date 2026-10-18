# API reference

Import supported APIs from `schemantic`, not blocked repository/deep paths. The package exports core classes/types, parsers, generators, plugin management/loading, built-in plugin objects, and supported utility factories. Generated client APIs are exported from the generated `index.ts`, not the schemantic package.

```ts
import { Schemantic } from 'schemantic';
import type { SchemanticOptions, SchemanticPlugin } from 'schemantic';

const options: SchemanticOptions = { schemaFile: './openapi.json', outputDir: './generated' };
const generator = new Schemantic(options);
const plugin: SchemanticPlugin = {
  name: 'example', version: '1.0.0', description: 'Example plugin',
  beforeGeneration(context) { console.log(context.schema.info.title); },
};
generator.getPluginManager().registerPlugin(plugin);
generator.getPluginManager().enablePlugin(plugin.name);
const result = await generator.generate();
if (!result.success) throw new Error(result.errors.map(error => error.message).join('\n'));
```

| Method | Result |
| --- | --- |
| `generate()` | `Promise<GenerationResult>` with success, generated files, errors, warnings, statistics |
| `validate()` | Promise of `{ isValid, errors, warnings }`; no generated writes |
| `getConfig()` | Current configuration |
| `getPluginManager()` | Manager for registering, enabling, disabling, and inspecting plugins |

Generation results include file path/content/type/dependencies/size and statistics for type/endpoint/file counts, bytes and elapsed generation time. A successful result is not a claim of full OpenAPI coverage or server behavior; inspect warnings and compile the output with your consumer settings.

## Generated client

Client class names derive from `info.title`; the following example assumes `Users API`.

```ts
import { UsersApiClient as ApiClient, ApiClientError } from './generated/index.js';

const client = new ApiClient({
  baseUrl: 'http://localhost:8000',
  headers: { 'X-Api-Key': 'example' },
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
});
client.setAuthToken('token');
client.clearAuthToken();
// Catch ApiClientError for HTTP failures; status and response describe the failure.
void ApiClientError;
```

`baseUrl` is required. `headers` accepts the fetch header forms: a string record, pairs, or `Headers`. Timeout and retry delay are milliseconds; retries apply only to supported idempotent methods/transient failures. Each generated operation takes its schema-derived positional parameters and an optional final `RequestInit`. Supply per-call headers there, or use `setDefaultHeader(name, value)` / `removeDefaultHeader(name)` to change case-insensitive defaults. `setAuthToken` and `clearAuthToken` manage bearer authorization. OAuth login orchestration and automatic plugin middleware are not implemented.

Response bodies are decoded according to media/status metadata. JSON returns data, text-based media returns text, binary media returns Blob, and empty responses return undefined. XML is returned as text, not parsed into objects. Multiple declared response media may produce union types.

## Generated plain React hooks

Generate with `--hooks` or `generateHooks: true`, install React in the consumer, then use `createApiHooks(client)` from generated output. GET operations generate `use<Operation>Query(args?, requestInit?)`; other operations generate `use<Operation>Mutation()`.

Query results contain `{ data, error, loading, refetch }`. Query argument groups use schema wire parameter names under `path`, `query`, `header`, or `cookie`. Mutation results contain `{ mutate, data, error, loading, reset }`. Call `mutate({ path?, query?, header?, cookie?, body? }, requestInit?)` with the fields required by that operation. Payload groups are schema-derived; inspect the emitted signature.

Mutation state tracks the latest call: an older completion cannot replace its result/error or clear its pending loading state. Each caller still receives its own promise result. Reset, unmount, and client changes invalidate pending shared-state publication; changing the client clears mutation state. These hooks use React state/effects. They do not implement TanStack Query options such as `enabled`, `onSuccess`, `onError`, invalidation/query keys, or `isLoading`. Each `mutate` returns its own promise result; errors reject that promise. Handle errors with try/catch in your caller.

## Plugin loader

`new PluginLoader().loadPlugin(specifier, directory?)` selects local file or consumer-resolved package loading. Supported JavaScript module files are `.js`, `.cjs`, and `.mjs`; compile TypeScript plugins first. Modules may export a plugin directly, as default, or as `plugin`. Duplicate exported names fail. `plugin load` in the CLI inspects a module; it does not persist registration for another process.

See [configuration](CONFIGURATION.md), [plugins](PLUGINS.md), and the [current plugin interface](../src/types/core.ts) for the exact supported fields/hooks.

## Generated naming helpers

With default `propertyNaming: "camelCase"`, generated `conversion.ts` is exported by the generated index. Generated JSON/form requests serialize application properties to the schema wire names, and JSON responses deserialize declared properties to application names automatically. Caller-provided FormData retains its own keys and boundaries. For the tutorial User schema:

```ts
import { serializeUser, deserializeUser } from './generated/index.js';

const wireValue = serializeUser({ id: 1, displayName: 'Example' });
const applicationValue = deserializeUser({ id: 1, display_name: 'Example' });
console.log(wireValue, applicationValue.displayName);
```

Typed helper names derive from component type names, including configured type prefixes/suffixes. Generic `serializeValue(value, schema)` and `deserializeValue(value, schema)` accept a wire-schema object and return unknown. The schema registry used for local refs is embedded in the generated module. These functions convert declared names; `deserializeUser` does not assert that unknown input satisfies the User schema. Nullability, dictionary keys, enum values, and binary values are preserved. `propertyNaming: "preserve"` retains wire property names and omits the conversion module.
