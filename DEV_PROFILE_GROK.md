# Developer profile note

Local agent note from GROK run run5, 2026-09-22. Not part of this software. DEV_PROFILE_*.md is safe to gitignore.

- Slug: win-s-code-node-packages-schemantic
- Path: S:\Code\Node\Packages\schemantic
- Relation: standalone
- Provenance: original
- Classification: library
- Purpose: A published TypeScript generator that turns OpenAPI schemas, especially FastAPI, into types, a client, and hooks.
- Demonstrates: they package a codegen CLI for their own API style.
- Confidence: medium

## Stack

npm package `schemantic` version 0.3.0. Bin `schemantic`. Scripts: `tsc`, jest, eslint, `npm publish`. README says v0.2.0 and "production ready." Git: 55 commits, 84 TypeScript files, author share 1.0, first and last both 2025-10-18. Remote Cstannahill/schemantic. Tags include v0.1.0.

## Activity

One git day in October 2025. Recency recent.

## Evidence

- Files inspected: README through the install section, `package.json` name, bin, and scripts. Generator source was not opened.
- `codebase-knowledge-embedding` later stored a call graph of this package, so the package was ingested by another of their tools.

## Axes for the technologies this tree actually informs

- TypeScript: used, primary, working, context a published library
- OpenAPI / FastAPI: used, recurring, working, context the generator's stated input

## Contradictions

- README status says v0.2.0. package.json says 0.3.0.
