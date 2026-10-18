# Advanced plugin development

Start with the [current plugin interface](PLUGIN_DEVELOPMENT.md). Advanced plugins use that same interface; there is no separate extension API for CLI commands, runtime transport interception, or arbitrary file-write hooks.

A generated runtime helper and a generator-process utility are different APIs. Helpers embedded in generated clients are imported from generated files. Public plugin factories/analysis utilities are imported from `schemantic`; do not instruct consumers to import blocked `schemantic/dist/...` paths.

## Design contracts

- Validation helpers must enforce their documented schema constraints and preserve input data when permissive mode is requested. A cast or shallow object check is not schema validation.
- Every emitted identifier/import/export must participate in the output graph. Shared declarations must be emitted once. Disabled features must not leave dangling imports/exports.
- Caching must include every response-affecting request field and explicit session scope. Custom identities need a collision/tenant policy; do not log secret header values.
- Runtime callbacks belong in factories/constructors. JSON config can carry serializable data only.
- Timing data must come from observed calls. Source length and synthetic dependency estimates are not real bundle sizes or measured application speedups.
- Lifecycle failures must fail generation before published output is replaced. Plugins should not write unrelated user files during hooks.

## Validation memoization

The public utility has a data-first signature:

```ts
import { memoizedValidation } from 'schemantic';
import { z } from 'zod';

const schema = z.object({ id: z.number().int() });
const value = memoizedValidation({ id: 1 }, schema);
console.log(value.id);
```

This utility runs in the process that calls it. It does not automatically validate generated endpoint responses or guarantee that generation-time schema memoization is bounded. Cache keys must include schema/version/input context; use the public clear/stat utilities according to their actual implementation.

## Acceptance evidence

Generate output with multiple schemas and feature switches, compile under strict bundler and NodeNext settings, then execute the generated helpers. Include invalid validator inputs, overlapping calls, tenant separation, expiry, and disabled helper imports. Keep empirical measurements separate from feature assertions. See [advanced capability boundaries](ADVANCED_PLUGINS_IMPLEMENTATION.md).
