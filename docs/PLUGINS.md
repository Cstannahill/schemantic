# Plugins

Plugins are generation extensions or explicit runtime helper emitters. Enabling validation, caching, branding, or timing does not automatically wrap client endpoints. Import helpers from generated output and integrate them deliberately.

```sh
npx schemantic plugin list
npx schemantic generate ./openapi.json --plugins jsdoc,zod-validation --output ./generated
```

Install `zod@^4` in the consuming project for generated validation and schema-backed branded helpers. React hooks use `--hooks`/`generateHooks`, not a `react-hooks` plugin.

| Name | Observable behavior and boundary |
| --- | --- |
| `jsdoc` | Adds documentation to generated declarations |
| `validation` | Compatibility alias for the Zod validation plugin |
| `zod-validation` | Generates Zod schemas/helpers; consumer must call them |
| `strict-mode` | Retired; active use fails explicitly. Use core strict output defaults |
| `branded-types` | Nominal metadata and schema-backed guards/assertions/create helpers; Zod dependency |
| `request-deduplication` | Emits manual caching/coalescing helpers; endpoints are not automatically cached |
| `performance-monitoring` | Emits optional timing helpers; source-size analysis is an estimate, not a bundled artifact measurement |

Local and installed package plugins are resolved during the generation invocation:

```json
{
  "schemaFile": "./openapi.json",
  "outputDir": "./generated",
  "plugins": [
    { "name": "./plugins/example.cjs", "enabled": true },
    { "name": "installed-plugin-package", "enabled": true }
  ]
}
```

File paths resolve relative to the config. Package names resolve from the consumer/config directory. `--plugins ./plugin.cjs` is also supported. Plugins must export nonempty `name`, `version`, `description`, and compatible hook functions. Compile TypeScript plugins to JavaScript before loading. The inspection command `plugin load ./plugin.cjs` does not register that plugin in a future process.

Options belong in the plugin's config `options` object; enabled/disabled status is explicit. Programmatic factories are useful for function-valued settings that JSON cannot represent. See [development](PLUGIN_DEVELOPMENT.md).

## Runtime caching scope

The deduplication helper includes request method/URL/body/parameters/headers in identity. Use an execution `cacheScope` (or an instance per authenticated session) when ambient cookies or credential context changes the response. A shared instance cannot infer browser cookie changes. Mutation methods bypass caching. Custom key generators run on the runtime `RequestDeduplicator` constructor; do not place functions in JSON configuration. Avoid logging credentials.

Regex and string invalidation operate on tracked request URLs. Cache statistics report actual counters. Endpoint stale/TTL policies govern helper calls; they do not create automatic endpoint instrumentation.

## Capability limits

Auth-state branding records client metadata; server authorization still requires server checks. Zod's public constraints and unsupported schema diagnostics determine validation coverage. `optimizeBundle`, custom validation error wording, and automatic middleware claims should not be treated as implemented runtime features. Timing helpers observe explicit calls. `generateReports` writes `performance-report.json`, `.html`, or `.md`; report utilities can also return strings. These observe generator activity or explicitly instrumented calls; they are not historical regression monitoring or continuous browser memory monitoring. No request/error reduction percentages are promised.

See [advanced capabilities](ADVANCED_PLUGINS_IMPLEMENTATION.md) for experimental options and [API](API.md) for the actual hook/client contract.
