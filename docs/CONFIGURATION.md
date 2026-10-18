# Configuration

The constructor accepts `SchemanticOptions`, an input type with optional defaulted fields. `SchemanticConfig` describes the resolved configuration. A source is required for generation/validation; configuration initialization may omit it.

```ts
import { Schemantic } from 'schemantic';
import type { SchemanticOptions } from 'schemantic';

const options: SchemanticOptions = {
  schemaFile: './openapi.json',
  outputDir: './src/generated',
  generateHooks: false,
};
const generator = new Schemantic(options);
console.log(generator.getConfig().outputDir);
```

The CLI supports JSON and CommonJS `.cjs`/`.js` configurations, not TypeScript or ESM configuration modules. Prefer `.cjs` when your project has `"type": "module"`.

```json
{
  "schemaFile": "./openapi.json",
  "outputDir": "./src/generated",
  "generateTypes": true,
  "generateApiClient": true,
  "generateHooks": false,
  "plugins": [{ "name": "jsdoc", "enabled": true }]
}
```

```js
// schemantic.config.cjs
module.exports = {
  schemaFile: './openapi.json',
  outputDir: './src/generated',
  plugins: [{ name: './plugins/my-plugin.cjs', enabled: true }],
};
```

Discovery checks only the current directory, in order: `schemantic.config.json`, `schemantic.config.cjs`, then `schemantic.config.js`. Both `generate` and `validate` accept `--config [file]`; bare `--config` requires a discoverable configuration. Explicit paths override discovery. Schema/output/plugin file paths from a config are relative to its directory, while command-line paths are relative to the working directory. Package plugin names resolve from the consumer/config directory.

```sh
npx schemantic generate
npx schemantic validate --config ./schemantic.config.cjs
npx schemantic generate --config ./schemantic.config.json --file ./other.json --output ./other-output --verbose
```

Defaults are applied before config values, then explicit CLI values. An explicit schema source replaces the configured source. `--url` and `--file` together fail. Unknown fields and wrong field types fail: booleans must be JSON booleans, not strings. Unsupported active settings fail instead of silently doing nothing.

| Field | Default or contract |
| --- | --- |
| `schemaFile` / `schemaUrl` / `schemaData` | One source; file/URL input must be OpenAPI JSON |
| `outputDir` | `./src/generated` |
| `outputFileName` | `api-client.ts`; must be a safe output path |
| `generateTypes` | `true`; required model output accompanies a generated client |
| `generateApiClient` | `true` |
| `generateHooks` | `false`; requires client generation and consumer React |
| `generateIndexFile` | `true` |
| `useStrictTypes` | `true` |
| `namingConvention` | `camelCase`; controls generated identifiers, not JSON wire values |
| `propertyNaming` | `camelCase`; use `preserve` to retain wire properties in application types |
| `enumStyle` | `const`; emits `as const` objects and erasable union types. Set to `enum` for legacy TypeScript enum declarations |
| `typePrefix` / `typeSuffix` | Empty strings |
| `includePaths` / `excludePaths` | Arrays of path patterns |
| `includeSchemas` / `excludeSchemas` | Arrays of schema names/patterns |
| `customTypeMappings` | Map of OpenAPI formats/type mappings to TypeScript strings |
| `plugins` | Array of `{ name, enabled, options? }`; name is builtin/file/package |
| `preserveComments` | `true` |

`generateQueries: true` is unavailable. Optional chaining and nullish coalescing syntax switches are retained for compatibility but disabling them is unsupported. The `strict-mode` plugin has been retired and fails with an actionable diagnostic; remove it from plugin configuration and use the core strict defaults. Plugin options are JSON objects; callable custom behavior belongs in programmatic plugin factories/runtime constructors.

`init --yes --template default|types|react` writes a JSON configuration. Existing files are protected; `init --force` explicitly replaces one. `--yes` accepts defaults, including hooks off for the default template. Interactive Enter follows the displayed `(Y/n)` or `(y/N)` choice.

Watch mode requires a local schema file. It watches that file, serializes regeneration, and reports failures with a nonzero process status. Remote polling and automatic schema repair are not provided.

## Property names and wire conversion

Schema-declared application properties use camelCase by default: `display_name` becomes `displayName`. The original wire schema is retained for serializers/deserializers. Generated JSON/form request bodies use wire names automatically; generated JSON responses use application names. Caller-supplied FormData is already a wire representation and retains its keys/boundaries. PascalCase type/class names remain separate from property naming. Dynamic dictionary keys and enum values are never globally renamed.

Use `propertyNaming: "preserve"` to retain the old application property shape; this mode omits `conversion.ts`. In camelCase mode, `conversion.ts` exports generic `serializeValue(value, wireSchema)`/`deserializeValue(value, wireSchema)` and typed helpers such as `serializeUser`/`deserializeUser` for generated component models. Helpers use local references, recursive schemas, arrays, and composition metadata. They convert names without validating the payload; apply the emitted validation helpers separately when needed.

Colliding names such as `user_id` and `userId` are rejected. Ambiguous unions whose matching variants rename values differently require a discriminator. Cyclic JavaScript payload objects are rejected; recursive schema references remain supported.
