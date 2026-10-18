import { OpenAPISchema, OpenAPISchemaObject } from '../types/openapi';
import { ResolvedSchema, SchemaResolver } from '../types/schema';
import { projectSchema, referenceName } from './schema-type';

export type ProjectionNames = Record<string, { request?: string; response?: string; binary?: string }>;
const reference = (name: string) => '#/components/schemas/' + name.replace(/~/g, '~0').replace(/\//g, '~1');

/** Add named projections so clients, hooks and plugins consume the same schemas. */
export function addSchemaProjections(document: OpenAPISchema, resolver: SchemaResolver, selected?: Set<string>): ProjectionNames {
  const schemas = document.components?.schemas;
  const names: ProjectionNames = Object.create(null) as ProjectionNames;
  if (!schemas) return names;
  const originals = Object.entries(schemas);
  const contains = (schema: unknown, predicate: (value: OpenAPISchemaObject) => boolean, seen = new Set<string>()): boolean => {
    if (!schema || typeof schema !== 'object') return false;
    const value = schema as OpenAPISchemaObject;
    if (predicate(value)) return true;
    if (typeof value.$ref === 'string' && !seen.has(value.$ref)) {
      const next = new Set([...seen, value.$ref]);
      if (contains(resolver(value.$ref), predicate, next)) return true;
      seen = next;
    }
    return Object.values(value.properties || {}).some(child => contains(child, predicate, seen)) ||
      ['items', 'additionalProperties', 'not'].some(key => contains(value[key], predicate, seen)) ||
      [...(value.allOf || []), ...(value.oneOf || []), ...(value.anyOf || [])].some(child => contains(child, predicate, seen));
  };
  for (const [name, value] of originals) {
    if (selected && !selected.has(name)) continue;
    if (contains(value, node => node.readOnly === true || node.writeOnly === true)) names[name] = { request: name + 'Request', response: name + 'Response' };
    if (contains(value, node => node.format === 'binary')) names[name] = { ...names[name], binary: name + 'Binary' };
  }
  const binary = (schema: ResolvedSchema): ResolvedSchema => {
    const node = schema as OpenAPISchemaObject;
    if (node.format === 'binary') return { ...node, 'x-schemantic-binary': true };
    return { ...node,
      ...(node.properties && { properties: Object.fromEntries(Object.entries(node.properties).map(([key, value]) => [key, binary(value)])) }),
      ...(node.items && { items: binary(node.items) }),
      ...(typeof node.additionalProperties === 'object' && { additionalProperties: binary(node.additionalProperties) }),
      ...(node.allOf && { allOf: node.allOf.map(binary) }), ...(node.anyOf && { anyOf: node.anyOf.map(binary) }), ...(node.oneOf && { oneOf: node.oneOf.map(binary) }),
    };
  };
  for (const [name, value] of originals) {
    for (const [kind, target] of Object.entries(names[name] || {})) {
      if (target in schemas) throw new Error(`Projected schema name collision: ${name} produces ${target}, which already exists`);
      const projected = projectSchema(value, { direction: kind === 'response' ? 'response' : 'request' }, resolver, ref => {
        if (!/^#\/components\/schemas\/[^/]+$/.test(ref)) return ref;
        const original = referenceName(ref);
        const mapped = kind === 'binary' ? names[original]?.binary || names[original]?.request : names[original]?.[kind as 'request' | 'response'];
        return mapped ? reference(mapped) : ref;
      });
      schemas[target] = kind === 'binary' ? binary(projected) : projected;
      selected?.add(target);
    }
  }
  return names;
}
