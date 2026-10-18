# Audit remediation implementation plan

> **For agentic workers:** Use the systematic-debugging, test-driven-development and verification-before-completion skills. Independent plugin, CLI and schema work runs in parallel with explicitly bounded file ownership; integrate and review the complete generated contracts before completion.

**Goal:** Correct all reproduced audit defects and remove or explicitly diagnose incomplete feature promises, then implement the agreed safe naming migration.

**Architecture:** Keep the existing generator API, but centralize validated configuration, generated module/file assembly and schema naming/projections. Emit complete output in memory before an owned-file transaction; use schema metadata consistently for static types and runtime boundaries. Optional helpers remain explicit integrations unless a tested adapter is added.

**Tech stack:** TypeScript, Node 20+, fetch, plain React hooks, optional Zod 4, Jest consumer/runtime tests.

**Spec:** docs/REAUDIT.md and docs/NAMING_MIGRATION.md.

## Constraints and decisions

- Preserve previous authorized fixes and unrelated dirty workspace changes; do not reset, commit or publish.
- All generated relative imports use `.js` specifiers, compatible with TS module resolution for Node ESM and bundlers; distinguish type imports from runtime enums.
- Keep default output complete (types/client/index), React optional; public config allows omitted defaulted fields, internal config is validated/resolved.
- Unsupported features receive explicit diagnostics or are removed from documentation; prospective expansion recommendations are not a promise to build every adapter/OAuth/UI feature.
- CamelCase application properties must include schema-aware serialization/deserialization, with explicit preserve mode; never change static spelling alone.
- The user has authorized execution of the existing audit roadmap. Continue implementation without another plan approval gate.

## Review focus

- Multiple tenants or colliding request URLs must not share cache results.
- Case aliases, path ancestors and failed generation must not overwrite or partially replace existing output.
- Media/status/schema selection must agree between generated return types and actual runtime values.
- Async mutation completion, reset and unmount must not resurrect invalidated state.
- Config/plugin combinations and naming collisions must fail clearly, never silently omit work.

## Tasks

### 1. Optional plugin contracts (parallel owner: fix_plugins)

Files: src/plugins/request-deduplication.ts, branded-types.ts, zod-validation.ts, performance-monitoring.ts, builtin.ts, index.ts; new plugin-reaudit.test.ts.

- [x] Reproduce R01/R06/R16/R17/R18 with assertions against freshly generated runtime/consumer modules.
- [x] Fix canonical request identities/header scope, stale/invalidation/statistics/key callbacks.
- [x] Emit branded shared declarations once and implement honest guards/feature switches.
- [x] Correct Zod composition/constraints/permissive response behavior and ineffective exposed options.
- [x] Synchronize monitoring exports/options; append requested reports as GeneratedFile records before commit; expose supported helper APIs.
- [x] Run targeted Jest tests; integrate with full suite and re-audit plugin probes.

### 2. CLI, guides and release gates (parallel owner: fix_cli_docs)

Files: src/cli/index.ts, src/plugins/loader.ts, maintained guides, workflow YAML, publish scripts; new cli-reaudit.test.ts.

- [x] Assert protected init, interactive failure status/defaults, config/discovery/validate parity, plugin load/generate resolution.
- [x] Use shared resolveConfiguration(input): ResolvedSchemanticConfig; load plugins in the generation invocation.
- [x] Implement meaningful supported flags or reject/remove ineffective ones; correct all public examples.
- [x] Parse real npm pack sizes, add platform-sensitive CI and remove publishing scripts that mutate the working package name on failure.
- [x] Run source-level tests, then freshly built spawned CLI tests and compile guide examples during integration.

### 3. Schema/parser fidelity (parallel owner: fix_schema)

Files: schema-type.ts/object-generator.ts/primitive-generator.ts, parser sources and schema types; new schema-reaudit.test.ts.

Interface: schemaType sixth optional SchemaTypeOptions {direction?: 'request'|'response'; binary?: boolean; propertyName?: (wire: string) => string}, retaining fifth seen argument.

