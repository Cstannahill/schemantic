import { DEFAULT_CONFIG, ResolvedSchemanticConfig, SchemanticOptions } from '../types/core';

const strings = ['schemaUrl', 'schemaFile', 'outputDir', 'outputFileName', 'typePrefix', 'typeSuffix'];
const booleans = ['generateTypes', 'generateApiClient', 'generateHooks', 'generateQueries', 'useStrictTypes',
  'useOptionalChaining', 'useNullishCoalescing', 'preserveComments', 'generateIndexFile'];
const arrays = ['excludePaths', 'includePaths', 'excludeSchemas', 'includeSchemas'];
const keys = new Set([...strings, ...booleans, ...arrays, 'schemaData', 'namingConvention', 'propertyNaming', 'customTypeMappings', 'plugins']);
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** One runtime contract shared by the CLI and programmatic entry point. */
export function resolveConfiguration(input: SchemanticOptions): ResolvedSchemanticConfig {
  if (!isObject(input)) throw new Error('Configuration must be an object');
  for (const [key, value] of Object.entries(input)) {
    if (!keys.has(key)) throw new Error(`Unknown configuration option: ${key}`);
    if (value === undefined) continue;
    if (strings.includes(key) && typeof value !== 'string') throw new Error(`${key} must be a string`);
    if (booleans.includes(key) && typeof value !== 'boolean') throw new Error(`${key} must be a boolean`);
    if (arrays.includes(key) && (!Array.isArray(value) || value.some(item => typeof item !== 'string'))) throw new Error(`${key} must be an array of strings`);
  }
  if (input.namingConvention !== undefined && !['camelCase', 'snake_case', 'PascalCase'].includes(input.namingConvention)) throw new Error('Invalid namingConvention');
  if (input.propertyNaming !== undefined && !['camelCase', 'preserve'].includes(input.propertyNaming)) throw new Error('Invalid propertyNaming; use camelCase or preserve');
  if (input.schemaData !== undefined && !isObject(input.schemaData)) throw new Error('schemaData must be an OpenAPI document object');
  if (input.customTypeMappings !== undefined && (!isObject(input.customTypeMappings) || Object.values(input.customTypeMappings).some(value => typeof value !== 'string'))) throw new Error('customTypeMappings must map strings to TypeScript type strings');
  if (input.plugins !== undefined) {
    if (!Array.isArray(input.plugins)) throw new Error('plugins must be an array');
    for (const plugin of input.plugins) {
      if (!isObject(plugin) || typeof plugin.name !== 'string' || !plugin.name.trim() || typeof plugin.enabled !== 'boolean') throw new Error('Each plugin requires a nonempty name and boolean enabled');
      if (plugin.options !== undefined && !isObject(plugin.options)) throw new Error(`Plugin ${plugin.name} options must be an object`);
      if (Object.keys(plugin).some(key => !['name', 'enabled', 'options'].includes(key))) throw new Error(`Unknown field in plugin ${plugin.name}`);
    }
  }
  if (input.generateQueries) throw new Error('generateQueries is not implemented; use generateHooks for plain React hooks');
  if (input.useOptionalChaining === false || input.useNullishCoalescing === false) throw new Error('Disabling optional chaining/nullish coalescing is unsupported; generated output targets modern TypeScript');
  const config = { ...DEFAULT_CONFIG, ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) } as ResolvedSchemanticConfig;
  if (!config.outputDir.trim()) throw new Error('outputDir must not be empty');
  if (config.generateHooks && !config.generateApiClient) throw new Error('React hooks require API client generation');
  return config;
}

/** Type-safe config authoring without requiring all resolved default fields. */
export function defineConfig(config: SchemanticOptions): SchemanticOptions {
  resolveConfiguration(config);
  return config;
}
