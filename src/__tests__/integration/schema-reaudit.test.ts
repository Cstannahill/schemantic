import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import { OpenAPIParser } from '../../parsers/openapi';
import { ParserFactory } from '../../parsers/factory';
import { projectSchema, schemaType } from '../../generators/schema-type';
import { Schemantic } from '../../core/schemantic';
import { OpenAPISchemaObject, OpenAPISchema } from '../../types/openapi';
import { createTestConfig } from '../test-config';

describe('schema re-audit regressions', () => {
  const parser = () => new OpenAPIParser(createTestConfig());
  const document = (schemas: Record<string, unknown>, openapi = '3.1.2') => ({
    openapi, info: { title: 'Schema API', version: '1' }, components: { schemas },
  });

  async function compile(source: string): Promise<void> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'schemantic-schema-'));
    try {
      const file = path.join(directory, 'consumer.ts');
      await fs.writeFile(file, source);
      const program = ts.createProgram([file], {
        strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
        target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
        skipLibCheck: true, types: [], lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
      });
      expect(ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
  }

  it.each(['3.0.4', '3.1.1', '3.1.2'])('accepts compatible dialect patches %s', async openapi => {
    const parsed = await parser().parse({ data: { ...document({}, openapi), paths: {} } });
    expect((await parser().validate(parsed)).isValid).toBe(true);
  });

  it('allows components-only 3.1 documents, preserves input and normalizes boolean schema semantics', async () => {
    const source = document({ Anything: true, Impossible: false, Nested: {
      type: 'object', properties: { ok: true, impossible: false }, additionalProperties: false,
    } });
    const before = JSON.stringify(source);
    const parsed = await parser().parse({ data: source });
    expect(JSON.stringify(source)).toBe(before);
    expect(parsed.paths).toEqual({});
    expect((await parser().validate(parsed)).isValid).toBe(true);
    const resolver = parser().createResolver(parsed);
    const anything = resolver('#/components/schemas/Anything')!;
    const impossible = resolver('#/components/schemas/Impossible')!;
    expect(schemaType(anything, () => 'Unused')).toBe('unknown');
    expect(schemaType(impossible, () => 'Unused')).toBe('never');
    await compile(`type Anything = ${schemaType(anything, () => 'Unused')};
type Impossible = ${schemaType(impossible, () => 'Unused')};
const anything: Anything = { arbitrary: 1 };
// @ts-expect-error false schema accepts no value
const impossible: Impossible = 1;`);
  });

  it('rejects unknown dialects and missing paths in 3.0 documents', async () => {
    const parsed = await parser().parse({ data: { ...document({}, '3.2.0'), paths: {} } });
    expect((await parser().validate(parsed)).errors.some(error => error.code === 'UNSUPPORTED_VERSION')).toBe(true);
    await expect(parser().parse({ data: document({}, '3.0.4') })).rejects.toThrow('paths');
  });

  it('reports unsupported YAML honestly in parser metadata and both text entry points', async () => {
    expect(parser().getMetadata().supportedFormats).toEqual(['json']);
    const text = 'openapi: 3.1.2\ninfo:\n  title: Example\n  version: "1"\npaths: {}';
    await expect(parser().parse({ string: text })).rejects.toThrow(/YAML.*not supported/);
    expect(() => ParserFactory.detectParserType({ string: text })).toThrow(/YAML.*not supported/);
  });

  it('retains required-only allOf branches and 3.1 ref siblings', async () => {
    const parsed = await parser().parse({ data: document({
      Base: { type: 'object', properties: { name: { type: 'string' } } },
      Composed: { allOf: [{ $ref: '#/components/schemas/Base' }, { required: ['name'] }] },
      Sibling: { $ref: '#/components/schemas/Base', required: ['name'] },
    }) });
    const resolver = parser().createResolver(parsed);
    const render = (name: string) => schemaType(resolver(`#/components/schemas/${name}`)!, ref => ref.split('/').pop()!, {}, resolver);
    await compile(`type Base = ${render('Base')}; type Composed = ${render('Composed')}; type Sibling = ${render('Sibling')};
const composed: Composed = { name: 'valid' }; const sibling: Sibling = { name: 'valid' };
// @ts-expect-error required constraint in composition
const missingComposed: Composed = {};
// @ts-expect-error required constraint beside ref
const missingSibling: Sibling = {};
// @ts-expect-error original property type is retained
const wrongSibling: Sibling = { name: 1 };`);
  });

  it('does not apply schema ref sibling constraints in the 3.0 dialect', async () => {
    const parsed = await parser().parse({ data: { ...document({ Base: { type: 'string' },
      Alias: { $ref: '#/components/schemas/Base', type: 'integer' },
    }, '3.0.4'), paths: {} } });
    expect(schemaType(parsed.components!.schemas!.Alias!, () => 'Base', {}, parser().createResolver(parsed))).toBe('Base');
  });

  it('permits heterogeneous known dictionary fields and diagnoses the TypeScript approximation', async () => {
    const parsed = await parser().parse({ data: document({ Dictionary: {
      type: 'object', required: ['label'], properties: { label: { type: 'string' }, count: { type: 'number' } },
      additionalProperties: { type: 'number' },
    } }) });
    const expression = schemaType(parsed.components!.schemas!.Dictionary!, () => 'Unused');
    await compile(`type Dictionary = ${expression}; const valid: Dictionary = { label: 'x', extra: 1 };
// @ts-expect-error known property keeps its declared type
const wrongKnown: Dictionary = { label: 1 };
// @ts-expect-error dictionary union still rejects unrelated value types
const wrongValue: Dictionary = { label: 'x', extra: true };`);
    expect((await parser().validate(parsed)).warnings.some(warning => warning.code === 'DICTIONARY_TYPE_APPROXIMATION')).toBe(true);
  });

  it('reports unresolved and unsupported refs through public parser validation', async () => {
    const parsed = await parser().parse({ data: document({ Broken: { $ref: '#/components/schemas/Missing' }, External: { $ref: './external.json#/Thing' } }) });
    const result = await parser().validate(parsed);
    expect(result.isValid).toBe(false);
    expect(result.errors.map(error => error.code)).toEqual(expect.arrayContaining(['UNRESOLVED_REFERENCE', 'UNSUPPORTED_REFERENCE']));
  });

  it('generates boolean components through the regular source-generation workflow', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemantic-boolean-'));
    try {
      const result = await new Schemantic(createTestConfig({ schemaData: document({ Anything: true, Impossible: false }) as unknown as OpenAPISchema,
        generateApiClient: false, outputDir })).generate();
      expect(result.success).toBe(true); expect(result.errors).toEqual([]);
      const source = await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8');
      expect(source).toContain('type Anything = unknown'); expect(source).toContain('type Impossible = never');
      await compile(source);
    } finally { await fs.rm(outputDir, { recursive: true, force: true }); }
  });

  it('renders directional recursive projections, naming and media-aware binary values', async () => {
    const user: OpenAPISchemaObject = { type: 'object', required: ['id', 'password', 'friend'], properties: {
      id: { type: 'integer', readOnly: true }, password: { type: 'string', writeOnly: true },
      friend: { $ref: '#/components/schemas/User', nullable: true },
      profile_image: { type: 'string', format: 'binary' },
    } };
    const resolver = (ref: string) => ref === '#/components/schemas/User' ? user : undefined;
    // The sixth argument is the projection/media contract shared with client generation.
    const render = schemaType;
    const request = render(user, () => 'UserRequest', {}, resolver, undefined, { direction: 'request', binary: true,
      propertyName: (wireName: string) => wireName === 'profile_image' ? 'profileImage' : wireName });
    const response = render(user, () => 'UserResponse', {}, resolver, undefined, { direction: 'response' });
    const json = render({ type: 'string', format: 'binary' }, () => 'Unused');
    expect(json).toBe('string');
    await compile(`type UserRequest = ${request}; type UserResponse = ${response};
const request: UserRequest = { password: 'secret', friend: null, profileImage: new Blob(['data']) };
const response: UserResponse = { id: 1, friend: null };
// @ts-expect-error readOnly property is excluded from request
const invalidRequest: UserRequest = { id: 1, password: 'x', friend: null };
// @ts-expect-error writeOnly property is excluded from response
const invalidResponse: UserResponse = { id: 1, password: 'x', friend: null };`);
  });

  it('projects directional validator schemas with reference names and allOf required constraints without mutations', () => {
    const annotated: OpenAPISchemaObject = { type: 'object', properties: {
      secret_key: { type: 'string', writeOnly: true }, public_name: { type: 'string', readOnly: true },
      nested: { type: 'array', items: { $ref: '#/components/schemas/User' } },
    } };
    const composed: OpenAPISchemaObject = { allOf: [{ $ref: '#/components/schemas/User' }, { required: ['public_name', 'secret_key'] }] };
    const before = JSON.stringify(composed);
    const projected = projectSchema(composed, { direction: 'request' }, () => annotated, ref => `${ref}Request`) as OpenAPISchemaObject;
    expect(projected.allOf).toEqual([{ $ref: '#/components/schemas/UserRequest' }, { required: ['secret_key'] }]);
    const response = projectSchema(annotated, { direction: 'response', propertyName: name => name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()) },
      () => annotated, ref => `${ref}Response`) as OpenAPISchemaObject;
    expect(response.properties).toEqual({ publicName: { type: 'string', readOnly: true }, nested: {
      type: 'array', items: { $ref: '#/components/schemas/UserResponse' },
    } });
    expect(JSON.stringify(composed)).toBe(before);
    expect(annotated.properties).toHaveProperty('secret_key');
  });

  it.each(['application/octet-stream', 'image/png'])('recognizes unencoded %s content only in binary request contexts', async contentMediaType => {
    const raw: OpenAPISchemaObject = { type: 'string', contentMediaType };
    const encoded: OpenAPISchemaObject = { ...raw, contentEncoding: 'base64' };
    const before = JSON.stringify(raw);
    const render = (value: OpenAPISchemaObject, binary: boolean) => schemaType(value, () => 'Unused', {}, undefined, undefined, { binary });
    expect(render(raw, true)).toBe('Blob');
    expect(render(raw, false)).toBe('string');
    expect(render(encoded, true)).toBe('string');
    const projected = projectSchema(raw, { direction: 'request', binary: true });
    expect(schemaType(projected, () => 'Unused')).toBe('globalThis.Blob');
    expect(projectSchema(encoded, { direction: 'request', binary: true })).not.toHaveProperty('x-schemantic-binary');
    expect(JSON.stringify(raw)).toBe(before);
    await compile(`type Raw = ${render(raw, true)}; type Encoded = ${render(encoded, true)};
const raw: Raw = new Blob(['data']); const encoded: Encoded = 'ZGF0YQ==';
// @ts-expect-error raw upload fields require binary values
const invalidRaw: Raw = 'data';
// @ts-expect-error encoded strings remain strings
const invalidEncoded: Encoded = new Blob(['data']);`);
  });
});
