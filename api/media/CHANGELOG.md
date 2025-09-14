# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-09-13

### Added

- First-party React hooks generator with `createApiHooks(client)` factory, enabled via `--hooks` or `generateHooks: true`.
- Top-level exports for `HookGenerator` and `GeneratedHooksFile`.

### Changed

- Standardized generated client filename to `api-client.ts`; index now re-exports the client and hooks consistently.
- Improved naming normalization for types and client methods (sanitize invalid characters; PascalCase for type identifiers).

### Fixed

- Corrected index re-export path for CLI to avoid `.js` resolution type issues.
- Aligned generated hook call signatures with client method arity and parameter ordering.

### Added

- Initial release of Type-Sync
- OpenAPI 3.0+ schema parsing and validation
- TypeScript type generation from OpenAPI schemas
- API client generation with proper typing
- Extensible plugin system
- CLI interface with comprehensive options
- Built-in plugins for JSDoc, validation, React hooks, and strict mode
- Support for multiple naming conventions (camelCase, snake_case, PascalCase)
- Custom type mappings and schema transformations
- Path and schema filtering capabilities
- Comprehensive documentation and examples
- Full test coverage with Jest

### Features

- **Schema Parsing**: Parse OpenAPI schemas from URLs, files, or data objects
- **Type Generation**: Generate TypeScript interfaces, enums, and type aliases
- **API Client Generation**: Generate fully typed API client classes
- **Plugin System**: Extensible plugin architecture for custom functionality
- **CLI Interface**: Command-line interface with rich configuration options
- **Validation**: Built-in OpenAPI schema validation
- **Customization**: Flexible configuration for naming, filtering, and transformations
- **FastAPI Integration**: Optimized for FastAPI applications
- **React Support**: Generate React hooks and query builders
- **TypeScript Strict Mode**: Full TypeScript strict mode support

### Technical Details

- **Zero Dependencies**: No runtime dependencies on external libraries
- **Modular Architecture**: Clean separation of concerns with extensible design
- **Type Safety**: Comprehensive TypeScript types with no `any` usage
- **Performance**: Optimized for large schemas and complex APIs
- **Error Handling**: Graceful error handling with detailed error messages
- **Testing**: Comprehensive test suite with 100% coverage goals

## [1.0.0] - 2024-01-01

### Added

- Initial release
- Core functionality for OpenAPI schema parsing and TypeScript generation
- Plugin system architecture
- CLI interface
- Documentation and examples

### Changed

- N/A (initial release)

### Deprecated

- N/A (initial release)

### Removed

- N/A (initial release)

### Fixed

- N/A (initial release)

### Security

- N/A (initial release)
