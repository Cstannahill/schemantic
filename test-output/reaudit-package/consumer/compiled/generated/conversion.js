// Schema-aware wire conversion. This converts names; it does not validate payloads.
const wireDocument = JSON.parse("{\"openapi\":\"3.1.2\",\"info\":{\"title\":\"Consumer API\",\"version\":\"1\"},\"components\":{\"schemas\":{\"User\":{\"type\":\"object\",\"required\":[\"user_id\",\"display_name\"],\"properties\":{\"user_id\":{\"type\":\"string\"},\"display_name\":{\"type\":\"string\"}}}}},\"paths\":{\"/users/{user_id}\":{\"get\":{\"operationId\":\"getUser\",\"parameters\":[{\"name\":\"user_id\",\"in\":\"path\",\"required\":true,\"schema\":{\"type\":\"string\"}}],\"responses\":{\"200\":{\"description\":\"User\",\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"#/components/schemas/User\"}}}}}}},\"/users\":{\"post\":{\"operationId\":\"saveUser\",\"requestBody\":{\"required\":true,\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"#/components/schemas/User\"}}}},\"responses\":{\"200\":{\"description\":\"User\",\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"#/components/schemas/User\"}}}}}}}}}");
const preserveNames = false;
const appName = (wireName, mode = 'camelCase') => {
    if (mode === 'preserve')
        return wireName;
    const tokens = wireName.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
    const result = tokens.map((token, index) => {
        const normalized = token.toLowerCase();
        return index ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : normalized;
    }).join('') || 'property';
    return /^\d/.test(result) ? '_' + result : result;
};
function record(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || (Object.getPrototypeOf(prototype) === null
        && Object.prototype.toString.call(value) === '[object Object]');
}
function resolveSchema(ref) {
    if (!ref.startsWith('#/'))
        throw new Error('Unsupported conversion schema reference: ' + ref);
    let value = wireDocument;
    for (const token of ref.slice(2).split('/')) {
        const key = decodeURIComponent(token).replace(/~1/g, '/').replace(/~0/g, '~');
        if (!record(value) || !Object.prototype.hasOwnProperty.call(value, key))
            throw new Error('Unresolved conversion schema reference: ' + ref);
        value = value[key];
    }
    return value;
}
function sourceName(wireName, encode) { return encode ? appName(wireName) : wireName; }
function matches(value, schema, encode, refs = new Set()) {
    if (schema === false)
        return false;
    if (!record(schema))
        return true;
    if (typeof schema.$ref === 'string' && !refs.has(schema.$ref)
        && !matches(value, resolveSchema(schema.$ref), encode, new Set([...refs, schema.$ref])))
        return false;
    if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const))
        return false;
    if (Array.isArray(schema.enum) && !schema.enum.some(entry => JSON.stringify(value) === JSON.stringify(entry)))
        return false;
    if (value === null && schema.nullable === true)
        return true;
    const typeMatches = (type) => type === 'null' ? value === null : type === 'object' ? record(value)
        : type === 'array' ? Array.isArray(value) : type === 'integer' ? typeof value === 'number' && Number.isInteger(value)
            : type === 'number' ? typeof value === 'number' : type === 'string' ? schema['x-schemantic-binary'] === true
                ? /\[object (?:Blob|File)\]/.test(Object.prototype.toString.call(value)) : typeof value === 'string'
                : type === 'boolean' ? typeof value === 'boolean' : true;
    if (Array.isArray(schema.type) ? !schema.type.some(typeMatches) : schema.type && !typeMatches(schema.type))
        return false;
    if (Array.isArray(schema.allOf) && !schema.allOf.every(branch => matches(value, branch, encode, refs)))
        return false;
    for (const keyword of ['oneOf', 'anyOf'])
        if (Array.isArray(schema[keyword])
            && !schema[keyword].some(branch => matches(value, branch, encode, refs)))
            return false;
    if (record(value)) {
        if (Array.isArray(schema.required) && schema.required.some(name => typeof name === 'string'
            && !Object.prototype.hasOwnProperty.call(value, sourceName(name, encode))))
            return false;
        if (record(schema.properties))
            for (const [name, child] of Object.entries(schema.properties)) {
                const key = sourceName(name, encode);
                if (Object.prototype.hasOwnProperty.call(value, key) && !matches(value[key], child, encode, refs))
                    return false;
            }
    }
    return true;
}
function sameValue(left, right) {
    if (Object.is(left, right))
        return true;
    if (Array.isArray(left) && Array.isArray(right))
        return left.length === right.length && left.every((value, index) => sameValue(value, right[index]));
    if (!record(left) || !record(right))
        return false;
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key => Object.prototype.hasOwnProperty.call(right, key) && sameValue(left[key], right[key]));
}
function structuralScore(value, schema, encode, refs = new Set()) {
    if (!record(value) || !record(schema))
        return 0;
    let score = 0;
    if (typeof schema.$ref === 'string' && !refs.has(schema.$ref))
        score += structuralScore(value, resolveSchema(schema.$ref), encode, new Set([...refs, schema.$ref]));
    if (record(schema.properties))
        score += Object.keys(schema.properties).filter(name => Object.prototype.hasOwnProperty.call(value, sourceName(name, encode))).length;
    if (Array.isArray(schema.allOf))
        score += schema.allOf.reduce((sum, branch) => sum + structuralScore(value, branch, encode, refs), 0);
    return score;
}
function chooseUnion(value, schema, branches, encode) {
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
                if (branch !== undefined)
                    return branch;
                return { $ref: target };
            }
        }
    }
    const matching = branches.filter(branch => matches(value, branch, encode));
    if (!matching.length)
        throw new Error('No union variant matches the payload for schema-aware conversion');
    const scores = matching.map(branch => structuralScore(value, branch, encode));
    const maximum = Math.max(...scores);
    const candidates = matching.filter((_, index) => scores[index] === maximum);
    if (candidates.length === 1)
        return candidates[0];
    const converted = candidates.map(branch => convert(value, branch, encode, new WeakSet()));
    if (converted.every(result => sameValue(result, converted[0])))
        return candidates[0];
    throw new Error('Ambiguous union conversion: multiple matching variants rename the payload differently; provide a discriminator');
}
function schemaNodes(schema, value, encode, refs = new Set()) {
    if (schema === false)
        throw new Error('Cannot convert a value against a false schema');
    if (!record(schema))
        return [];
    const nodes = [schema];
    if (typeof schema.$ref === 'string') {
        if (refs.has(schema.$ref))
            throw new Error('Circular alias schema reference in conversion: ' + schema.$ref);
        nodes.push(...schemaNodes(resolveSchema(schema.$ref), value, encode, new Set([...refs, schema.$ref])));
    }
    if (Array.isArray(schema.allOf))
        for (const branch of schema.allOf)
            nodes.push(...schemaNodes(branch, value, encode, refs));
    for (const keyword of ['oneOf', 'anyOf'])
        if (Array.isArray(schema[keyword]))
            nodes.push(...schemaNodes(chooseUnion(value, schema, schema[keyword], encode), value, encode, refs));
    return nodes;
}
function convert(value, schema, encode, active) {
    if (value === null || value === undefined || (!Array.isArray(value) && !record(value)))
        return value;
    if (active.has(value))
        throw new Error('Cyclic payload is unsupported by schema-aware conversion');
    active.add(value);
    try {
        const nodes = schemaNodes(schema, value, encode);
        if (Array.isArray(value)) {
            const items = nodes.filter(node => node.items !== undefined).map(node => node.items);
            return items.length ? value.map(item => convert(item, { allOf: items }, encode, active)) : value.slice();
        }
        const properties = new Map();
        const names = new Map();
        const additional = [];
        for (const node of nodes) {
            if (record(node.properties))
                for (const [wireName, child] of Object.entries(node.properties)) {
                    const applicationName = appName(wireName);
                    const previous = names.get(applicationName);
                    if (previous !== undefined && previous !== wireName)
                        throw new Error('Property naming collision in conversion: ' + previous + ' and ' + wireName);
                    names.set(applicationName, wireName);
                    const key = sourceName(wireName, encode);
                    const existing = properties.get(key);
                    if (existing)
                        existing.schemas.push(child);
                    else
                        properties.set(key, { wireName, schemas: [child] });
                }
            if (record(node.additionalProperties))
                additional.push(node.additionalProperties);
        }
        const result = {};
        for (const [key, entry] of Object.entries(value)) {
            const declared = properties.get(key);
            const target = declared ? encode ? declared.wireName : appName(declared.wireName) : key;
            if (Object.prototype.hasOwnProperty.call(result, target))
                throw new Error('Payload key collision during conversion: ' + key + ' becomes ' + target);
            const converted = declared ? convert(entry, { allOf: declared.schemas }, encode, active)
                : additional.length ? convert(entry, { allOf: additional }, encode, active) : entry;
            Object.defineProperty(result, target, { value: converted, enumerable: true, writable: true, configurable: true });
        }
        return result;
    }
    finally {
        active.delete(value);
    }
}
export function serializeValue(value, schema) {
    return preserveNames ? value : convert(value, schema, true, new WeakSet());
}
export function deserializeValue(value, schema) {
    return preserveNames ? value : convert(value, schema, false, new WeakSet());
}
export function serializeApiUserDto(value) {
    return serializeValue(value, { "$ref": "#/components/schemas/User" });
}
export function deserializeApiUserDto(value) {
    return deserializeValue(value, { "$ref": "#/components/schemas/User" });
}
