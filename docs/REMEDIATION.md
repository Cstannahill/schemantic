# Audit remediation

Working-tree implementation completed on 2026-10-12. This closes the reproduced findings R01–R24 in [the re-audit](REAUDIT.md), through corrected implementations or explicit retirement of unsupported contracts. The audit remains a historical snapshot. No package has been published.

## Naming and compatibility

Application properties default to camelCase. Generated clients serialize declared JSON/form fields to their original wire names and deserialize JSON responses to application names. This includes nested objects, references, arrays, dictionaries and directional unions. Dictionary keys, unknown fields, enum values and binary objects retain their meaning. Types-only output includes conversion helpers.

Set `propertyNaming: "preserve"` for the previous payload-shaped contract. Preservation mode omits the conversion module. Classes, interfaces, aliases and enum names use PascalCase; method/parameter naming retains the separate `namingConvention` compatibility setting. Conflicting generic utility/client type names receive a `Model` suffix; public export/property collisions fail explicitly. See [naming migration](NAMING_MIGRATION.md).

## Finding closure

| Finding | Resolution | Regression evidence |
| --- | --- | --- |
| R01 cache identity | Full canonical identities include headers/context; unsafe cyclic values bypass caching. No truncated hash or crypto-js dependency. | `plugin-reaudit.test.ts`, request deduplication suite |
| R02 output collisions | Portable case/ancestor/reserved-name preflight runs before replacing files. | Core and writer re-audit suites |
| R03 auth casing | Header setters/removers and bearer helpers use case-insensitive Headers behavior. | Client local HTTP assertions |
| R04 mutation lifecycle | Latest-call state; reset, unmount and client changes invalidate publication while each caller keeps its result. | Hook harness and 11 mounted React tests |
| R05 direction | Named/inline request and response projections omit readOnly/writeOnly fields, including recursive references and composition. Conversion uses the same directional wire schemas. | Client consumer assignments and union round trips |
| R06 branding | Shared AuthState emitted once; schema-backed Zod guards/assertions and feature switches; recursive/primitive brands and complete exports. | Branded/plugin runtime and compile tests |
| R07 binary uploads | Raw/multipart Blob inputs, binary component projections, repeated parts and supplied FormData; nested directional and structural binary unions work. | Actual HTTP bytes/boundaries plus compiler checks |
| R08 Path Item refs | Resolve operations/parameters before extraction; unresolved and circular references fail. | Path Item regression and reference validation |
| R09 unspecified bodies | Schema-less/default/range responses retain media-appropriate bodies; genuine empty responses stay empty. Schema-less request bodies also remain callable. | HTTP binary/default/unspecified-body tests |
| R10 media alternatives | Successful media alternatives form unions; actual text/XML/JSON/binary decoding agrees with supported metadata. Wildcard response media is conservatively unknown. | Negative/positive consumer assignments and HTTP values |
| R11 parameter serialization | Form/explode objects, repeated arrays, flat deepObject, space/pipe arrays and simple path/header values. Unsupported styles, complex cookies, content encoding and per-property request encoding fail explicitly. | Local HTTP query/header checks and diagnostics |
| R12 consumer modules | Type-only imports, .js specifiers, conditional helpers and safe global aliases; utility/alias/export collisions handled. Browser and Node type environments compile. | CommonJS, bundler/verbatim, NodeNext, unused and Node-without-DOM matrix |
| R13 dialect contract | Compatible 3.0.x/3.1.x patches, 3.1 boolean/component-only schemas and typed component-only input; precise JSON/local-reference scope. YAML capability retired with an actionable diagnostic. | Parser/schema/core re-audit suites |
| R14 output lifecycle | Validate reports missing refs; required plugin failures fail generation. Files/report hooks assemble before staged commit; rollback and manifest-based stale removal; same-process writes queued. | Core plus 19 filesystem regressions |
| R15 plugin imports | Preserve arbitrary import declarations and dependency ordering, including multiline/type imports. | Custom plugin consumer compilation |
| R16 validation | allOf openness, oneOf exclusivity, composition/ref siblings, array/exclusive/enum/dictionary constraints and permissive response return semantics corrected. Explicit closed-object rules survive Zod intersections. | Fresh generated runtime and strict compile tests, including Zod 4.6.6 |
| R17 cache policies | Endpoint stale/TTL policy, regex invalidation, undefined results, counters and runtime key callbacks work. | Controlled-clock/cache regressions |
| R18 monitoring | Options/exports synchronized; bounded metrics/TTL and generated report artifacts; helper APIs exported. Report artifacts participate in the output transaction. | Plugin runtime, report and compile tests |
| R19 init overwrite | Protect existing config; explicit --force replacement. | CLI re-audit suite |
| R20 interactive behavior | Displayed defaults and failed exit statuses agree with execution. | Mocked input plus spawned CLI contracts |
| R21 configuration | Shared runtime validation, omitted defaults via SchemanticOptions/defineConfig, client-complete output and explicit unsupported-setting errors. | Core/CLI config and consumer tests |
| R22 plugin loading | Load builtin/file/package plugins in the generation invocation; config-relative resolution and hook validation. | Same-process local/package plugin fixtures |
| R23 guides/flags | Maintained examples compile; aliases/hooks/signatures/defaults and implemented templates/verbosity reflect actual APIs. Ineffective promises removed or diagnosed. | Compile every maintained TS/TSX guide example |
| R24 release gates | Numeric pack/content assertions, installed-package consumer checks, Node/OS CI matrix and tag/version check. Removed name-mutating publish scripts; security dependencies refreshed. | Local pack/consumer validation; workflow source checks |