- [x] Assert R13 dialect patches/boolean/components-only support and truthful YAML behavior.
- [x] Fix heterogeneous dictionary modeling, allOf required-only and 3.1 reference sibling constraints.
- [x] Add direction/binary/property-name options propagated through recursive schema generation.
- [x] Compile valid and invalid consumer assignments; root integrates directional aliases/media handling.

### 4. Core configuration and safe output (root)

Files: src/core/configuration.ts, schemantic.ts, plugins/manager.ts, types/core.ts; new core-reaudit.test.ts.

- [x] Assert R02/R14/R15/R21: case/ancestor collisions, validation refs, plugin hook failures, stale owned outputs, custom imports and ergonomic config.
- [x] Separate optional input configuration from required resolved config; validate field types, supported flags and plugin entries.
- [x] Build GeneratedFile records in memory; run after-generation hooks before commit; validate destinations; stage/backup/rollback owned output and manifest.
- [x] Preserve arbitrary imports with type/value-aware module assembly; propagate plugin failures with names/hooks.
- [x] Verify failed generation leaves existing output unchanged and removes only stale manifest-owned files after success.

### 5. Client media/serialization/module contracts (root)

Files: api-client-generator.ts, core assembly, generated endpoint types; new client-reaudit.test.ts.

- [x] Assert R03/R05/R07–R12: auth casing, directional types, binary bytes, Path Item refs, schema-less/default/multiple/XML responses, object queries and strict/ESM compilers.
- [x] Use case-insensitive header helpers, direction-aware request/response aliases, media-aware decoding/types and default response fallback.
- [x] Serialize object queries by documented style/explode and diagnose unsupported encodings.
- [x] Emit type-only/runtime imports correctly, qualify global binary helpers, emit only used helpers and `.js` specifiers.
- [x] Run consumer compile and real local HTTP tests for outgoing bytes and incoming values.

### 6. Hook lifecycle (root)

Files: hook-generator.ts; new hook mutation tests alongside existing query tests.

- [x] Assert reversed results/errors, overlapping loading, pending reset and unmount suppression.
- [x] Implement latest-call state semantics and invalidation while retaining per-caller promise results.
- [x] Verify query stability remains intact; mount actual React tests if dependencies available, otherwise retain explicit boundary.

### 7. Naming migration (root, after core correctness)

Files: naming/schema conversion modules, shared config, generators and plugin integration; new naming runtime/consumer tests.

- [x] Assert both property modes, nested arrays/refs/dictionaries, optional/null, unions, collisions and immutable round trips.
- [x] Emit application and wire mappings plus schema-aware converters; expose converters for types-only users.
- [x] Connect request serialization/response deserialization and ensure validation/hooks follow the same names; preserve binary and enum values.
- [x] Enable camelCase default only with verified wire round trips and document preserve-mode compatibility.

### 8. Integration and completion

- [x] Run full Jest, build/lint, all fixture modes, consumer matrix, audit probes and package inspection.
- [x] Review the final changed contracts and audit-ID coverage with a fresh reviewer; correct material findings.
- [x] Record exact closed/remaining items in docs/REMEDIATION.md; never claim full closure based only on fixture compilation.

## Execution ledger

- Started 2026-10-10. Previous baseline: 184 tests; defects recorded in the re-audit. Parallel owners instructed not to clean/rebuild shared dist. Root coordinates full builds and integration.

- Integrated 2026-10-12: schema/client/plugin/CLI/hook fixes, camelCase HTTP boundaries, preservation mode, mounted React, independent review corrections. Fresh lockfile and scoped coverage-parser override audited clean. Final full and packaged-consumer gates in progress.

- Completed 2026-10-12: full build/lint/coverage gate 316 tests in22 suites; 36 fixture combinations and five strict consumer configurations; zero npm audit advisories; archive inspection and isolated installed CommonJS/ESM/CLI/HTTP consumer passed. Windows sharing locks retry with path rechecks and bounded backoff. No commit or publication performed; deliberate support limits recorded in docs/REMEDIATION.md.
