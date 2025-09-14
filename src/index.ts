/**
 * Main entry point for the sync-type package
 * Exports all public APIs and utilities
 */

// Core functionality
export * from "./core";

// Type definitions
export * from "./types";

// Parsers
export * from "./parsers";

// Generators
export * from "./generators";

// Plugins
export * from "./plugins";

// CLI exports
export * from "./cli/index";

// Hook factory generator (explicit re-exports)
export { HookGenerator } from "./generators/hook-generator";
export type { GeneratedHooksFile } from "./generators/hook-generator";

// Re-export commonly used types and utilities
export { TypeSync } from "./core/typesync";
export { TypeSyncConfig, DEFAULT_CONFIG } from "./types/core";
export { OpenAPISchema } from "./types/openapi";
export { TypeSyncPlugin } from "./types/core";
