import { OpenAPISchemaObject } from '../types/openapi';
import { ResolvedSchema, isOpenAPIRef } from '../types/schema';

export function propertyKey(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

export function typeName(name: string, prefix = '', suffix = ''): string {
  const formatted = name.replace(/[^A-Za-z0-9]+/g, '_').split('_').filter(Boolean)
    .map(token => token[0]!.toUpperCase() + token.slice(1)).join('') || 'Anonymous';
  let result = `${prefix}${formatted}${suffix}`.replace(/[^A-Za-z0-9_$]/g, '_');
  const reserved = new Set(['Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable',
    'Parameters', 'ConstructorParameters', 'ReturnType', 'InstanceType', 'Awaited', 'Array', 'ReadonlyArray',
    'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'ApiClientConfig', 'ApiClientError']);
  if (reserved.has(result)) result += 'Model';
  return /^\d/.test(result) ? `_${result}` : result;
}

export function referenceName(ref: string): string {
  return decodeURIComponent(ref.split('/').pop() || 'Unknown').replace(/~1/g, '/').replace(/~0/g, '~');
}

export interface SchemaTypeOptions {
  /** Explicit OpenAPI annotation policy: omit readOnly inputs and writeOnly outputs. */
  direction?: 'request' | 'response';
  /** Enable only for binary request media/parts; JSON encodings remain strings. */
  binary?: boolean;
  /** Application property names; required checks always use the original wire name. */
  propertyName?: (wireName: string) => string;
}

/** Binary media can carry raw string content; explicitly encoded content stays a string. */
export function isBinaryStringSchema(schema: OpenAPISchemaObject): boolean {
  return schema.format === 'binary' || (schema.type === 'string'
    && typeof schema.contentMediaType === 'string' && schema.contentMediaType.trim().length > 0
    && !schema.contentEncoding);
}

function excludedProperty(schema: ResolvedSchema, options: SchemaTypeOptions,
  resolver?: (ref: string) => ResolvedSchema | undefined, seen = new Set<string>()): boolean {
  const annotation = options.direction === 'request' ? 'readOnly' : options.direction === 'response' ? 'writeOnly' : undefined;
  if (!annotation) return false;
  if (annotation in schema && schema[annotation as keyof typeof schema] === true) return true;
  if (isOpenAPIRef(schema) && !seen.has(schema.$ref)) {
    const target = resolver?.(schema.$ref);
    if (target && excludedProperty(target, options, resolver, new Set([...seen, schema.$ref]))) return true;
  }
  const object = schema as OpenAPISchemaObject;
  return [...(object.allOf || []), ...(object.anyOf || []), ...(object.oneOf || [])]
    .some(branch => excludedProperty(branch, options, resolver, seen));
}

function directionalKeys(schema: ResolvedSchema, options: SchemaTypeOptions,
  resolver?: (ref: string) => ResolvedSchema | undefined, seen = new Set<string>()): Set<string> {
  const keys = new Set<string>();
  if (!options.direction) return keys;
  if (isOpenAPIRef(schema)) {
    if (!seen.has(schema.$ref)) {
      const target = resolver?.(schema.$ref);
      if (target) for (const key of directionalKeys(target, options, resolver, new Set([...seen, schema.$ref]))) keys.add(key);
    }
  }
  const object = schema as OpenAPISchemaObject;
  for (const [name, value] of Object.entries(object.properties || {})) {
    if (excludedProperty(value, options, resolver)) keys.add(name);
  }
  for (const branch of [...(object.allOf || []), ...(object.anyOf || []), ...(object.oneOf || [])]) {
    for (const key of directionalKeys(branch, options, resolver, seen)) keys.add(key);
  }
  return keys;
}

/** Build the same directional schema used by type emission for runtime validators.
 * Component references stay references: callers map them to the corresponding projected names.
 * This function preserves source schemas and wire names unless a property formatter is supplied.
 */
export function projectSchema(schema: ResolvedSchema | boolean, options: SchemaTypeOptions,
  resolver?: (ref: string) => ResolvedSchema | undefined,
  mapReference: (ref: string) => string = ref => ref): ResolvedSchema {
  const project = (value: ResolvedSchema, inheritedExcluded = new Set<string>()): ResolvedSchema => {
    const result = { ...value } as OpenAPISchemaObject & { $ref?: string };
    if (options.binary && isBinaryStringSchema(result)) result['x-schemantic-binary'] = true;
    const excluded = new Set([...inheritedExcluded, ...directionalKeys(value, options, resolver)]);
    if (isOpenAPIRef(value)) result.$ref = mapReference(value.$ref);
    if (result.properties) {
      const properties: Record<string, ResolvedSchema> = {};
      const names = new Map<string, string>();
      for (const [wireName, child] of Object.entries(result.properties)) {
        if (excludedProperty(child, options, resolver)) continue;
        const name = options.propertyName?.(wireName) ?? wireName;
        const existing = names.get(name);
        if (existing !== undefined && existing !== wireName) throw new Error(`Property naming collision: ${existing} and ${wireName} both become ${name}`);
        names.set(name, wireName);
        properties[name] = project(child);
      }
      result.properties = properties;
    }
    if (result.required) result.required = result.required.filter(name => !excluded.has(name))
      .map(name => options.propertyName?.(name) ?? name);
    if (result.items) result.items = project(result.items);
    if (typeof result.additionalProperties === 'object') result.additionalProperties = project(result.additionalProperties);
    if (result.allOf) result.allOf = result.allOf.map(branch => project(branch, excluded));
    if (result.anyOf) result.anyOf = result.anyOf.map(branch => project(branch));
    if (result.oneOf) result.oneOf = result.oneOf.map(branch => project(branch));
    for (const key of ['not', 'if', 'then', 'else'] as const) {
      if (result[key]) result[key] = project(result[key]!);
    }
    return result;
  };
  return typeof schema === 'boolean' ? schema ? {} : { not: {} } : project(schema);
}

/** One expression emitter keeps types and endpoint signatures consistent. */
export function schemaType(
  schema: ResolvedSchema | boolean,
  formatReference: (ref: string) => string,
  customMappings: Record<string, string> = {},
  resolveReference?: (ref: string) => ResolvedSchema | undefined,
  seen = new Set<string>(),
  options: SchemaTypeOptions = {},
): string {
  if (typeof schema === 'boolean') return schema ? 'unknown' : 'never';
  if ((schema as OpenAPISchemaObject)['x-schemantic-binary'] === true) return 'globalThis.Blob';
  if (isOpenAPIRef(schema)) {
    let reference: string;
    if (/^#\/components\/schemas\/[^/]+$/.test(schema.$ref)) reference = formatReference(schema.$ref);
    else {
      if (seen.has(schema.$ref)) throw new Error(`Circular inline schema reference: ${schema.$ref}`);
      const resolved = resolveReference?.(schema.$ref);
      if (resolved === undefined) throw new Error(`Unresolved schema reference: ${schema.$ref}`);
      reference = schemaType(resolved, formatReference, customMappings, resolveReference, new Set([...seen, schema.$ref]), options);
    }
    const siblings = { ...schema } as OpenAPISchemaObject;
    delete siblings.$ref;
    if (Object.keys(siblings).length) {
      const nullable = siblings.nullable;
      delete siblings.nullable;
      const excluded = directionalKeys(schema, options, resolveReference);
      if (siblings.required) siblings.required = siblings.required.filter(key => !excluded.has(key));
      const sibling = schemaType(siblings, formatReference, customMappings, resolveReference, seen, options);
      if (sibling !== 'unknown') reference = `(${reference}) & (${sibling})`;
      if (nullable) reference = `(${reference}) | null`;
    }
    return reference;
  }
  const render = (value: ResolvedSchema) => schemaType(value, formatReference, customMappings, resolveReference, seen, options);
  let result: string;
  if (schema.not && !isOpenAPIRef(schema.not) && Object.keys(schema.not).length === 0) result = 'never';
  else if (schema.const !== undefined) result = JSON.stringify(schema.const);
  else if (schema.enum?.length) result = schema.enum.map(value => JSON.stringify(value)).join(' | ');
  else {
    const parts: string[] = [];
    if (schema.oneOf?.length) parts.push(schema.oneOf.map(render).join(' | '));
    if (schema.anyOf?.length) parts.push(schema.anyOf.map(render).join(' | '));
    if (schema.allOf?.length) {
      const excluded = directionalKeys(schema, options, resolveReference);
      parts.push(...schema.allOf.map(branch => render(!isOpenAPIRef(branch) && branch.required
        ? { ...branch, required: branch.required.filter(key => !excluded.has(key)) } : branch)));
    }
    if (Array.isArray(schema.type)) {
      parts.push(schema.type.map(type => render({ ...schema, type, nullable: false,
        oneOf: [], anyOf: [], allOf: [] })).join(' | '));
    } else if (schema.type || schema.properties || schema.required?.length || schema.additionalProperties !== undefined) {
      const type = schema.type || 'object';
      if (type === 'array') {
        const item = schema.items ? render(schema.items) : 'unknown';
        parts.push(`${/[|&]/.test(item) ? `(${item})` : item}[]`);
      }
      else if (type === 'object') {
        const excluded = directionalKeys(schema, options, resolveReference);
        const required = (schema.required || []).filter(name => !excluded.has(name));
        const entries = Object.entries(schema.properties || {}).filter(([, value]) => !excludedProperty(value, options, resolveReference));
        const names = new Map<string, string>();
        const valueTypes: string[] = [];
        const fields = entries.map(([wireName, value]) => {
          const name = options.propertyName?.(wireName) ?? wireName;
          const existing = names.get(name);
          if (existing !== undefined && existing !== wireName) throw new Error(`Property naming collision: ${existing} and ${wireName} both become ${name}`);
          names.set(name, wireName);
          const valueType = render(value);
          valueTypes.push(valueType);
          if (!required.includes(wireName)) valueTypes.push('undefined');
          return `${propertyKey(name)}${required.includes(wireName) ? '' : '?'}: ${valueType}${required.includes(wireName) ? '' : ' | undefined'};`;
        });
        for (const name of required.filter(name => !(name in (schema.properties || {})))) {
          fields.push(`${propertyKey(options.propertyName?.(name) ?? name)}: unknown;`);
          valueTypes.push('unknown');
        }
        if (fields.length) {
          let object = `{ ${fields.join(' ')} }`;
          if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
            // TypeScript cannot exclude finite declared keys from a string index signature.
            // Widen its values to include declared fields, retaining their precise member types.
            const indexTypes = [...new Set([render(schema.additionalProperties), ...valueTypes])];
            object += ` & Record<string, ${indexTypes.includes('unknown') ? 'unknown' : indexTypes.join(' | ')}>`;
          } else if (schema.additionalProperties === true) object += ' & Record<string, unknown>';
          parts.push(object);
        } else if (schema.additionalProperties === false) parts.push('Record<string, never>');
        else parts.push(`Record<string, ${typeof schema.additionalProperties === 'object' ? render(schema.additionalProperties) : 'unknown'}>`);
      } else {
        const basic: Record<string, string> = { string: 'string', integer: 'number', number: 'number', boolean: 'boolean', null: 'null' };
        parts.push((type !== 'null' && schema.format && customMappings[schema.format]) || customMappings[type]
          || (type === 'string' && isBinaryStringSchema(schema) && options.binary ? 'Blob' : basic[type]) || 'unknown');
      }
    }
    result = parts.length ? parts.map(part => parts.length > 1 && part.includes(' | ') ? `(${part})` : part).join(' & ') : 'unknown';
  }
  if ((schema as OpenAPISchemaObject).nullable) result = `${result} | null`;
  return result;
}