## Verification

The final gate includes the complete Jest suite with coverage, fresh TypeScript build, ESLint, all six repository schemas in plain/Zod/hooks modes under both naming modes, and strict consumer module configurations. Separate tests use a local HTTP server for serialization/media/binary bytes and real React/test-renderer for lifecycle behavior. Exact totals and archive observations are recorded with the completion result and local evidence in `test-output/reaudit-core/evidence.json` and `test-output/reaudit-package/`.

Final results: **316 tests in 22 suites passed**, with 82.25% statement and 83.96% line coverage. Build and lint passed. **36 fixture combinations** and all five consumer compiler configurations passed. The packed archive excludes tests/dependencies and meets the numeric size guards. An isolated installed consumer passed CommonJS/ESM imports, strict NodeNext compilation, camelCase HTTP round trips and CLI generation. The Windows watch test passed after bounded sharing-lock retries; transient/permanent locks and retry-time link substitution have separate regressions. Hosted CI execution and publication remain unverified/not performed.

The dependency lockfile was refreshed within compatible major versions. Axios has a safe minimum version. A scoped `@istanbuljs/load-nyc-config` → `js-yaml` 4 override removes its obsolete parser dependency; the loader's actual `load()` API and a YAML coverage configuration were verified, along with coverage execution. Full npm audit reports zero advisories for this lockfile. Re-check the scoped override when updating coverage tooling.

Independent review reproduced and corrected additional directional union, nested binary, utility/import alias, referenced-cookie and composition-validator gaps. The final structural multipart union probe reaches fetch with intact Blob contents. CodeQL uses the canonical JavaScript/TypeScript identifier and explicit scan-upload permissions from [GitHub's workflow guidance](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/some-languages-not-analyzed).

## Deliberate support limits

- YAML and external-file/remote references are explicitly unsupported. Advanced JSON Schema keywords outside the documented generator/validator subset are not a complete JSON Schema implementation.
- `generateQueries: true` and the retired `strict-mode` plugin fail explicitly. Plain React hooks are implemented; TanStack adapters are future product work.
- Validation, deduplication and monitoring plugins emit explicit helper integrations. Enabling a plugin does not automatically wrap every HTTP operation. Branded/validation output requires consuming projects to install Zod 4.
- Matrix/label paths, nested parameter encodings, complex cookies, wildcard request media and custom per-property form encodings require a future adapter. Caller-provided FormData preserves wire keys. Browser fetch cookie/header rules still apply.
- Active generated filenames are replaced on regeneration. Stale files are deleted only when manifest-owned and unchanged; modified stale files and unrelated files remain. Rollback is attempted for ordinary commit failures, with incomplete restoration reported. Queuing is within one process; cross-process writers, hard power-loss recovery and adversarial check/syscall races are outside the guarantee.
- Mounted React verification uses the test renderer, not a browser DOM. Local execution was on Windows/Node 25; hosted Node 20/22/24 and Linux/macOS jobs are configured but were not run here.
- Publishing a naming migration release, a separate name-mapping report, richer response/error envelopes, drift-check commands, automatic middleware adapters, callbacks/webhooks and OAuth login orchestration remain prospective features, not claimed completed functionality.
