# Project audit and verification

Audit date: 2026-10-10. Scope: generator orchestration, OpenAPI schema handling, generated TypeScript, fetch clients, first-party hooks, configured plugins, CLI behavior and release packaging. Validation ran on Windows with Node 25.3.0; CI configuration now targets Node 20, 22 and 24. Those CI versions were not run locally.

The original build, lint and tests passed, but several tests examined old generated files or only searched generated strings. New tests compile freshly generated output and exercise local HTTP and validation behavior. Helper files are no longer discovered as test suites or shipped in `dist`.

## Fixed and verified

| Area | Defects corrected | Evidence |
| --- | --- | --- |
| Type output | Composition/union precedence, array aliases, dictionaries, nullability, literal enums, invalid identifiers/property keys, duplicate enum keys and missing runtime exports | Fresh generated files and consuming code compiled with strict TypeScript, `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` |
| References and filtering | Component and nested JSON Pointer resolution, inherited parameters, incomplete dependency selection, unresolved refs silently generating bad output | Focused compile probes, dependency-filter tests and invalid-generation tests |
| Generation lifecycle | Stale state across repeated calls, input mutation, ignored configured plugins/custom generators, duplicate export/file collisions | Repeated-generation, plugin activation, custom generator and collision tests |
| Request transport | Unescaped paths, query arrays including named aliases, omitted headers/cookies, `Headers` merging, invalid positional optional parameters, URL-encoded object bodies | Fresh compilation and generated clients talking to local HTTP servers |
| Responses and retries | Unconditional JSON parsing, binary/text/empty response handling, repeated failed mutations/client errors, zero-delay retries | Local HTTP tests covering text, Blob, 204, transient reads, 400 and failed POST |
| Hooks | Incorrect type prefixes/client filenames, inconsistent inherited parameter arguments, repeat requests for equivalent inline input/options, stale query results | Generated hook compile tests and a deterministic React hook-state/dependency harness |
| Validation | Invalid interface decorators, lost wire/camelCase properties, numeric enum validation, nullable/unions/dictionaries, eager forward/recursive schema refs, cache naming isolation | Runtime execution of freshly generated Zod modules and strict compilation |
| Optional plugin output | Missing helper declarations/exports, invalid generic/phantom casts, always-true auth metadata guard, ignored disabled coalescing, cached mutations, unreachable stale-cache behavior | Plugin compile tests plus runtime auth transition, coalescing, mutation and stale-cache tests |
| CLI | Success exit codes on failure, config defaults overriding explicit settings, source precedence, ignored output selection, nonfunctional local watch, ignored `--fix`, misleading version | Spawned CLI tests including file-change regeneration and nonzero status checks |
| Packaging | Stale builds, Unix-only clean command, shipped test helpers, Node requirement mismatch | Clean build, pack contents inspection, package/lockfile and CI configuration alignment |

Focused regression tests are in [output-contract.test.ts](../src/__tests__/integration/output-contract.test.ts), [cli-contract.test.ts](../src/__tests__/integration/cli-contract.test.ts), [generated-shape.test.ts](../src/__tests__/generated-shape.test.ts) and [hook-runtime.test.ts](../src/__tests__/generators/hook-runtime.test.ts).

All six repository fixtures were freshly generated and strictly compiled in plain and Zod modes: `allof-inher-union`, `auth-file-uploads`, `edge-case`, `image-conversion-schema-openapi`, `nested-dictmap-datetime` and `pag-nested`.

Final checks: `npm test -- --runInBand` passed 14 suites and 184 tests; `npm run lint` completed without warnings; clean TypeScript build passed. `npm pack --dry-run --json --cache ./test-output/audit-npm-cache` included the CLI, declarations and documentation in 129 files, with no test/helper files. A workspace cache was used because the default user npm cache was inaccessible in the sandbox. No package was published.

## Current contracts and compatibility

- JSON keys retain their wire spelling. Types/classes use PascalCase; methods/locals follow `namingConvention`. The [naming migration](NAMING_MIGRATION.md) specifies the future camelCase default with runtime conversion and preservation configuration.
- First-party hooks use `generateHooks`/`--hooks` and require clients. The legacy `react-hooks` plugin remains outside the built-in list.
- The `validation` plugin is an alias for Zod validation. Install Zod 4 in the consuming project; interface output cannot accept class-validator decorators. Do not enable both validation aliases or combine plugins that produce duplicate public exports.
- Client-only generation expects a compatible `types.ts` from a previous/types-only generation when endpoints reference named schemas. Use `--client --types` for a complete fresh output directory.
- `--watch` requires a local file. Snapshot a remote schema first. CLI configs support JSON and CommonJS JavaScript (`.js`/`.cjs`); TypeScript config execution is not implemented.
- Invalid references/collisions fail explicitly. External references are unsupported. `--fix` now reports that automatic schema repair is unimplemented.
- Custom type mappings change static types; they do not deserialize dates or perform arbitrary value conversion.
- Node 20+ is required by the installed Commander major version.

## Verification boundaries and follow-up work

Passing these tests establishes the covered contracts, not complete OpenAPI/JSON Schema conformance. The parser performs structural validation, not every dialect constraint. Advanced parameter encodings (`deepObject`, matrix/label styles and per-property form encoding), remote references and many OpenAPI 3.1 schema keywords need dedicated support and contract tests.

The hook harness tests dependency and stale-query behavior; a real mounted React application, StrictMode behavior, concurrent mutations/reset/unmount behavior and browser cancellation were not tested. Browser-managed cookies require normal credential handling; browsers may disallow manually setting Cookie headers.

Advanced plugins provide opt-in helpers. Deduplication, monitoring, branded validation and Zod client validation are not automatically connected to every generated endpoint. They need explicit consumer integration. Cache regex invalidation/custom key generation and some cache statistics remain incomplete; several other advanced plugin options describe prospective behavior rather than implemented behavior. Treat these helpers as experimental pending a separate runtime integration audit. Branded auth metadata is type-state metadata, not server authorization.

`generateQueries` has no generator, and legacy optional-chaining/nullish-coalescing configuration flags are not consistently applied to generated clients/hooks. These should receive explicit unsupported-option diagnostics or be implemented/deprecated in the next configuration cleanup. Plugin hook exceptions are currently logged by the plugin manager and may leave partial enhancements; strict error propagation and atomic output replacement need separate lifecycle changes.

No live external FastAPI service, browser app, release publication or CI run was exercised. This audit preserves unrelated pre-existing workspace changes and does not publish or commit the work.
