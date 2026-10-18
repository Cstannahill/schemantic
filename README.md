# Schemantic

Generate TypeScript models, a fetch API client, and optional plain React hooks from OpenAPI JSON. The package requires Node.js 20 or newer. Generated browser clients use fetch; React is required only when hooks are enabled.

```sh
npm install --save-dev schemantic
npx schemantic generate --url http://localhost:8000/openapi.json --output ./src/generated
```

The default output is `types.ts`, `conversion.ts`, `api-client.ts`, and `index.ts`. Hooks are off by default. `--client` includes its required model types; `--types` selects models only. Use `--hooks` with client generation to emit `hooks.ts`.

For a schema titled `Users API`, the class is `UsersApiClient`. Client names are derived from `info.title`; inspect your generated export.

```ts
import { UsersApiClient as ApiClient } from './generated/index.js';

const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
client.setAuthToken('your-token');
// Method names and arguments come from the schema's operations.
client.clearAuthToken();
```

Generate from a local file, initialize a config, or validate without writing generated files:

```sh
npx schemantic generate ./openapi.json --output ./src/generated
npx schemantic init --yes
npx schemantic validate ./openapi.json
```

`init` creates configuration exclusively: an existing file requires explicit `--force`. Templates are `default` (models/client), `types` (models only), and `react` (models/client/hooks). Set a schema source in the initialized configuration before running bare `generate`.

The CLI discovers `schemantic.config.json`, `.cjs`, or `.js` in the current directory, in that order. `generate` and `validate` accept `--config [file]`. Precedence is defaults, config, explicit CLI options. Config-relative schema/output/plugin file paths resolve beside the config; explicit CLI paths resolve from the working directory. Use `--verbose` to inspect the effective source, output, generation flags, and plugin selection.

Programmatic use:

```ts
import { Schemantic } from 'schemantic';

const generator = new Schemantic({
  schemaFile: './openapi.json',
  outputDir: './src/generated',
});
const result = await generator.generate();
if (!result.success) throw new Error(result.errors.map(error => error.message).join('\n'));
```

## Supported scope

OpenAPI `3.0.x` and `3.1.x` JSON documents are supported, including local JSON Pointer references. YAML and references to external files/URLs are rejected explicitly. OpenAPI `3.2+` is unsupported. Valid OpenAPI can contain features beyond the supported generator subset; validation diagnostics are part of the support contract. TypeScript dictionary types with declared properties use a widened index value union; use runtime validation when exact additional-property constraints matter.

Parameter serialization supports simple path/header values, flat form/deepObject queries and space/pipe-delimited arrays. Complex cookies, matrix/label styles, nested encodings and per-property form encodings are rejected explicitly. Cookie parameters depend on the fetch runtime's header policy; browsers manage cookies through credentials. JSON Schema conditionals, `contains` and unevaluated-property keywords are outside the validator subset. Validation checks document structure and references; it is not a complete OpenAPI/JSON Schema standards validator.

Generated relative imports include `.js` extensions for TypeScript NodeNext and bundler resolution. Plain React hooks provide `loading`, `data`, `error`, and `refetch` or `mutate`/`reset`; they are not a TanStack Query adapter. `generateQueries`, automatic schema repair, TypeScript config loading, and automatic endpoint middleware are unavailable. Do not enable the removed `react-hooks` plugin: use `generateHooks`/`--hooks`.

Validation, caching, branding, and timing plugins provide explicit helpers. Install Zod 4 in the consuming project when enabling validation or schema-backed branded helpers. Endpoints do not automatically call those helpers. See [plugins](docs/PLUGINS.md) for the integration contract and experimental boundaries; no benchmark percentage improvements are claimed.

The [re-audit](docs/REAUDIT.md) records reproduced defects and acceptance requirements from before the current corrections. Application properties use camelCase by default, while PascalCase names identify types/classes and schema wire names remain intact at HTTP boundaries. `propertyNaming: "preserve"` keeps wire property names in application types. Generated schema-aware `conversion.ts` helpers convert declared properties recursively and keep dictionary keys, enum values, nulls, and binary objects unchanged; conversion is not runtime validation. See [configuration](docs/CONFIGURATION.md) and the [naming migration design](docs/NAMING_MIGRATION.md).

## Documentation

- [Configuration](docs/CONFIGURATION.md)
- [API](docs/API.md)
- [FastAPI tutorial](docs/FASTAPI_TUTORIAL.md)
- [Plugins](docs/PLUGINS.md)
- [Plugin development](docs/PLUGIN_DEVELOPMENT.md)
- [Advanced plugin development](docs/ADVANCED_PLUGIN_DEVELOPMENT.md)
- [Advanced plugin capabilities](docs/ADVANCED_PLUGINS_IMPLEMENTATION.md)

## Development and release

```sh
npm ci
npm test -- --runInBand
npm run lint
npm pack --dry-run --ignore-scripts --json
```

Tests build the package first. CI is configured for Node 20/22/24 on Linux, Windows, and macOS, plus coverage, 36 generated fixture combinations, an installed-package consumer, live FastAPI requests, dependency auditing, and separate CodeQL analysis. Hosted results are available in GitHub Actions after the workflows run.

Prepare a release locally, review and merge the three changed files, then publish its matching GitHub Release:

```sh
npm run release:prepare -- minor --dry-run
npm run release:prepare -- minor
```

Preparation updates `package.json`, `package-lock.json`, and `CHANGELOG.md`. It never commits, tags, pushes, or publishes. The GitHub Release workflow verifies the exact tagged commit and publishes the same archive tested by an installed consumer, using npm trusted publishing. Follow the [release guide](docs/RELEASING.md) for the one-time npm setup, prereleases, and retries.
