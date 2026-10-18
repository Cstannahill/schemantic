import type * as SchemaTypes from './types.js';

// Schema-aware wire conversion. This converts names; it does not validate payloads.
const wireDocument: unknown = JSON.parse("{\"openapi\":\"3.1.0\",\"info\":{\"title\":\"Image Manipulation API\",\"description\":\"\\n    A robust, modular image manipulation API supporting conversion between \\n    multiple image formats with optional transformations.\\n    \\n    **Features:**\\n    - Format conversion (PNG, JPEG, WEBP, AVIF, TIFF, SVG, and more)\\n    - Image resizing with automatic aspect ratio\\n    - Quality control for lossy formats\\n    - Batch processing\\n    - SVG support (vector ↔ raster)\\n    \",\"version\":\"1.0.0\"},\"paths\":{\"/health\":{\"get\":{\"tags\":[\"Health\"],\"summary\":\"Health Check\",\"description\":\"Returns the health status of the API service\",\"operationId\":\"health_check_health_get\",\"responses\":{\"200\":{\"description\":\"Successful Response\",\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"#/components/schemas/HealthResponse\"}}}}}}},\"/convert/\":{\"post\":{\"tags\":[\"Conversion\"],\"summary\":\"Convert Image Format\",\"description\":\"Convert an image from one format to another with optional transformations.\\n    \\n    **Supported Formats:**\\n    - Raster: PNG, JPEG/JPG, WEBP, AVIF, TIFF/TIF, ICO, BMP, HEIC/HEIF\\n    - Vector: SVG\\n    \\n    **Optional Transformations:**\\n    - Resize (width/height with automatic aspect ratio)\\n    - Quality adjustment (for lossy formats)\\n    - DPI/scale settings (for SVG conversions)\\n    \\n    **Returns:** Converted image file with appropriate MIME type\",\"operationId\":\"convert_image_convert__post\",\"requestBody\":{\"content\":{\"multipart/form-data\":{\"schema\":{\"$ref\":\"#/components/schemas/Body_convert_image_convert__post\"}}},\"required\":true},\"responses\":{\"200\":{\"description\":\"Successfully converted image\",\"content\":{\"application/json\":{\"schema\":{}},\"image/*\":{}}},\"400\":{\"description\":\"Invalid request or unsupported format\"},\"413\":{\"description\":\"File size exceeds maximum limit\"},\"422\":{\"description\":\"Conversion failed\"}}}},\"/convert/batch\":{\"post\":{\"tags\":[\"Conversion\"],\"summary\":\"Batch Convert Images\",\"description\":\"Convert multiple images to the same target format.\\n    \\n    All images will be converted using the same parameters. This is more\\n    efficient than individual conversions when processing multiple files\\n    with identical target specifications.\\n    \\n    **Returns:** ZIP archive containing all converted images\",\"operationId\":\"batch_convert_images_convert_batch_post\",\"requestBody\":{\"content\":{\"multipart/form-data\":{\"schema\":{\"$ref\":\"#/components/schemas/Body_batch_convert_images_convert_batch_post\"}}},\"required\":true},\"responses\":{\"200\":{\"description\":\"Successfully converted images\",\"content\":{\"application/json\":{\"schema\":{}},\"application/zip\":{}}},\"400\":{\"description\":\"Invalid request\"},\"413\":{\"description\":\"Total file size exceeds limit\"},\"422\":{\"description\":\"Validation Error\",\"content\":{\"application/json\":{\"schema\":{\"$ref\":\"#/components/schemas/HTTPValidationError\"}}}}}}},\"/convert/formats\":{\"get\":{\"tags\":[\"Conversion\"],\"summary\":\"List Supported Formats\",\"description\":\"Returns a list of all supported image formats\",\"operationId\":\"list_formats_convert_formats_get\",\"responses\":{\"200\":{\"description\":\"Successful Response\",\"content\":{\"application/json\":{\"schema\":{\"additionalProperties\":true,\"type\":\"object\",\"title\":\"Response List Formats Convert Formats Get\"}}}}}}},\"/\":{\"get\":{\"tags\":[\"Root\"],\"summary\":\"API Root\",\"description\":\"Returns basic API information and links to documentation\",\"operationId\":\"root__get\",\"responses\":{\"200\":{\"description\":\"Successful Response\",\"content\":{\"application/json\":{\"schema\":{}}}}}}}},\"components\":{\"schemas\":{\"Body_batch_convert_images_convert_batch_post\":{\"properties\":{\"files\":{\"items\":{\"type\":\"string\",\"format\":\"binary\"},\"type\":\"array\",\"title\":\"Files\",\"description\":\"Image files to convert\"},\"target_format\":{\"$ref\":\"#/components/schemas/ImageFormat\",\"description\":\"Target format for all images\"},\"quality\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":100,\"minimum\":1},{\"type\":\"null\"}],\"title\":\"Quality\",\"description\":\"Quality (1-100) for lossy formats\"},\"preserve_names\":{\"type\":\"boolean\",\"title\":\"Preserve Names\",\"description\":\"Preserve original filenames\",\"default\":true}},\"type\":\"object\",\"required\":[\"files\",\"target_format\"],\"title\":\"Body_batch_convert_images_convert_batch_post\"},\"Body_convert_image_convert__post\":{\"properties\":{\"file\":{\"type\":\"string\",\"format\":\"binary\",\"title\":\"File\",\"description\":\"Image file to convert\"},\"target_format\":{\"$ref\":\"#/components/schemas/ImageFormat\",\"description\":\"Target image format\"},\"quality\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":100,\"minimum\":1},{\"type\":\"null\"}],\"title\":\"Quality\",\"description\":\"Quality (1-100) for lossy formats\"},\"width\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":10000,\"exclusiveMinimum\":0},{\"type\":\"null\"}],\"title\":\"Width\",\"description\":\"Target width in pixels\"},\"height\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":10000,\"exclusiveMinimum\":0},{\"type\":\"null\"}],\"title\":\"Height\",\"description\":\"Target height in pixels\"},\"dpi\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":600,\"exclusiveMinimum\":0},{\"type\":\"null\"}],\"title\":\"Dpi\",\"description\":\"DPI for SVG-to-raster conversion\"},\"scale\":{\"anyOf\":[{\"type\":\"number\",\"maximum\":10,\"exclusiveMinimum\":0},{\"type\":\"null\"}],\"title\":\"Scale\",\"description\":\"Scale factor for SVG-to-raster\"}},\"type\":\"object\",\"required\":[\"file\",\"target_format\"],\"title\":\"Body_convert_image_convert__post\"},\"HTTPValidationError\":{\"properties\":{\"detail\":{\"items\":{\"$ref\":\"#/components/schemas/ValidationError\"},\"type\":\"array\",\"title\":\"Detail\"}},\"type\":\"object\",\"title\":\"HTTPValidationError\"},\"HealthResponse\":{\"properties\":{\"status\":{\"type\":\"string\",\"title\":\"Status\"},\"version\":{\"type\":\"string\",\"title\":\"Version\"},\"environment\":{\"type\":\"string\",\"title\":\"Environment\"}},\"type\":\"object\",\"required\":[\"status\",\"version\",\"environment\"],\"title\":\"HealthResponse\",\"description\":\"Health check response schema.\"},\"ImageFormat\":{\"type\":\"string\",\"enum\":[\"png\",\"jpeg\",\"jpg\",\"webp\",\"avif\",\"tiff\",\"tif\",\"ico\",\"heic\",\"heif\",\"bmp\",\"svg\"],\"title\":\"ImageFormat\",\"description\":\"Supported image formats with their canonical extensions.\"},\"ValidationError\":{\"properties\":{\"loc\":{\"items\":{\"anyOf\":[{\"type\":\"string\"},{\"type\":\"integer\"}]},\"type\":\"array\",\"title\":\"Location\"},\"msg\":{\"type\":\"string\",\"title\":\"Message\"},\"type\":{\"type\":\"string\",\"title\":\"Error Type\"}},\"type\":\"object\",\"required\":[\"loc\",\"msg\",\"type\"],\"title\":\"ValidationError\"},\"Body_batch_convert_images_convert_batch_postBinary\":{\"properties\":{\"files\":{\"items\":{\"type\":\"string\",\"format\":\"binary\",\"x-schemantic-binary\":true},\"type\":\"array\",\"title\":\"Files\",\"description\":\"Image files to convert\"},\"target_format\":{\"$ref\":\"#/components/schemas/ImageFormat\",\"description\":\"Target format for all images\"},\"quality\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":100,\"minimum\":1},{\"type\":\"null\"}],\"title\":\"Quality\",\"description\":\"Quality (1-100) for lossy formats\"},\"preserve_names\":{\"type\":\"boolean\",\"title\":\"Preserve Names\",\"description\":\"Preserve original filenames\",\"default\":true}},\"type\":\"object\",\"required\":[\"files\",\"target_format\"],\"title\":\"Body_batch_convert_images_convert_batch_post\"},\"Body_convert_image_convert__postBinary\":{\"properties\":{\"file\":{\"type\":\"string\",\"format\":\"binary\",\"title\":\"File\",\"description\":\"Image file to convert\",\"x-schemantic-binary\":true},\"target_format\":{\"$ref\":\"#/components/schemas/ImageFormat\",\"description\":\"Target image format\"},\"quality\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":100,\"minimum\":1},{\"type\":\"null\"}],\"title\":\"Quality\",\"description\":\"Quality (1-100) for lossy formats\"},\"width\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":10000,\"exclusiveMinimum\":0},{\"type\":\"null\"}],\"title\":\"Width\",\"description\":\"Target width in pixels\"},\"height\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":10000,\"exclusiveMinimum\":0},{\"type\":\"null\"}],\"title\":\"Height\",\"description\":\"Target height in pixels\"},\"dpi\":{\"anyOf\":[{\"type\":\"integer\",\"maximum\":600,\"exclusiveMinimum\":0},{\"type\":\"null\"}],\"title\":\"Dpi\",\"description\":\"DPI for SVG-to-raster conversion\"},\"scale\":{\"anyOf\":[{\"type\":\"number\",\"maximum\":10,\"exclusiveMinimum\":0},{\"type\":\"null\"}],\"title\":\"Scale\",\"description\":\"Scale factor for SVG-to-raster\"}},\"type\":\"object\",\"required\":[\"file\",\"target_format\"],\"title\":\"Body_convert_image_convert__post\"}}}}");
const preserveNames: boolean = false;
const appName: (wireName: string, mode?: 'camelCase' | 'preserve') => string = function propertyName(wireName, mode = 'camelCase') {
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
    : type === 'number' ? typeof value === 'number' : type === 'string' ? typeof value === 'string'
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

export function serializeBodyBatchConvertImagesConvertBatchPost(value: SchemaTypes.BodyBatchConvertImagesConvertBatchPost): unknown {
  return serializeValue(value, {"$ref":"#/components/schemas/Body_batch_convert_images_convert_batch_post"});
}
export function deserializeBodyBatchConvertImagesConvertBatchPost(value: unknown): SchemaTypes.BodyBatchConvertImagesConvertBatchPost {
  return deserializeValue(value, {"$ref":"#/components/schemas/Body_batch_convert_images_convert_batch_post"}) as SchemaTypes.BodyBatchConvertImagesConvertBatchPost;
}

export function serializeBodyConvertImageConvertPost(value: SchemaTypes.BodyConvertImageConvertPost): unknown {
  return serializeValue(value, {"$ref":"#/components/schemas/Body_convert_image_convert__post"});
}
export function deserializeBodyConvertImageConvertPost(value: unknown): SchemaTypes.BodyConvertImageConvertPost {
  return deserializeValue(value, {"$ref":"#/components/schemas/Body_convert_image_convert__post"}) as SchemaTypes.BodyConvertImageConvertPost;
}

export function serializeHTTPValidationError(value: SchemaTypes.HTTPValidationError): unknown {
  return serializeValue(value, {"$ref":"#/components/schemas/HTTPValidationError"});
}
export function deserializeHTTPValidationError(value: unknown): SchemaTypes.HTTPValidationError {
  return deserializeValue(value, {"$ref":"#/components/schemas/HTTPValidationError"}) as SchemaTypes.HTTPValidationError;
}

export function serializeHealthResponse(value: SchemaTypes.HealthResponse): unknown {
  return serializeValue(value, {"$ref":"#/components/schemas/HealthResponse"});
}
export function deserializeHealthResponse(value: unknown): SchemaTypes.HealthResponse {
  return deserializeValue(value, {"$ref":"#/components/schemas/HealthResponse"}) as SchemaTypes.HealthResponse;
}

export function serializeImageFormat(value: SchemaTypes.ImageFormat): unknown {
  return serializeValue(value, {"$ref":"#/components/schemas/ImageFormat"});
}
export function deserializeImageFormat(value: unknown): SchemaTypes.ImageFormat {
  return deserializeValue(value, {"$ref":"#/components/schemas/ImageFormat"}) as SchemaTypes.ImageFormat;
}

export function serializeValidationError(value: SchemaTypes.ValidationError): unknown {
  return serializeValue(value, {"$ref":"#/components/schemas/ValidationError"});
}
export function deserializeValidationError(value: unknown): SchemaTypes.ValidationError {
  return deserializeValue(value, {"$ref":"#/components/schemas/ValidationError"}) as SchemaTypes.ValidationError;
}

export function serializeBodyBatchConvertImagesConvertBatchPostBinary(value: SchemaTypes.BodyBatchConvertImagesConvertBatchPostBinary): unknown {
  return serializeValue(value, {"$ref":"#/components/schemas/Body_batch_convert_images_convert_batch_postBinary"});
}
export function deserializeBodyBatchConvertImagesConvertBatchPostBinary(value: unknown): SchemaTypes.BodyBatchConvertImagesConvertBatchPostBinary {
  return deserializeValue(value, {"$ref":"#/components/schemas/Body_batch_convert_images_convert_batch_postBinary"}) as SchemaTypes.BodyBatchConvertImagesConvertBatchPostBinary;
}

export function serializeBodyConvertImageConvertPostBinary(value: SchemaTypes.BodyConvertImageConvertPostBinary): unknown {
  return serializeValue(value, {"$ref":"#/components/schemas/Body_convert_image_convert__postBinary"});
}
export function deserializeBodyConvertImageConvertPostBinary(value: unknown): SchemaTypes.BodyConvertImageConvertPostBinary {
  return deserializeValue(value, {"$ref":"#/components/schemas/Body_convert_image_convert__postBinary"}) as SchemaTypes.BodyConvertImageConvertPostBinary;
}
