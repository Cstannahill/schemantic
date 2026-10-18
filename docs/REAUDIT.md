# Schemantic re-audit

Date: 2026-10-10. Audited the current working tree, including the uncommitted corrections from the [previous audit](S:/Code/Node/Packages/schemantic/docs/AUDIT.md). Package version: 0.3.0. Host: Windows, Node 25.3.0, TypeScript 5.9.

## Verdict

The previous fixes remain effective for their covered regression cases. They do not establish that every affected feature is complete. The wider audit reproduced wrong-data caching, output overwrites, unusable generated types for valid schemas, lost response bodies, misleading validation, and failures under common consumer TypeScript settings.

The default types/client workflow works for the repository fixtures. Broad production-readiness and complete advanced-plugin claims are premature. Several public options and documented workflows are ineffective, partial, or explicitly unimplemented. Prioritize correctness and accurate contracts before adding more convenience features.

This re-audit adds evidence and a prioritized implementation plan. It does not apply production fixes. The agreed camelCase property migration remains [planned](S:/Code/Node/Packages/schemantic/docs/NAMING_MIGRATION.md); generated properties currently retain their wire names.

## Verification and evidence

| Check | Result | What it establishes |
| --- | --- | --- |
| `npm test -- --runInBand` | 14 suites, 184 tests passed; pretest clean build passed | Existing regression contracts, including previous fixes |
| `npm run lint` | Passed without warnings | Source lint rules |
| Six schemas × plain/Zod/hooks generation | All 18 cases generated and compiled | Fresh fixture output under strict TypeScript, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess`; hook imports use React signature declarations |
| Generated CommonJS client, DOM types | Compiled | Basic browser-compatible type environment |
| Generated Node server client, no DOM lib | Compiled with installed Node typings | One server-side type environment |
| Bundler + `verbatimModuleSyntax` | Failed, TS1484 | Type/value import distinction is incorrect |
| `noUnusedLocals` / `noUnusedParameters` | Failed, TS6133 | Unused generated private helpers block consumers |
| NodeNext ESM generated output | Failed, TS2835 | Relative generated imports lack required extensions |
| Package ESM named import | Passed | Importing the package itself works on the audit host; this is separate from generated ESM output |
| Package dry run | 129 files; 152,671 compressed bytes, 704,899 unpacked bytes | CLI/declarations present; tests, helper fixtures, dependencies and audit probes absent from the archive inspected before this report was added |
| Additional runtime/consumer probes | Reproduced the findings below | Known bad behavior is recorded, not treated as a successful correctness test |

Reproduce against a freshly built `dist`:

```powershell
npm test -- --runInBand
npm run lint
node scripts/reaudit.cjs
node test-output/reaudit-edges/probe.cjs
node test-output/reaudit-dx/probe.cjs
node test-output/reaudit-dx/compile-probe.cjs
node test-output/reaudit-plugins/probe-20261010-feature-claims.cjs
npm pack --dry-run --ignore-scripts --json --offline --cache ./test-output/reaudit-dx/npm-cache
```

The probe commands write only their audit scratch output; they do not modify production source. Their exit status indicates that the probe ran, not that every observed behavior was correct. Evidence:

- [Core generator, consumer compatibility and hook lifecycle evidence](S:/Code/Node/Packages/schemantic/test-output/reaudit-core/evidence.json), produced by [reaudit.cjs](S:/Code/Node/Packages/schemantic/scripts/reaudit.cjs).
- [OpenAPI edge-case evidence](S:/Code/Node/Packages/schemantic/test-output/reaudit-edges/summary.json), with input schemas, generated files and consuming code beside each case.
- [CLI evidence](S:/Code/Node/Packages/schemantic/test-output/reaudit-dx/results.json), [consumer diagnostics](S:/Code/Node/Packages/schemantic/test-output/reaudit-dx/compile-results.json), and [package inspection](S:/Code/Node/Packages/schemantic/test-output/reaudit-dx/pack.json).
- [Plugin observations](S:/Code/Node/Packages/schemantic/test-output/reaudit-plugins/results.jsonl), reproducible with the [plugin probe](S:/Code/Node/Packages/schemantic/test-output/reaudit-plugins/probe-20261010-feature-claims.cjs).

Limits: no mounted React application, real browser transport, live external FastAPI service, package installation from a published release, or Node 20/22/24 CI execution was performed. The hook harness executes generated state/dependency logic, but cannot establish real React StrictMode/concurrent-render behavior. Cross-project compilation and local HTTP observations are evidence for those exact contracts, not end-to-end certification of every framework. Some incomplete options below are source findings rather than runtime reproductions; those are labeled.

## Previous audit: closure check

Every previous audit area was revisited. “Covered fixes hold” means the previous regression tests passed again; it does not mean exhaustive closure of that feature.

| Previous area | Recheck | Remaining gap found in this pass |
| --- | --- | --- |
| Type output | Covered fixes hold: literals, basic compositions, arrays, dictionaries, nullability, identifiers, runtime enum exports; fresh fixtures compile | Heterogeneous known properties plus dictionary entries, required-only composition branches, directional read/write properties, binary inputs and global-name collisions remain incorrect (R05–R07, R12) |
| References and filtering | Covered component/JSON Pointer, inherited parameter, dependency selection and generation-time invalid-ref tests hold | Path Item references silently omit endpoints; 3.1 reference sibling constraints are lost; public validation misses unresolved refs; external refs remain unsupported (R08, R13–R14) |
| Generation lifecycle | Repeated-call state reset, input preservation, configured plugin/custom-generator dispatch and exact collision tests hold | Case-insensitive/ancestor collisions, stale files, lost custom imports and swallowed plugin failures remain (R02, R14–R15) |
| Request transport | Covered path escaping, array query parameters, inherited header/cookie parameters, Headers merging and URL-encoded body tests hold | Default object query serialization, binary request typing and authorization key casing remain incorrect (R03, R07, R11) |
| Responses/retries | Covered JSON/text/Blob/204 and retry policy tests hold | Schema-less media and default-only responses lose bodies; multiple media types and XML produce type/runtime mismatches (R09–R10) |
| Hooks | Prefix/filename/argument/query-stability and stale-query fixes hold; all fixture hooks compile with React signatures | Concurrent mutation results, loading and reset behavior remain incorrect; mounted React lifecycle is unverified (R04) |
| Validation | Covered enum/null/union/dictionary/lazy-reference/cache-isolation tests hold | Zod allOf rejects valid objects; oneOf and common constraints are weakened; permissive response validation discards data (R06, R16) |
| Optional plugin output | Activation, validation alias, auth-state transition, mutation-cache bypass and disabled coalescing tests hold | Multi-interface branded output, guards, cache identity, per-endpoint stale policy and disabled timing output fail; regex/custom-key/statistics gaps are still open (R01, R06, R17–R18) |
| CLI | Covered ordinary command failure codes, precedence, output selection, local watch and version fixes hold | Interactive failure exits zero, init overwrites configuration, interactive negative defaults invert, config types are unchecked, and plugin loading is disconnected (R19–R22) |
| Packaging | Clean build, portable clean, test exclusion and package/lockfile engine alignment hold; archive inspection passes | CI size gate checks the wrong quantity; generated module compatibility is incomplete; support matrix has not run locally (R12, R24) |
| Previously disclosed follow-ups | Still open, not regressions | `generateQueries`, optional syntax flags, advanced parameter encodings, external refs, strict plugin errors, atomic output and several experimental helper options have not been implemented (R14–R18, capability table) |
| Naming migration | Plan remains available and consistent with the preference | camelCase properties and boundary conversion are not implemented; keep this visible in release planning |

## Prioritized reproduced findings

P1: wrong data, destructive behavior, misleading runtime validation, or a mainstream supported workflow cannot work. P2: substantial feature/compatibility failure with a narrower trigger. P3: convenience/documentation issue. These are implementation priorities, not CVSS scores.

### R01 — P1: request cache identity can return the wrong resource or tenant data

The request-deduplication helper hashes the request fingerprint to a small integer and uses that hash as identity. `/Aa` and `/BB` deterministically collide: the second factory is never called and the second request receives the first result. Separately, custom identity-bearing headers are discarded from the fingerprint. Same URL with `X-Api-Key: tenantA` and `X-Api-Key: tenantB` returns tenant A's result to B, with one factory call.

Source: [request-deduplication.ts](S:/Code/Node/Packages/schemantic/src/plugins/request-deduplication.ts:268), header filtering at [line 305](S:/Code/Node/Packages/schemantic/src/plugins/request-deduplication.ts:305). Evidence: `fingerprint-collision`, `header-separation` in plugin observations. This affects consumers explicitly using the helper; generated endpoints do not automatically invoke it.

Fix: use a canonical full request identity or collision-checked hash buckets; include all response-affecting headers and credential context by default. Avoid storing sensitive header values in diagnostics. Apply `customKeyGenerator` if exposed, and document how cookies/session scope affect caching. Add two-tenant and deterministic collision tests before further cache optimizations.

### R02 — P1: output collisions can overwrite types on Windows

`outputFileName: 'Types.ts'` passes the case-sensitive collision check. On the audit filesystem it overwrites `types.ts` with the client, drops the User interface, and reports success. `types.ts/client.ts` passes preflight, writes types, then fails while trying to turn that file into a directory, leaving partial output.

Source: [schemantic.ts](S:/Code/Node/Packages/schemantic/src/core/schemantic.ts:391), writes at [line 493](S:/Code/Node/Packages/schemantic/src/core/schemantic.ts:493). Evidence: `lifecycle:file-collision-case` and `lifecycle:file-collision-ancestor`.

Fix: validate all normalized destinations, filesystem case aliases and file/ancestor conflicts before any write. Stage complete output and replace only package-owned files after successful generation. Keep arbitrary user files safe.

### R03 — P1: authorization setters/clearers mishandle header casing

A client initialized with lowercase `authorization: 'Bearer original'` then `setAuthToken('new')` sends `Bearer original, Bearer new`. `clearAuthToken()` leaves the original credential active. Header merging already works for the covered cases; the mutation helpers use case-sensitive object keys.

Source: [api-client-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:667). Evidence: `auth-headers` local HTTP probe.

Fix: normalize defaults through `Headers` or another case-insensitive representation, and use the same representation for set/delete/merge. Assert the exact outgoing Authorization header after replacement and clearing.

### R04 — P1: mutation hooks publish stale state and reset does not invalidate pending work

Two mutations resolve in reverse order: the older result overwrites the newer result. If the first finishes while the second is pending, `loading` becomes false. Calling `reset()` while a mutation is pending clears state briefly, then the pending result repopulates it. Generated mutation hooks lack the request identity protection already present in query hooks.

Source: [hook-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/hook-generator.ts:116). Evidence: `hook:overlapping-mutation`, `hook:pending-mutation-loading`, `hook:reset-pending-mutation`.

Fix: specify whether state tracks the latest call or all active calls; implement that policy consistently. Reset/unmount should invalidate pending state updates. Test reverse success/failure ordering, overlapping loading, reset, unmount and client changes in a mounted React application as well as the existing harness. Returning each caller's own promise result is compatible with suppressing stale shared state updates.

### R05 — P1: request/response types ignore readOnly/writeOnly direction

A valid OpenAPI 3.0.3 User with required read-only `id` and required write-only `password` uses one shared type for requests and responses. A valid create request without server-owned `id` fails TS2345; responses are typed as requiring the request-only password.

Source: [schema-type.ts](S:/Code/Node/Packages/schemantic/src/generators/schema-type.ts:53), [object-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/object-generator.ts:191), body/response selection in [api-client-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:250). Evidence: `readonly-writeonly`.

Fix: derive directional request/response projections, including recursive references, compositions, required fields and validators. Do not infer that all OpenAPI 3.1 annotations have identical semantics without a documented policy. The tested defect is in the explicit 3.0.3 contract. See [OpenAPI 3.0.3 schema rules](https://spec.openapis.org/oas/v3.0.3.html#schema-object).

### R06 — P1: branded validation gives false assurance and multi-type output fails compilation

With two object schemas and default branded options, generated `types.ts` declares `AuthState` twice (TS2300), while generation reports success. For a User requiring an integer `id >= 1`, the guard accepts `{}` and `[]`, and the assertion accepts `{}`. The object guard checks little beyond a non-null object. Setting guard/assertion flags to false still emits them. Primitive branded schemas are not enhanced by the interface-only path.

Source: [branded-types.ts](S:/Code/Node/Packages/schemantic/src/plugins/branded-types.ts:300), shared declarations at [line 533](S:/Code/Node/Packages/schemantic/src/plugins/branded-types.ts:533). Evidence: `branded-multiple-types`, `branded-disable-options`.

Fix: emit shared declarations once and register every public export for collision checks. Either implement schema-backed guards/assertions or explicitly expose shallow branding checks under names that do not imply validation. Honor exposed feature switches and cover primitive IDs. Auth-state metadata remains client type-state metadata, not server authorization.

### R07 — P1: binary upload types reject actual binary values

OpenAPI `type: string, format: binary` maps to `string` in multipart and raw upload bodies. A multipart `{ file: Blob }` fails TS2322; passing a Blob to a raw binary upload fails TS2345. A manually constructed FormData can work around the multipart method's typing, but does not fulfill the claimed typed upload contract.

Source: [schema-type.ts](S:/Code/Node/Packages/schemantic/src/generators/schema-type.ts:64), [api-client-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:473). Evidence: `multipart-binary`, `raw-binary`.

Fix: model binary input according to request media, support binary parts and repeated parts, preserve caller-provided multipart boundaries, and test actual bytes/content types through a server. Keep JSON string encodings distinct from binary upload values. See [OpenAPI 3.0.3 data types](https://spec.openapis.org/oas/v3.0.3.html#data-types).

### R08 — P1: valid Path Item references silently produce no endpoints

A path whose item is `$ref: '#/components/pathItems/Thing'` generates successfully with zero endpoints, although the referenced item contains a GET operation. Component schema reference support does not extend to Path Item extraction.

Source: [api-client-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:100). Evidence: `pathitem-ref`.

Fix: resolve Path Items before operation extraction, preserve inherited parameters and path context, detect cycles, and explicitly diagnose unresolved/unsupported reference forms. Successful generation must not silently omit recognized operation locations. See [OpenAPI 3.1 Path Item Object](https://spec.openapis.org/oas/v3.1.0.html#path-item-object).

### R09 — P1: schema-less successful media responses lose their body

A successful `application/octet-stream` response with a media object `{}` is valid without a schema. The generator infers `void`; the client returns `undefined` and discards the bytes. A default-only JSON response that receives HTTP 200 also returns `undefined` (P2 for that narrower schema).

Source: [api-client-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:301), return selection at [line 328](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:328), void handling at [line 573](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:573). Evidence: `binary-no-schema`, `default-response`.

Fix: distinguish “no body” from “body schema unspecified.” Select response metadata by actual status with range/default fallback; infer a media-appropriate result, such as Blob or unknown JSON, where the schema is absent. Keep genuine 204/empty response behavior. See [OpenAPI 3.1 Media Type Object](https://spec.openapis.org/oas/v3.1.0.html#media-type-object) and [Responses Object](https://spec.openapis.org/oas/v3.1.0.html#responses-object).

### R10 — P2: multiple response media and XML break type/runtime agreement

Static return typing chooses the first documented media schema. Runtime decoding chooses the actual content type. A response declaring text first and JSON second is typed `string` but returns an object when JSON arrives. A declared XML string response returns a Blob.

Source: [api-client-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:288), decoding at [line 643](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:643). Evidence: `multi-media-response`, `xml-response`.

Fix: one shared response-selection model should drive both return types and decoding. Support text-based media consistently, unions or explicit response modes for multiple media, and a clear policy for unknown media. Do not promise an object XML parser unless one is implemented.

### R11 — P2: default object query serialization sends `[object Object]`

A query object `{ role: 'admin', active: true }` with the normal form/explode defaults becomes `filter=%5Bobject+Object%5D`, instead of separate property parameters. This is a basic object query case, beyond the advanced encodings already deferred in the previous audit.

Source: [api-client-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:523). Evidence: `object-query` local HTTP probe.

Fix: serialize parameters using location/style/explode metadata. Cover default object form encoding first, then explicit form-without-explode, deepObject, matrix/label and per-property form encoding. If an encoding is unsupported, fail or issue a clearly actionable diagnostic rather than stringify objects. See [OpenAPI 3.1 parameter serialization](https://spec.openapis.org/oas/v3.1.0.html#style-values).

### R12 — P1/P2: generated files fail normal consumer compiler settings and global-name collisions

Bundler output fails TS1484 because interface imports are emitted as value imports. `noUnusedLocals` fails TS6133 because every client includes unused private form helpers. NodeNext ESM fails TS2835 on extensionless relative imports/re-exports. These failures are reproduced in standalone consumers, not just string checks.

An enum component named `Blob` also shadows the platform Blob used by always-emitted form helpers, producing TS2359/TS2351 even when the API has no upload endpoint.

Source: [api-client-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:678), helper use at [line 608](S:/Code/Node/Packages/schemantic/src/generators/api-client-generator.ts:608), [schemantic.ts](S:/Code/Node/Packages/schemantic/src/core/schemantic.ts:524), [hook-generator.ts](S:/Code/Node/Packages/schemantic/src/generators/hook-generator.ts:35). Evidence: consumer matrix and `global-blob-name`.

Fix: distinguish type-only imports from required enum/runtime imports; emit helpers only when used; make module emission compatible with a declared bundler/Node ESM target; qualify platform globals or alias colliding imports. Run consumer compilation rather than merely compiling the generator itself. These rules are documented by [TypeScript verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html) and [TypeScript module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html). The official [Vite React TypeScript template](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/tsconfig.app.json) uses settings relevant to these failures; no actual Vite app was mounted in this audit.

### R13 — P2: OpenAPI support is narrower than the stated contract

3.0.4, 3.1.1 and 3.1.2 documents are rejected by a fixed version allowlist. Parser metadata advertises YAML, but parsing YAML text calls JSON.parse and fails. OpenAPI 3.1 boolean schemas are rejected. A 3.1 components-only document is rejected for missing `paths`, even in types-only use.

Source: [openapi.ts parser](S:/Code/Node/Packages/schemantic/src/parsers/openapi.ts:33), JSON parsing at [line 51](S:/Code/Node/Packages/schemantic/src/parsers/openapi.ts:51), document structure at [line 178](S:/Code/Node/Packages/schemantic/src/parsers/openapi.ts:178). Evidence: `version-3.0.4`, `version-3.1.1`, `version-3.1.2`, `boolean-schema`, `components-without-paths`, `yaml-advertised`.

Fix: select the supported dialect by major/minor with appropriate patch compatibility; implement or remove the YAML capability claim; handle boolean schema semantics; allow components-only type generation when the dialect permits it. Publish a precise supported-keyword/media/reference table instead of “any OpenAPI 3.x.” See [OpenAPI 3.1 version semantics](https://spec.openapis.org/oas/v3.1.0.html#versions), [3.0.4](https://spec.openapis.org/oas/v3.0.4.html) and [3.1.2](https://spec.openapis.org/oas/v3.1.2.html).

### R14 — P2: validation and generation disagree; output is not transactional

`validate()` returns `isValid: true` for a missing component reference which `generate()` then rejects. A throwing plugin hook logs a warning but generation returns `success: true`, `errors: []`, `warnings: []`. Disabling hooks/client after a first generation reports only new types/index output while leaving old client/hooks files present. Ancestor collision failure also demonstrates partial writes.

Source: [schemantic.ts](S:/Code/Node/Packages/schemantic/src/core/schemantic.ts:152), separate reference pass at [line 234](S:/Code/Node/Packages/schemantic/src/core/schemantic.ts:234), [manager.ts](S:/Code/Node/Packages/schemantic/src/plugins/manager.ts:158). Evidence: `lifecycle:validate-vs-generate`, `plugin-failure-reporting`, `lifecycle:stale-output-files`.

Fix: share structural/reference/capability validation; include plugin diagnostics in the result and fail required hooks by default. An explicitly configured best-effort mode may continue, but must report incomplete output. Stage generation, maintain a manifest of owned files, replace atomically as far as the filesystem permits, and delete only stale owned output after success.

### R15 — P2: arbitrary custom plugin imports disappear

A registered plugin appends `import type { ExternalShape } from './external'` and an exported alias using it; it also declares the dependency. The core strips the import and regenerates imports only for a hardcoded package list. Generation succeeds; the consumer fails TS2304 even when `external.ts` exists.

Source: [schemantic.ts](S:/Code/Node/Packages/schemantic/src/core/schemantic.ts:453), known import list at [line 666](S:/Code/Node/Packages/schemantic/src/core/schemantic.ts:666). Evidence: `plugin:custom-import-preservation`.

Fix: give generated modules structured import records with module, symbol, alias and type/value usage; preserve/deduplicate them and rebase paths deliberately. A string dependency name cannot represent arbitrary import semantics. Validate plugin output with a consumer compile before claiming broad extensibility.

### R16 — P1/P2: Zod composition and constraints do not match the schema

`allOf` with two ordinary object branches `{ a }` and `{ b }` rejects valid `{ a, b }`, because each branch is strict before intersection. `oneOf: [number, integer]` accepts 1 even though it matches both branches. `minItems: 2` accepts `[]`; `uniqueItems` accepts duplicates; exclusive minimum accepts the boundary; an enum combined with minimum string length accepts a forbidden short enum value.

With response `strictMode: false`, invalid data returns `undefined`, while the documentation promises the original data. This quietly destroys the response in a purported permissive mode.

Source: [zod-validation.ts](S:/Code/Node/Packages/schemantic/src/plugins/zod-validation.ts:401), object strictness at [line 567](S:/Code/Node/Packages/schemantic/src/plugins/zod-validation.ts:567), permissive response path at [line 734](S:/Code/Node/Packages/schemantic/src/plugins/zod-validation.ts:734). Evidence: `zod-schema-constraints`, `permissive-validation`.

Fix: use composition semantics that do not falsely reject properties belonging to another branch, enforce exactly one branch for oneOf, compose enum and other constraints, implement array/exclusive bounds, and define whether unknown keys are allowed according to dialect/schema. Strict/permissive modes need explicit documented return/error contracts. Validators must agree with the accepted wire representation and future naming converters.

### R17 — P2: stale policy, regex invalidation and cache statistics are incomplete

An endpoint with `staleWhileRevalidate: false` still returns expired cached data under global stale defaults and does not refresh it in the reproduced case. Regex invalidation claims an invalidation but leaves the cached entry available. Cache hit rate remains literal zero after a hit. The previous stale path fix restored one path; it did not make endpoint policy complete.

Source: [request-deduplication.ts](S:/Code/Node/Packages/schemantic/src/plugins/request-deduplication.ts:427), refresh path at [line 610](S:/Code/Node/Packages/schemantic/src/plugins/request-deduplication.ts:610), invalidation at [line 637](S:/Code/Node/Packages/schemantic/src/plugins/request-deduplication.ts:637). Evidence: `endpoint-no-stale`, `regex-invalidation`.

Fix: enforce endpoint policy before returning expired data, retain canonical identity metadata for invalidation, implement real hit/miss/eviction counters, and test TTL boundaries with controlled time. Source-only follow-up: `customKeyGenerator` is declared but unused, and URL-string invalidation does not robustly match identities containing query/header context.

### R18 — P2: a documented monitoring switch generates broken exports

With `enableTiming: false`, generation succeeds but index exports reference absent `PerformanceMonitor`, `getPerformanceStats` and `clearPerformanceStats` (TS2305). Conditional helpers and advertised exports are out of sync.

Source: [performance-monitoring.ts](S:/Code/Node/Packages/schemantic/src/plugins/performance-monitoring.ts:469), exports at [line 501](S:/Code/Node/Packages/schemantic/src/plugins/performance-monitoring.ts:501). Evidence: `monitoring-disabled-timing`.

Fix: derive imports, declarations and exports from the same active feature graph. Compile supported option combinations. Further monitoring limitations are source findings in the capability table below.

### R19 — P1: init overwrites existing configuration without an overwrite option

Running `init --yes` in a directory with an existing configuration replaces it with defaults and reports success. No explicit force/overwrite flag is required. The interactive write uses the same unconditional behavior.

Source: [CLI](S:/Code/Node/Packages/schemantic/src/cli/index.ts:829). Evidence: `init overwrites existing`.

Fix: use exclusive creation by default, report the existing path, and require an explicit overwrite operation. Consider a separate validated merge/update workflow. Test that a custom existing configuration remains byte-for-byte unchanged when overwrite was not requested.

### R20 — P2: interactive command status and defaults are inconsistent

Interactive generation of a missing source prints failure but exits 0. Enter at `Generate React hooks? (y/N)` produces `generateHooks: true`; normal defaults correctly use false. A user following defaults therefore receives a React dependency unexpectedly.

Source: [CLI result handling](S:/Code/Node/Packages/schemantic/src/cli/index.ts:701), [promptBoolean](S:/Code/Node/Packages/schemantic/src/cli/index.ts:856). Evidence: `interactive missing source exit`, `empty answers init config`.

Fix: route interactive and ordinary commands through the same handler/status logic, and make prompt defaults explicit parameters. Ensure Enter agrees with the displayed capitalized option. Invalid/unsupported choices need actionable nonzero failures in automation.

### R21 — P2: configuration is weakly validated and defaults are hard to consume

JSON containing `generateTypes: "false"`, `generateApiClient: "false"`, `useStrictTypes: "false"`, an unknown property and `generateQueries: true` is accepted; truthy strings generate types/client and the unsupported option has no effect. In TypeScript, `new Schemantic({ schemaFile, outputDir })` fails TS2345 because public config requires the defaulted flags even though runtime merges defaults.

A generated conventional config is not automatically discovered by bare `generate`. `validate --config` is rejected, so validation cannot reuse the generation source configuration. These last two are DX improvements rather than an asserted existing auto-discovery feature.

Source: [CLI config loader](S:/Code/Node/Packages/schemantic/src/cli/index.ts:494), [SchemanticConfig](S:/Code/Node/Packages/schemantic/src/types/core.ts:19), [constructor](S:/Code/Node/Packages/schemantic/src/core/schemantic.ts:45). Evidence: `invalid config accepted`, `minimal programmatic defaults`, `config autodiscovery`, `validate cannot reuse config`.

Fix: one validated config contract shared by CLI/library, an ergonomic input type and fully resolved internal type, consistent discovery/path resolution, and explicit diagnostics for unknown fields and unsupported settings. Keep deterministic precedence: defaults, discovered/explicit config, explicit CLI overrides. Do not change established explicit source precedence accidentally.

### R22 — P2: CLI custom plugin loading is disconnected from generation

`plugin load ./plugin.cjs` reports success. A later generation with `--plugins dx-plugin` fails “Unknown plugin.” Loading a package name is treated as a filesystem path rather than invoking the package-loading API. The advertised workflow cannot configure a custom plugin for the actual generation process.

Source: [CLI plugin load](S:/Code/Node/Packages/schemantic/src/cli/index.ts:309), [built-in resolution](S:/Code/Node/Packages/schemantic/src/cli/index.ts:543), [loader.ts](S:/Code/Node/Packages/schemantic/src/plugins/loader.ts:19). Evidence: `load local custom plugin`, `generate after plugin load`, `plugin package advertised`.

Fix: resolve file/package plugin entries from the active config during the same generation invocation, with deterministic relative paths and plugin option validation. Either persist registration explicitly or describe `plugin load` as an inspection command; process-local loading must not imply a lasting installation.

### R23 — P2/P3: published tutorials and flags describe APIs that do not exist

Compiled tutorial calls to `setDefaultHeader`/`removeDefaultHeader` fail TS2339. Mutation examples use callbacks/isLoading incompatible with the implemented hook signature/`loading`; query examples show unsupported `enabled`. The tutorial describes TanStack behavior although first-party hooks use plain React. It recommends Node 16 while the package requires Node 20+.

Configuration docs demonstrate TypeScript config files, but the CLI explicitly supports JSON/CommonJS `.js`/`.cjs` only. Some guides still enable the unavailable built-in `react-hooks` plugin. Plugin-development docs list hook names/CLI extensions not in the current `SchemanticPlugin` interface. `init --template does-not-exist` succeeds while ignoring the template. `--verbose` is declared without behavior (source finding); `--fix` correctly fails explicitly but still appears as a supported repair feature in help/examples. `help bogus` exits 0.

Sources: [FASTAPI_TUTORIAL.md](S:/Code/Node/Packages/schemantic/docs/FASTAPI_TUTORIAL.md:840), [CONFIGURATION.md](S:/Code/Node/Packages/schemantic/docs/CONFIGURATION.md:53), [PLUGIN_DEVELOPMENT.md](S:/Code/Node/Packages/schemantic/docs/PLUGIN_DEVELOPMENT.md:20), [plugin interface](S:/Code/Node/Packages/schemantic/src/types/core.ts:222), [CLI template declaration](S:/Code/Node/Packages/schemantic/src/cli/index.ts:167). Evidence: DX CLI/compile probes plus source comparison.

Fix: select one public contract and execute its examples in CI. Remove unsupported flags/examples immediately or implement them with real acceptance tests. A correct README disclaimer does not repair conflicting linked guides. Audit the “Production Ready”/“Zero Configuration” language and stale version wording in [README.md](S:/Code/Node/Packages/schemantic/README.md:13).

### R24 — P2/P3, source finding: release verification gates are misleading

The CI package size guard reads the last stdout line of npm pack (the archive filename) and compares that value as if it were a size; it does not enforce archive bytes. Local dry-run inspection passes, but does not prove that release gate works. CI targets Ubuntu Node 20/22/24; Windows/macOS generated-file behavior is not covered.

Source: [ci-cd.yml](S:/Code/Node/Packages/schemantic/.github/workflows/ci-cd.yml:77). Additional source risk: [publish:gh](S:/Code/Node/Packages/schemantic/package.json:35) mutates package name before publishing and restores it only if the publish command succeeds. This command was not executed.

Fix: parse npm pack JSON `size`/`unpackedSize` with numeric assertions, verify packed content and installed-package consumers, add platform-sensitive output tests, and make publish preparation/restoration transactional. Do not publish during audit validation.

## Feature claim inventory

“Implemented, covered” is bounded by the tests described above. “Partial” means real code exists but the advertised feature is incomplete. “Stub/ineffective” means an exposed path does no promised work. Proposed capabilities are not existing features.

| Claimed/exposed capability | Status | Finding or boundary |
| --- | --- | --- |
| OpenAPI JSON from file/URL/in-memory input | Implemented, covered for repository schemas | URL fixture/live tests are not proof for every server; YAML/dialect limits below |
| Any OpenAPI 3.x / latest compatible patches | Partial | Version allowlist rejects supported-dialect patch releases; boolean/components-only cases fail (R13) |
| YAML parser support | Claimed, unimplemented | Metadata says YAML; implementation JSON parses it (R13) |
| Interfaces, aliases, enums, arrays, nullable types | Implemented with important gaps | Directional types, dictionaries/compositions, binary/global names (R05, R07, R12 and below) |
| Composition/JSON Schema constraints | Partial | Required-only allOf and reference siblings weakened; Zod constraints incomplete (R16) |
| Local schema refs/inherited parameters/filter dependency closure | Implemented, covered for tested cases | Path Item refs missing; external file/remote refs unsupported (R08) |
| Schema validation | Partial | Structural checks exist; unresolved refs and unsupported-feature fidelity inconsistent (R14) |
| Fetch clients/basic JSON and scalar/array transport | Implemented, covered for tested cases | Object styles, binary media, response selection and auth mutations incomplete |
| Headers/cookies/authentication | Partial | Basic parameter transport works; casing bug; security-scheme-driven auth conveniences not generated |
| Upload/download support | Partial | Typed binary requests and schema-less downloads fail (R07, R09) |
| Retry/timeout/request options | Implemented, covered for existing cases | Browser abort/unmount behavior and every environment not exercised |
| First-party React hooks | Implemented, partial | Queries covered; mutation lifecycle wrong; not a TanStack adapter (R04, R23) |
| Legacy `react-hooks` plugin | Placeholder, unavailable as a built-in | Its after-client path contains placeholder behavior; use first-party `generateHooks` and correct stale docs |
| `generateQueries` | Stub/ineffective | `true` with types/client disabled succeeds with an empty index and zero query generation |
| `useOptionalChaining` / `useNullishCoalescing` | Inconsistent/ineffective in output | Previous disclosed gap; no uniformly applied emission contract |
| Naming, prefix/suffix, wire-key preservation | Implemented, covered for existing modes | Application-property camelCase + runtime conversion remains planned |
| Types-only output | Implemented, covered | Components-only 3.1 parser restriction is unnecessary; future camelCase mode needs converters |
| Client-only output | Partial as a fresh project workflow | Named schemas require an existing compatible types file; users must manually request both |
| Watch local schema | Implemented, covered by previous regression | Remote watch intentionally unsupported; init/config DX remains inconsistent |
| Config activation and programmatic custom generators | Implemented, covered for existing probes | Weak config validation, required default flags, lost arbitrary imports (R15, R21) |
| CLI custom plugin installation/resolution | Partial/broken workflow | Load success cannot be used by generation; package resolution path unused (R22) |
| Plugin lifecycle hooks | Partial | Current hooks execute but swallow exceptions; docs advertise absent hooks/extensions |
| `validation` alias / Zod schemas | Implemented, partial | Zod 4 consumer requirement; composition/constraint correctness gaps (R16) |
| Automatic endpoint validation/middleware integration | Not implemented as claimed | Helpers are emitted; endpoints do not automatically route through them; consumer must integrate |
| Permissive validation response pass-through | Incorrect | Invalid response becomes undefined (R16) |
| Zod `optimizeBundle` | Ineffective, source finding | Declared but no implementation consuming the option |
| Zod LRU/TTL generation memoization | Partial/misdescribed, source finding | Generation schema/memo maps are unbounded; separate runtime validation cache does not establish that claim |
| Zod `customErrorMessages` | Partial/misdescribed, source finding | Used as describe metadata rather than configuring validation failure messages |
| Branded objects/auth type-state helpers | Implemented, partial | Duplicate shared declarations; shallow guards; false feature switches; primitive path missing (R06) |
| Branded nested/schema constraint validation | Not fully implemented | Metadata does not make runtime guards enforce those constraints |
| `strict-mode` plugin | Ineffective enhancement | Adds metadata the emitter does not consume and an import stripped by assembly; expected helper output absent in probe |
| Deduplication/caching for manual integration | Implemented, unsafe for some requests | Identity collisions/header omission; mutation bypass and disabling coalescing work (R01) |
| Stale revalidation/endpoint cache policy | Partial | Disabled endpoint stale policy still serves expired entries (R17) |
| Regex invalidation/custom key callback | Stub/ineffective | Regex does no removal; callback exposed but unused |
| Cache hit/eviction statistics | Stub/partial | Literal zeros instead of tracked counters (R17) |
| Timing helpers | Implemented, partial | Disabled option leaves invalid exports (R18); no automatic endpoint instrumentation |
| Metrics TTL/storage limit | Partial/ineffective, source finding | TTL declared but not used for expiry; analyzer storage does not consistently honor max storage |
| `generateReports` | Ineffective output claim, source finding | Computes/discards a report rather than producing an artifact |
| Bundle/dependency size analysis | Approximation, misdescribed | Counts generated source bytes and synthetic dependency estimates, not an actual bundled artifact |
| Memory monitoring/historical regression detection | Partial/misdescribed | Generator-process observation/current duration thresholds do not establish client monitoring or historical regressions |
| Advanced utility factory exports/examples | Incomplete public API | Helpers not re-exported by root; package exports block documented deep imports; memoized validation example signature disagrees with implementation |
| `init --template`, `--verbose` | Ignored/ineffective | No template dispatch or verbosity behavior |
| `validate --fix` | Explicitly unimplemented | Previously corrected failure reporting; schema repair still not a feature |
| TypeScript config files | Unimplemented | Documentation contradicts JSON/CommonJS-only loader |
| Published percentage improvements | Unsupported quantitative claims | No evidence for documented 60–80% request savings / 95% error reductions; do not present as measured package results |

Additional type fidelity evidence: `dictionary-known-property` rejects a valid `{ name: 'valid', score: 2 }` because output is `{ name: string } & Record<string, number>`, which also constrains `name` to number. `allof-required-only` and `ref-required-sibling` permit `{}` despite a required `id`. Sources: [schema-type.ts](S:/Code/Node/Packages/schemantic/src/generators/schema-type.ts:27), dictionary construction at [line 57](S:/Code/Node/Packages/schemantic/src/generators/schema-type.ts:57). The [JSON Schema additionalProperties rules](https://json-schema.org/understanding-json-schema/reference/object#additional-properties) exclude explicitly declared properties from the additional-property constraint. TypeScript cannot directly express every such index restriction: choose a documented sound approximation plus runtime validation/diagnostics, rather than emitting an impossible intersection.

Source-only plugin findings are grounded in [zod-validation.ts](S:/Code/Node/Packages/schemantic/src/plugins/zod-validation.ts:74), [branded-types.ts](S:/Code/Node/Packages/schemantic/src/plugins/branded-types.ts:121), [builtin.ts](S:/Code/Node/Packages/schemantic/src/plugins/builtin.ts:147), [performance-monitoring.ts](S:/Code/Node/Packages/schemantic/src/plugins/performance-monitoring.ts:530), [plugins/index.ts](S:/Code/Node/Packages/schemantic/src/plugins/index.ts:5), and claims in [ADVANCED_PLUGINS_IMPLEMENTATION.md](S:/Code/Node/Packages/schemantic/docs/ADVANCED_PLUGINS_IMPLEMENTATION.md:13). Retiring an ineffective option/plugin is preferable to keeping a feature name with no observable effect.

## Cross-project suitability

| Consumer/project shape | Current assessment | Needed release gate |
| --- | --- | --- |
| Plain strict TS/CommonJS generated client | Fresh simple and repository fixture compilation passes | Retain current regression suite and real request/response probes |
| Node server without DOM lib | One @types/node environment compiles | Run supported Node majors and actual fetch/upload/error behavior |
| Vite-style TS bundler with verbatim imports/no-unused checks | Reproduced compilation failures | Compile an official-template consumer with unchanged compiler settings |
| Node ESM/NodeNext project | Package import works; generated module graph fails | Compile and execute emitted JS in a `type: module` package |
| React app | Hook files compile against signature stubs; query harness cases pass; mutations fail | Mounted React tests including StrictMode, remount, overlap, reset and cancellation |
| Vue/Svelte/plain browser app | Framework-neutral core is a reasonable fit; no framework application run | Consumer compile/browser smoke without React dependency; hook default must remain off |
| FastAPI apps using typical schemas | Six snapshots pass tested modes | Representative live schema/service round trips, read/write projections, file uploads, dictionaries and nullable compositions |
| Other OpenAPI producers / modular schemas | Partial | Path Item refs, YAML, compatible patches and explicit unsupported-keyword diagnostics; external refs if included in scope |
| Windows output filesystem | Confirmed case alias overwrite | Case/ancestor/path-reserved-name tests and staged writes |
| Published package consumer | Pack manifest and host import pass | Temporary installed-pack consumer tests; supported-platform/Node CI; no reliance on repository-only paths |

Do not recommend weakening consumer compiler settings as the primary workaround. Generated output should adapt to mainstream settings without forcing projects to change their stack.

## UX/DX simplification and default decisions

1. **Make one command produce a complete usable graph.** Keep default types + client + index, hooks off. An explicitly selected client should include required types automatically, or require a validated explicit external types module. Avoid a “successful” fresh output that needs undisclosed previous files.
2. **Resolve configuration once.** Use a small ergonomic public input type, a validated resolved internal config, conventional discovery, and relative paths anchored to the config file. Let generate/validate/watch use the same source/config contract. Show effective source/output/plugin selection in verbose mode once verbosity is real.
3. **Make interactive defaults identical to noninteractive defaults.** Enter must honor `(y/N)`. Init must protect existing files. Choose meaningful template names only after templates exist; reject unknown names. Automatable commands need reliable exit codes and concise error messages.
4. **Favor zero surprise dependencies.** Plain clients use fetch without requiring React. Hooks remain explicit. Explain/install-check Zod only when enabled. Expose supported plugin helper APIs through package exports rather than undocumented repository/deep paths.
5. **Use explicit unsupported-feature diagnostics.** Reject active no-op settings until implemented or remove/deprecate them. Identify schema path and missing capability instead of success with omitted endpoints, incorrect values, or empty query output.
6. **Keep the agreed naming migration.** PascalCase type/class/interface names; camelCase methods/locals and future application properties by default; `propertyNaming: "preserve"` opt-out. This needs generated schema-aware serializers/deserializers, preserving wire keys, dictionary keys, enum values, nullability and binary objects. Renaming only the TS property is not a complete feature. See the existing migration plan for acceptance details.
7. **Choose one hook contract.** The current product is a plain React hook layer. Document that accurately and harden it. If users need TanStack features, provide a separate optional adapter with its real options, query keys, invalidation, mutation callbacks and dependency requirements. `generateQueries` should not remain an undocumented empty switch.
8. **Reduce overlapping plugins/options.** Keep one validation engine with an alias for compatibility; strict output is already a core default. Remove an ineffective strict-mode plugin unless it adds defined behavior. Derive plugin imports/exports from enabled capabilities rather than independently assembled strings.
9. **Make generated files explain themselves.** A small header should identify generator version, source and chosen compatibility/naming mode. A manifest should track owned files and optional name mappings. Avoid timestamps in normal output if they create needless diffs.
10. **Make examples executable.** Maintain a small real FastAPI/client example, a strict bundler consumer and a Node ESM consumer. Compile documentation snippets against the same generated output and expose exact implemented APIs, not prospective ones.

These are recommendations, not changes made by this audit. Auto-discovery and template support can remain opt-in/absent if their absence is documented, but advertised no-op behavior should be removed immediately.

## Missing functionality aligned with the package goal

### Essential for a dependable typed FastAPI/OpenAPI client

- Shared schema/operation intermediate representation covering direction, resolved references, naming, parameter serialization, media/status selection, validation and plugin imports. This reduces duplicated interpretation across generators and prevents static/runtime drift.
- Correct request/response projections, binary/media typing, default response handling, required/composition semantics and dictionary modeling. These repair the package's core promise rather than expanding into another product.
- A declared dialect/support matrix with compatible patch handling, capability diagnostics and a reference-resolution policy. Local external-file refs and YAML materially improve reuse across modular OpenAPI projects; remote refs need a separate explicit policy and tests.
- Module-aware, type-only import generation and dependency-complete output, verified against real consumer configurations.
- Safe output ownership/transactional lifecycle, shared validation, and truthful plugin failure reporting.
- Reliable case-insensitive header operations and schema/security-scheme metadata for supported auth flows. Common bearer/API-key helpers are useful; full OAuth login orchestration is not required to fix the current client contract.
- Mounted hook lifecycle tests and a defined mutation/reset/cancellation contract.

### Valuable after correctness, with explicit product decisions

- Schema-aware camelCase converters and preservation mode already requested; share them with Zod/hooks/media handling.
- Optional wired client middleware for validation, cache and timing, so enabling a plugin can have a documented observable effect. Integration must respect cache identity, cancellation, mutation policy and error semantics. Alternatively, honestly ship explicit helper libraries with complete public APIs.
- Rich typed response mode exposing status/headers and a structured HTTP error with status, headers and parsed/raw body. Useful for pagination, rate limits and non-JSON errors; validate current error behavior before selecting the new API.
- Per-call typed serialization/response overrides for media ambiguity and unusual servers; avoid forcing arbitrary unknown casts as the normal path.
- A real TanStack adapter if query-library integration is a product goal, or retirement of `generateQueries` and contradictory examples.
- Config discovery, `defineConfig`/typed config assistance, inspect/effective-config output, supported templates and a check mode for generated-output drift.
- Working cache invalidation/key callbacks/statistics and genuine exported monitoring/report artifacts if those features remain advertised. Use measured benchmark results before publishing performance percentages.

Callbacks/webhooks, complete OAuth authorization UI, XML-to-object parsing, and adapters for every framework are possible expansions. Their absence is not automatically a defect in a FastAPI-focused type/client generator. Prioritize evidence of target-user need and make scope explicit.

## Implementation order and acceptance gates

| Phase | Work | Required evidence before considering it complete |
| --- | --- | --- |
| 1. Protect data and trust | R01–R04, R06, R19; plugin exception reporting; remove inaccurate availability claims | Distinct-resource/tenant requests never share results; exact auth replacement/clear; no output/config overwrites; valid branded output and honest guards; overlap/reset/unmount contract tests; failed required plugins return failure |
| 2. Make generated output portable | R12, R15, R21; complete output graph; config/dependency/export model | Strict bundler with verbatim/no-unused and NodeNext ESM consumers compile and execute; platform name collisions handled; custom imports retained; minimal typed config works; wrong config types/unknown active settings diagnosed |
| 3. Complete target OpenAPI contracts | R05, R07–R11, R13, R16; dictionary/composition required semantics | Compiled request/response consumers plus local server bytes/status/media/query checks; valid schemas accepted; invalid validator inputs rejected; unsupported cases explicitly reported |
| 4. Make lifecycle/plugins consistent | R14, R17–R18, R20, R22; helper integration or truthful helper-only APIs | Atomic/staged failure leaves old output intact; only stale owned files removed; shared validation; option combinations compile; TTL/invalidation/statistics assertions; plugin resolution works in the generation process; interactive parity |
| 5. Ship naming migration | Existing naming plan; generated wire/application projections/converters | Both naming modes compile; request/response round trips preserve wire bytes; dictionaries/enums/binary values preserved; normalized collisions diagnosed; plugins/hooks/validators use the same naming graph |
| 6. Finish DX, documentation and release gates | R23–R24; examples, config discovery, declared compatibility matrix | Every documented snippet compiles/runs; Node 20/22/24 and platform-sensitive CI pass; packed/installed consumers pass; size gate reads actual bytes; unsupported claims/options removed or implemented |

Keep focused regression probes for each reproduced defect, but replace audit observations with assertions as fixes land. Add pairwise plugin/option coverage where features interact; exhaustive independent flag counts are less useful than validating real generated module graphs. Preserve the existing 184-test gate and all 18 fresh fixture compile cases.

The exit criterion is a truthful support contract backed by consuming-code and runtime tests. A green generator build or string snapshot alone is insufficient for claims about generated applications, wire compatibility, runtime validation or caching.
