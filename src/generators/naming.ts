import * as path from 'path';
import { GenerationContext, GeneratedFile } from '../types/core';
import { OpenAPISchema, OpenAPISchemaObject } from '../types/openapi';
import { typeName } from './schema-type';

export type PropertyNaming = 'camelCase' | 'preserve';

// Emit literal source rather than Function.toString(), which can contain coverage instrumentation.
const propertyFormatterBody = String.raw`
  if (mode === 'preserve') return wireName;
  const tokens = wireName.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
  const result = tokens.map((token, index) => {
    const normalized = token.toLowerCase();
    return index ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : normalized;
  }).join('') || 'property';
  return /^\d/.test(result) ? '_' + result : result;
`;
const formatProperty = new Function('wireName', 'mode', propertyFormatterBody) as (wireName: string, mode: PropertyNaming) => string;

/** One formatter is shared by schema declarations and generated boundary conversion. */
export function propertyName(wireName: string, mode: PropertyNaming = 'camelCase'): string {
  return formatProperty(wireName, mode);
}

function resolvePointer(document: unknown, ref: string): unknown {
  if (!ref.startsWith('#/')) return undefined;
  let value: unknown = document;
  for (const token of ref.slice(2).split('/')) {
    const key = decodeURIComponent(token).replace(/~1/g, '/').replace(/~0/g, '~');
    if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function renamePointer(ref: string, mode: PropertyNaming): string {
  if (!ref.startsWith('#/')) return ref;
  const tokens = ref.slice(2).split('/').map(token => decodeURIComponent(token).replace(/~1/g, '/').replace(/~0/g, '~'));
  return '#/' + tokens.map((token, index) => {
    const name = index && tokens[index - 1] === 'properties' ? propertyName(token, mode) : token;
    return encodeURIComponent(name.replace(/~/g, '~0').replace(/\//g, '~1'));
  }).join('/');
}

/** Rename only Schema Object declarations, leaving wire parameters and payload examples intact. */
export function renameSchemaProperties(schema: OpenAPISchema, mode: PropertyNaming): OpenAPISchema {
  const result = structuredClone(schema);
  if (mode === 'preserve') return result;
  const assertNames = (value: unknown, location: string, names = new Map<string, string>(), refs = new Set<string>()): void => {
    if (!value || typeof value !== 'object') return;
    const object = value as OpenAPISchemaObject;
    if (typeof object.$ref === 'string' && !refs.has(object.$ref)) {
      assertNames(resolvePointer(schema, object.$ref), location, names, new Set([...refs, object.$ref]));
    }
    for (const wireName of Object.keys(object.properties || {})) {
      const applicationName = propertyName(wireName, mode);
      const previous = names.get(applicationName);
      if (previous !== undefined && previous !== wireName) throw new Error(
        `Property naming collision at ${location}: ${previous} and ${wireName} both become ${applicationName}`);
      names.set(applicationName, wireName);
    }
    for (const branch of object.allOf || []) assertNames(branch, location, names, refs);
    // Alternatives remain distinct, but each inherits the enclosing object's declared fields.
    for (const branch of [...(object.anyOf || []), ...(object.oneOf || [])]) assertNames(branch, location, new Map(names), refs);
  };
  const rename = (value: unknown, location: string): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const object = value as OpenAPISchemaObject;
    assertNames(object, location);
    if (typeof object.$ref === 'string') object.$ref = renamePointer(object.$ref, mode);
    if (object.properties) object.properties = Object.fromEntries(Object.entries(object.properties)
      .map(([name, child]) => [propertyName(name, mode), rename(child, `${location}.properties.${name}`)])) as NonNullable<OpenAPISchemaObject['properties']>;
    if (object.required) object.required = object.required.map(name => propertyName(name, mode));
    if (object.discriminator) {
      object.discriminator.propertyName = propertyName(object.discriminator.propertyName, mode);
      if (object.discriminator.mapping) object.discriminator.mapping = Object.fromEntries(Object.entries(object.discriminator.mapping)
        .map(([name, ref]) => [name, renamePointer(ref, mode)]));
    }
    for (const keyword of ['items', 'additionalProperties', 'not', 'if', 'then', 'else', 'contains', 'propertyNames', 'unevaluatedProperties', 'unevaluatedItems']) {
      if (object[keyword] && typeof object[keyword] === 'object') object[keyword] = rename(object[keyword], `${location}.${keyword}`);
    }
    for (const keyword of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
      if (Array.isArray(object[keyword])) object[keyword] = (object[keyword] as unknown[]).map((child, index) => rename(child, `${location}.${keyword}[${index}]`));
    }
    for (const keyword of ['$defs', 'definitions', 'patternProperties', 'dependentSchemas']) {
      if (object[keyword] && typeof object[keyword] === 'object') object[keyword] = Object.fromEntries(Object.entries(object[keyword] as Record<string, unknown>)
        .map(([name, child]) => [name, rename(child, `${location}.${keyword}.${name}`)]));
    }
    return object;
  };
  const visit = (value: unknown, location: string): void => {
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    for (const [name, child] of Object.entries(object)) {
      const childLocation = location ? `${location}.${name}` : name;
      if (name === 'schema') object[name] = rename(child, childLocation);
      else if (name === 'schemas' && child && typeof child === 'object') object[name] = Object.fromEntries(Object.entries(child)
        .map(([key, entry]) => [key, rename(entry, `${childLocation}.${key}`)]));
      else if (!['example', 'examples', 'default', 'enum', 'const'].includes(name)) visit(child, childLocation);
    }
  };
  visit(result, '');
  return result;
}

// The interpreter is self-contained in generated packages and has no runtime library dependency.
const conversionRuntime = String.raw`
type SchemaRecord = Record<string, unknown>;
function record(value: unknown): value is SchemaRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === null || (Object.getPrototypeOf(prototype) === null
    && Object.prototype.toString.call(value) === '[object Object]');
}
function resolveSchema(ref: string): unknown {
  if (!ref.startsWith('#/')) throw new Error('Unsupported conversion schema reference: ' + ref);
  let value: unknown = wireDocument;
  for (const token of ref.slice(2).split('/')) {
    const key = decodeURIComponent(token).replace(/~1/g, '/').replace(/~0/g, '~');
    if (!record(value) || !Object.prototype.hasOwnProperty.call(value, key)) throw new Error('Unresolved conversion schema reference: ' + ref);
    value = value[key];
  }
  return value;
}
function sourceName(wireName: string, encode: boolean): string { return encode ? appName(wireName) : wireName; }
function matches(value: unknown, schema: unknown, encode: boolean, refs = new Set<string>()): boolean {
  if (schema === false) return false;
  if (!record(schema)) return true;
  if (typeof schema.$ref === 'string' && !refs.has(schema.$ref)
    && !matches(value, resolveSchema(schema.$ref), encode, new Set([...refs, schema.$ref]))) return false;
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) return false;
  if (Array.isArray(schema.enum) && !schema.enum.some(entry => JSON.stringify(value) === JSON.stringify(entry))) return false;
  if (value === null && schema.nullable === true) return true;
  const typeMatches = (type: unknown): boolean => type === 'null' ? value === null : type === 'object' ? record(value)
    : type === 'array' ? Array.isArray(value) : type === 'integer' ? typeof value === 'number' && Number.isInteger(value)
    : type === 'number' ? typeof value === 'number' : type === 'string' ? schema['x-schemantic-binary'] === true
      ? /\[object (?:Blob|File)\]/.test(Object.prototype.toString.call(value)) : typeof value === 'string'
    : type === 'boolean' ? typeof value === 'boolean' : true;
  if (Array.isArray(schema.type) ? !schema.type.some(typeMatches) : schema.type && !typeMatches(schema.type)) return false;
  if (Array.isArray(schema.allOf) && !schema.allOf.every(branch => matches(value, branch, encode, refs))) return false;
  for (const keyword of ['oneOf', 'anyOf']) if (Array.isArray(schema[keyword])
    && !(schema[keyword] as unknown[]).some(branch => matches(value, branch, encode, refs))) return false;
  if (record(value)) {
    if (Array.isArray(schema.required) && schema.required.some(name => typeof name === 'string'
      && !Object.prototype.hasOwnProperty.call(value, sourceName(name, encode)))) return false;
    if (record(schema.properties)) for (const [name, child] of Object.entries(schema.properties)) {
      const key = sourceName(name, encode);
      if (Object.prototype.hasOwnProperty.call(value, key) && !matches(value[key], child, encode, refs)) return false;
    }
  }
  return true;
}
function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, index) => sameValue(value, right[index]));
  if (!record(left) || !record(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.prototype.hasOwnProperty.call(right, key) && sameValue(left[key], right[key]));
}
function structuralScore(value: unknown, schema: unknown, encode: boolean, refs = new Set<string>()): number {
  if (!record(value) || !record(schema)) return 0;
  let score = 0;
  if (typeof schema.$ref === 'string' && !refs.has(schema.$ref)) score += structuralScore(value, resolveSchema(schema.$ref), encode, new Set([...refs, schema.$ref]));
  if (record(schema.properties)) score += Object.keys(schema.properties).filter(name => Object.prototype.hasOwnProperty.call(value, sourceName(name, encode))).length;
  if (Array.isArray(schema.allOf)) score += schema.allOf.reduce<number>((sum, branch) => sum + structuralScore(value, branch, encode, refs), 0);
  return score;
}
function chooseUnion(value: unknown, schema: SchemaRecord, branches: unknown[], encode: boolean): unknown {
  if (record(value) && record(schema.discriminator) && typeof schema.discriminator.propertyName === 'string') {
    const discriminator = value[sourceName(schema.discriminator.propertyName, encode)];
    if (typeof discriminator === 'string' && record(schema.discriminator.mapping)) {
      const ref = schema.discriminator.mapping[discriminator];
      if (typeof ref === 'string') {
        const document = record(wireDocument) ? wireDocument : {};
        const components = record(document.components) ? document.components : {};
        const definitions = record(components.schemas) ? components.schemas : {};
        const target = !ref.startsWith('#/') && Object.prototype.hasOwnProperty.call(definitions, ref)
          ? '#/components/schemas/' + encodeURIComponent(ref.replace(/~/g, '~0').replace(/\//g, '~1')) : ref;
        const branch = branches.find(candidate => record(candidate) && candidate.$ref === target);
        if (branch !== undefined) return branch;
        return { $ref: target };
      }
    }
  }
  const matching = branches.filter(branch => matches(value, branch, encode));
  if (!matching.length) throw new Error('No union variant matches the payload for schema-aware conversion');
  const scores = matching.map(branch => structuralScore(value, branch, encode));
  const maximum = Math.max(...scores);
  const candidates = matching.filter((_, index) => scores[index] === maximum);
  if (candidates.length === 1) return candidates[0];
  const converted = candidates.map(branch => convert(value, branch, encode, new WeakSet<object>()));
  if (converted.every(result => sameValue(result, converted[0]))) return candidates[0];
  throw new Error('Ambiguous union conversion: multiple matching variants rename the payload differently; provide a discriminator');
}
function schemaNodes(schema: unknown, value: unknown, encode: boolean, refs = new Set<string>()): SchemaRecord[] {
  if (schema === false) throw new Error('Cannot convert a value against a false schema');
  if (!record(schema)) return [];
  const nodes: SchemaRecord[] = [schema];
  if (typeof schema.$ref === 'string') {
    if (refs.has(schema.$ref)) throw new Error('Circular alias schema reference in conversion: ' + schema.$ref);
    nodes.push(...schemaNodes(resolveSchema(schema.$ref), value, encode, new Set([...refs, schema.$ref])));
  }
  if (Array.isArray(schema.allOf)) for (const branch of schema.allOf) nodes.push(...schemaNodes(branch, value, encode, refs));
  for (const keyword of ['oneOf', 'anyOf']) if (Array.isArray(schema[keyword])) nodes.push(...schemaNodes(chooseUnion(value, schema, schema[keyword] as unknown[], encode), value, encode, refs));
  return nodes;
}
function convert(value: unknown, schema: unknown, encode: boolean, active: WeakSet<object>): unknown {
  if (value === null || value === undefined || (!Array.isArray(value) && !record(value))) return value;
  if (active.has(value)) throw new Error('Cyclic payload is unsupported by schema-aware conversion');
  active.add(value);
  try {
    const nodes = schemaNodes(schema, value, encode);
    if (Array.isArray(value)) {
      const items = nodes.filter(node => node.items !== undefined).map(node => node.items);
      return items.length ? value.map(item => convert(item, { allOf: items }, encode, active)) : value.slice();
    }
    const properties = new Map<string, { wireName: string; schemas: unknown[] }>();
    const names = new Map<string, string>();
    const additional: unknown[] = [];
    for (const node of nodes) {
      if (record(node.properties)) for (const [wireName, child] of Object.entries(node.properties)) {
        const applicationName = appName(wireName);
        const previous = names.get(applicationName);
        if (previous !== undefined && previous !== wireName) throw new Error('Property naming collision in conversion: ' + previous + ' and ' + wireName);
        names.set(applicationName, wireName);
        const key = sourceName(wireName, encode);
        const existing = properties.get(key);
        if (existing) existing.schemas.push(child); else properties.set(key, { wireName, schemas: [child] });
      }
      if (record(node.additionalProperties)) additional.push(node.additionalProperties);
    }
    const result: SchemaRecord = {};
    for (const [key, entry] of Object.entries(value)) {
      const declared = properties.get(key);
      const target = declared ? encode ? declared.wireName : appName(declared.wireName) : key;
      if (Object.prototype.hasOwnProperty.call(result, target)) throw new Error('Payload key collision during conversion: ' + key + ' becomes ' + target);
      const converted = declared ? convert(entry, { allOf: declared.schemas }, encode, active)
        : additional.length ? convert(entry, { allOf: additional }, encode, active) : entry;
      Object.defineProperty(result, target, { value: converted, enumerable: true, writable: true, configurable: true });
    }
    return result;
  } finally { active.delete(value); }
}
export function serializeValue(value: unknown, schema: unknown): unknown {
  return preserveNames ? value : convert(value, schema, true, new WeakSet<object>());
}
export function deserializeValue(value: unknown, schema: unknown): unknown {
  return preserveNames ? value : convert(value, schema, false, new WeakSet<object>());
}
`;

/** Emit portable converters using the original wire registry, including local pointer references. */
export function generateConversionFile(context: GenerationContext, wireSchema: OpenAPISchema): GeneratedFile {
  const mode = context.config.propertyNaming ?? 'camelCase';
  renameSchemaProperties(wireSchema, mode); // Validate naming collisions before producing output.
  const names = Object.keys(wireSchema.components?.schemas || {}).map(name => ({ wireName: name,
    name: typeName(name, context.config.typePrefix, context.config.typeSuffix) }))
    .filter(entry => context.generatedTypes.has(entry.name) || context.typeRegistry.getType(entry.name));
  const exports = new Set(['serializeValue', 'deserializeValue']);
  for (const entry of names) for (const prefix of ['serialize', 'deserialize']) {
    const name = prefix + entry.name;
    if (exports.has(name)) throw new Error('Conversion export naming collision: ' + name);
    exports.add(name);
  }
  const imports = names.length ? "import type * as SchemaTypes from './types.js';\n\n" : '';
  let content = imports + '// Schema-aware wire conversion. This converts names; it does not validate payloads.\n'
    + 'const wireDocument: unknown = JSON.parse(' + JSON.stringify(JSON.stringify(wireSchema)) + ');\n'
    + 'const preserveNames: boolean = ' + String(mode === 'preserve') + ';\n'
    + "const appName = (wireName: string, mode: 'camelCase' | 'preserve' = 'camelCase'): string => {\n" + propertyFormatterBody + '};\n'
    + conversionRuntime;
  for (const entry of names) {
    const ref = '#/components/schemas/' + encodeURIComponent(entry.wireName.replace(/~/g, '~0').replace(/\//g, '~1'));
    const literal = JSON.stringify({ $ref: ref });
    content += '\nexport function serialize' + entry.name + '(value: SchemaTypes.' + entry.name + '): unknown {\n'
      + '  return serializeValue(value, ' + literal + ');\n}\n'
      + 'export function deserialize' + entry.name + '(value: unknown): SchemaTypes.' + entry.name + ' {\n'
      + '  return deserializeValue(value, ' + literal + ') as SchemaTypes.' + entry.name + ';\n}\n';
  }
  return { path: path.join(context.config.outputDir, 'conversion.ts'), content, type: 'type',
    dependencies: names.length ? ['./types.js'] : [], size: Buffer.byteLength(content, 'utf8') };
}
