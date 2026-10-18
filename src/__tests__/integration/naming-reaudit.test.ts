import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import { generateConversionFile, propertyName, renameSchemaProperties } from '../../generators/naming';
import { OpenAPISchema } from '../../types/openapi';
import { GenerationContext } from '../../types/core';
import { createTestConfig } from '../test-config';
import { OpenAPIParser } from '../../parsers/openapi';

describe('schema-aware naming migration', () => {
  const document = (): OpenAPISchema => ({ openapi: '3.1.2', info: { title: 'Naming', version: '1' }, paths: {}, components: { schemas: {
    User: { type: 'object', required: ['user_id'], properties: {
      user_id: { type: 'string' }, display_name: { type: 'string' },
      friend_list: { type: 'array', items: { $ref: '#/components/schemas/User' } },
      profile_image: { type: 'string', format: 'binary' }, created_at: { type: 'string', format: 'date-time' },
    } },
    Lookup: { type: 'object', additionalProperties: { $ref: '#/components/schemas/User' } },
    Both: { allOf: [{ $ref: '#/components/schemas/User' }, { type: 'object', properties: { active_flag: { type: 'boolean' } } }] },
    Event: { oneOf: [{ $ref: '#/components/schemas/Created' }, { $ref: '#/components/schemas/Deleted' }],
      discriminator: { propertyName: 'event_type', mapping: { created: '#/components/schemas/Created', deleted: '#/components/schemas/Deleted' } } },
    Created: { type: 'object', required: ['event_type', 'user_id'], properties: { event_type: { const: 'created' }, user_id: { type: 'string' } } },
    Deleted: { type: 'object', required: ['event_type', 'reason_text'], properties: { event_type: { const: 'deleted' }, reason_text: { type: 'string' } } },
  } } });

  function context(schema: OpenAPISchema, outputDir: string, mode: 'camelCase' | 'preserve' = 'camelCase'): GenerationContext {
    const names = ['ApiUserDto', 'ApiLookupDto', 'ApiBothDto', 'ApiEventDto', 'ApiCreatedDto', 'ApiDeletedDto'];
    const types = names.map(name => ({ name, content: '', dependencies: [], exports: [name], isInterface: false,
      isEnum: false, isUnion: false, sourceSchema: {} }));
    return { config: createTestConfig({ outputDir, propertyNaming: mode, typePrefix: 'Api', typeSuffix: 'Dto' }), schema,
      resolvedSchemas: new Map(), generatedTypes: new Map(types.map(type => [type.name, type])), generatedClients: new Map(),
      schemaResolver: new OpenAPIParser(createTestConfig()).createResolver(schema),
      typeRegistry: { registerType: () => {}, getType: name => types.find(type => type.name === name), getAllTypes: () => types,
        getDependencies: () => [], resolveDependencies: () => names },
    };
  }

  async function runtime(schema = document(), mode: 'camelCase' | 'preserve' = 'camelCase') {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemantic-naming-'));
    try {
      const generated = generateConversionFile(context(schema, outputDir, mode), schema);
      expect(generated.path).toBe(path.join(outputDir, 'conversion.ts'));
      expect(generated.content).toContain("from './types.js'");
      await fs.writeFile(generated.path, generated.content);
      const typesFile = path.join(outputDir, 'types.ts');
      await fs.writeFile(typesFile, ['ApiUserDto', 'ApiLookupDto', 'ApiBothDto', 'ApiEventDto', 'ApiCreatedDto', 'ApiDeletedDto']
        .map(name => `export type ${name} = unknown;`).join('\n'));
      const program = ts.createProgram([generated.path, typesFile], { strict: true, noUnusedLocals: true,
        noUnusedParameters: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
        target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
        lib: ['lib.es2020.d.ts'], skipLibCheck: true, types: [] });
      expect(ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
      const compiled = ts.transpileModule(generated.content, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
      const exports: Record<string, (value: unknown, schema?: unknown) => unknown> = {};
      new Function('exports', compiled.outputText)(exports);
      return exports;
    } finally { await fs.rm(outputDir, { recursive: true, force: true }); }
  }

  it('normalizes acronyms and invalid leading characters consistently, while preserve leaves keys intact', () => {
    expect(propertyName('user_id')).toBe('userId'); expect(propertyName('HTTP_response')).toBe('httpResponse');
    expect(propertyName('userID')).toBe('userId'); expect(propertyName('12_value')).toBe('_12Value');
    expect(propertyName('x-label', 'preserve')).toBe('x-label');
  });

  it('renames only schema declarations, required lists, discriminator keys and inline property reference pointers', () => {
    const source = document();
    source.paths['/users/{user_id}'] = { get: { parameters: [{ name: 'user_id', in: 'path', required: true,
      schema: { type: 'string' } }], responses: { '200': { description: 'ok', content: { 'application/json': { schema: {
        $ref: '#/components/schemas/User/properties/user_id',
      } } } } } } };
    (source.components!.schemas!.User as Record<string, unknown>).example = { user_id: 'wire' };
    const before = JSON.stringify(source);
    const renamed = renameSchemaProperties(source, 'camelCase');
    expect(JSON.stringify(source)).toBe(before);
    expect((renamed.components!.schemas!.User as Record<string, unknown>).required).toEqual(['userId']);
    expect((renamed.components!.schemas!.User as Record<string, unknown>).example).toEqual({ user_id: 'wire' });
    expect(renamed.paths['/users/{user_id}']!.get!.parameters![0]).toHaveProperty('name', 'user_id');
    expect(renamed.paths['/users/{user_id}']!.get!.responses['200']).toHaveProperty('content.application/json.schema.$ref',
      '#/components/schemas/User/properties/userId');
    expect(renamed.components!.schemas!.Event).toHaveProperty('discriminator.propertyName', 'eventType');
    expect(renameSchemaProperties(source, 'preserve')).toEqual(source);
  });

  it('fails direct and composed naming collisions with both names and a schema location', () => {
    const schema = document();
    schema.components!.schemas!.Broken = { type: 'object', properties: { user_id: { type: 'string' }, userId: { type: 'string' } } };
    expect(() => renameSchemaProperties(schema, 'camelCase')).toThrow(/components.*Broken.*user_id.*userId/);
    schema.components!.schemas!.Broken = { allOf: [{ type: 'object', properties: { user_id: { type: 'string' } } },
      { type: 'object', properties: { userId: { type: 'string' } } }] };
    expect(() => renameSchemaProperties(schema, 'camelCase')).toThrow(/user_id.*userId/);
  });

  it('round-trips recursive references, nullable/absent fields and unknown keys without mutations', async () => {
    const conversion = await runtime();
    const wire = { user_id: '1', display_name: 'Ada', friend_list: [{ user_id: '2', display_name: null }],
      opaque_payload: { leave_this_key: true }, unknown_key: 'wire', created_at: '2026-01-01T00:00:00Z' };
    const before = JSON.stringify(wire);
    const application = conversion.deserializeApiUserDto!(wire);
    expect(application).toEqual({ userId: '1', displayName: 'Ada', friendList: [{ userId: '2', displayName: null }],
      opaque_payload: { leave_this_key: true }, unknown_key: 'wire', createdAt: '2026-01-01T00:00:00Z' });
    expect(conversion.serializeApiUserDto!(application)).toEqual(wire); expect(JSON.stringify(wire)).toBe(before);
    expect(conversion.deserializeApiUserDto!({ user_id: '1' })).toEqual({ userId: '1' });
  });

  it('preserves dictionary keys and converts their declared values and allOf properties', async () => {
    const conversion = await runtime();
    expect(conversion.deserializeApiLookupDto!({ user_id: { user_id: '1' }, 'odd-Key': { user_id: '2' } })).toEqual({
      user_id: { userId: '1' }, 'odd-Key': { userId: '2' },
    });
    expect(conversion.deserializeApiBothDto!({ user_id: '1', active_flag: true })).toEqual({ userId: '1', activeFlag: true });
  });

  it('uses wire discriminators before renaming and supports both serialization directions', async () => {
    const conversion = await runtime();
    expect(conversion.deserializeApiEventDto!({ event_type: 'created', user_id: '1' })).toEqual({ eventType: 'created', userId: '1' });
    expect(conversion.serializeApiEventDto!({ eventType: 'deleted', reasonText: 'gone' })).toEqual({ event_type: 'deleted', reason_text: 'gone' });
    const event = document().components!.schemas!.Event as Record<string, unknown>;
    const discriminator = event.discriminator as { propertyName: string; mapping: Record<string, string> };
    discriminator.mapping = { created: 'Created', deleted: 'Deleted' };
    expect(conversion.deserializeValue!({ event_type: 'created', user_id: '1' }, event)).toEqual({ eventType: 'created', userId: '1' });
  });

  it('selects structural and primitive variants, and explicitly rejects ambiguous transformations', async () => {
    const conversion = await runtime();
    const schema = { oneOf: [{ type: 'string' }, { type: 'object', required: ['user_id'], properties: { user_id: { type: 'string' } } }] };
    expect(conversion.deserializeValue!('plain', schema)).toBe('plain');
    expect(conversion.deserializeValue!({ user_id: '1' }, schema)).toEqual({ userId: '1' });
    const ambiguous = { anyOf: [{ type: 'object', properties: { user_id: { type: 'string' } } },
      { type: 'object', properties: { opaque_key: { type: 'string' } } }] };
    expect(() => conversion.deserializeValue!({ user_id: '1', opaque_key: 'x' }, ambiguous)).toThrow(/Ambiguous.*union/i);
  });

  it('keeps Blob, FormData, typed arrays and Date values intact', async () => {
    const conversion = await runtime();
    const blob = new Blob(['actual bytes']); const form = new FormData(); form.append('part', blob);
    const date = new Date('2026-01-01'); const bytes = new Uint8Array([1, 2]);
    const value = { userId: '1', profileImage: blob, createdAt: date, raw_form: form, byte_array: bytes };
    const serialized = conversion.serializeApiUserDto!(value) as Record<string, unknown>;
    expect(serialized.profile_image).toBe(blob); expect(serialized.created_at).toBe(date);
    expect(serialized.raw_form).toBe(form); expect(serialized.byte_array).toBe(bytes);
  });

  it('never overwrites unknown payload keys with renamed declared properties', async () => {
    const conversion = await runtime();
    expect(() => conversion.deserializeApiUserDto!({ user_id: 'a', userId: 'b' })).toThrow(/collision/i);
    expect(() => conversion.serializeApiUserDto!({ userId: 'a', user_id: 'b' })).toThrow(/collision/i);
  });

  it('keeps prototype-looking unknown keys as data and resolves escaped inline property pointers', async () => {
    const conversion = await runtime();
    const wire = JSON.parse('{"user_id":"1","__proto__":{"polluted":true}}') as Record<string, unknown>;
    const application = conversion.deserializeApiUserDto!(wire) as Record<string, unknown>;
    expect(Object.getPrototypeOf(application)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(application, '__proto__')).toBe(true);
    expect(application.__proto__).toEqual({ polluted: true });
    const input = { display_name: 'Ada' };
    expect(conversion.deserializeValue!(input, { properties: { display_name: { $ref: '#/components/schemas/User/properties/display_name' } } }))
      .toEqual({ displayName: 'Ada' });
  });

  it('preservation mode retains application/wire keys with no conversion', async () => {
    const conversion = await runtime(document(), 'preserve');
    const value = { user_id: '1', friend_list: [{ user_id: '2' }] };
    expect(conversion.deserializeApiUserDto!(value)).toEqual(value); expect(conversion.serializeApiUserDto!(value)).toEqual(value);
  });
});
