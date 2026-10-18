import * as fs from 'fs/promises';
import * as path from 'path';
import * as ts from 'typescript';
import { Schemantic } from '../../core/schemantic';
import { OpenAPISchema } from '../../types/openapi';
import { createTestConfig } from '../test-config';
import { memoizedValidation } from '../../plugins/zod-validation';

describe('plugin re-audit runtime contracts', () => {
  let outputDir: string;
  const schema = (): OpenAPISchema => ({ openapi: '3.1.0', info: { title: 'Probe', version: '1' }, paths: {}, components: { schemas: {
    User: { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 } } },
    Group: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
    UserId: { type: 'string', format: 'uuid' },
  } } });
  beforeEach(async () => { outputDir = await fs.mkdtemp(path.join(process.cwd(), 'test-output', 'plugin-regression-')); });
  afterEach(async () => { jest.restoreAllMocks(); await fs.rm(outputDir, { recursive: true, force: true }); });
  async function generate(name: string, options = {}, data = schema(), client = true) {
    const result = await new Schemantic(createTestConfig({ schemaData: data, outputDir, generateApiClient: client, plugins: [{ name, enabled: true, options }] })).generate();
    expect(result.errors).toEqual([]); expect(result.success).toBe(true);
  }
  // Generated module exports intentionally differ for each optional plugin.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function load(file = 'api-client.ts'): Promise<any> {
    const source = await fs.readFile(path.join(outputDir, file), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
    const exports = {}; new Function('exports', 'require', compiled.outputText)(exports, require); return exports;
  }
  async function compile(extra: ts.CompilerOptions = {}) {
    const files = (await fs.readdir(outputDir)).filter(f => f.endsWith('.ts')).map(f => path.join(outputDir, f));
    const program = ts.createProgram(files, { strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, skipLibCheck: true, types: [], lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], ...extra });
    expect(ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
  }
  it('emits erasable validation errors that preserve their issues and input data', async () => {
    await generate('zod-validation');
    await compile({ noUnusedLocals: true, noUnusedParameters: true, erasableSyntaxOnly: true });
    const { ValidationError } = await load();
    const issues = [{ code: 'custom', path: ['id'], message: 'Invalid identifier' }];
    const data = { id: 'wrong' };
    const error = new ValidationError(issues, data);
    expect(error).toBeInstanceOf(Error);
    expect(error.issues).toBe(issues);
    expect(error.data).toBe(data);
    expect(error.message).toContain('id: Invalid identifier');
  });
  it('keeps colliding resources, custom headers and session contexts separate', async () => {
    await generate('request-deduplication'); const { RequestDeduplicator } = await load(); const d = new RequestDeduplicator();
    expect(await d.execute('GET', 'https://example.com/Aa', async () => 'Aa')).toBe('Aa');
    expect(await d.execute('GET', 'https://example.com/BB', async () => 'BB')).toBe('BB');
    expect(await d.execute('GET', '/user', async () => 'tenantA', { headers: { 'X-Api-Key': 'A' } })).toBe('tenantA');
    expect(await d.execute('GET', '/user', async () => 'tenantB', { headers: { 'X-Api-Key': 'B' } })).toBe('tenantB');
    expect(await d.execute('GET', '/session', async () => 'A', { cacheScope: 'A' })).toBe('A');
    expect(await d.execute('GET', '/session', async () => 'B', { cacheScope: 'B' })).toBe('B');
    await compile();
  });
  it('preserves duplicate normalized headers and bypasses unsupported request identities', async () => {
    await generate('request-deduplication'); const { RequestDeduplicator } = await load(); const d = new RequestDeduplicator();
    await d.execute('GET', '/header', async () => 'combined', { headers: { Authorization: 'A', authorization: 'B' } });
    expect(await d.execute('GET', '/header', async () => 'single', { headers: { authorization: 'B' } })).toBe('single');
    await d.execute('GET', '/date', async () => 'first', { params: { day: new Date('2020-01-01') } });
    expect(await d.execute('GET', '/date', async () => 'second', { params: { day: new Date('2020-01-02') } })).toBe('second');
    const params: Record<string, unknown> = {}; params.self = params;
    expect(await d.execute('GET', '/cycle', async () => 'executed', { params })).toBe('executed');
    let calls = 0; await d.execute('GET', '/empty', async () => { calls++; return undefined; }); await d.execute('GET', '/empty', async () => { calls++; return undefined; }); expect(calls).toBe(1);
  });
  it('enforces endpoint stale policy, revalidation TTL and regex invalidation with real statistics', async () => {
    await generate('request-deduplication', { defaultTTL: 10, maxCacheSize: 1, endpointPolicies: { '/user': { ttl: 10, staleWhileRevalidate: false } } });
    const { RequestDeduplicator } = await load(); const d = new RequestDeduplicator(); let now = 1000; jest.spyOn(Date, 'now').mockImplementation(() => now);
    await d.execute('GET', '/user', async () => 'old'); now += 11;
    expect(await d.execute('GET', '/user', async () => 'new')).toBe('new');
    expect(await d.execute('GET', '/user', async () => 'unexpected')).toBe('new');
    expect(d.getStats().cacheHitRate).toBeCloseTo(1 / 3);
    d.invalidate(/user/g); expect(await d.execute('GET', '/user', async () => 'invalidated')).toBe('invalidated');
    await d.execute('GET', '/other', async () => 'other'); expect(d.getStats().evictions).toBe(1);
  });
  it('uses a runtime custom key callback and invalidates every header variant of a URL', async () => {
    await generate('request-deduplication'); const { RequestDeduplicator } = await load(); let calls = 0;
    const d = new RequestDeduplicator({ customKeyGenerator: (request: { url: string }) => { calls++; return request.url; } });
    await d.execute('GET', '/user', async () => 1, { headers: { a: '1' } });
    expect(await d.execute('GET', '/user', async () => 2, { headers: { a: '2' } })).toBe(1); expect(calls).toBe(2);
    d.invalidate('/user'); expect(await d.execute('GET', '/user', async () => 3)).toBe(3);
  });
  it('diagnoses unsupported generation-time custom key names before writing output', async () => {
    const result = await new Schemantic(createTestConfig({ schemaData: schema(), outputDir, plugins: [{ name: 'request-deduplication', enabled: true, options: { customKeyGenerator: 'customKey' } }] })).generate();
    expect(result.success).toBe(false); expect(result.errors.some(error => /runtime.*RequestDeduplicator/.test(error.message))).toBe(true); expect(await fs.readdir(outputDir)).toEqual([]);
  });
  it('validates branded objects and primitives and compiles shared declarations once', async () => {
    await generate('branded-types'); const m = await load('types.ts');
    expect(m.isUser({})).toBe(false); expect(m.isUser([])).toBe(false); expect(m.isUser({ id: 0 })).toBe(false); expect(m.isUser({ id: 1.5 })).toBe(false); expect(m.isUser({ id: 1 })).toBe(true);
    expect(() => m.assertUser({})).toThrow(); expect(() => m.createUserId('wrong')).toThrow(); expect(m.createUserId('550e8400-e29b-41d4-a716-446655440000')).toBeTruthy();
    await compile();
  });
  it('honors disabled branded guards, assertions, predicates, opaque and phantom options', async () => {
    await generate('branded-types', { enableRuntimeGuards: false, enableAssertionFunctions: false, enableTypePredicates: false, enableOpaqueTypes: false, enablePhantomTypes: false });
    const m = await load('types.ts'); expect(m.isUser).toBeUndefined(); expect(m.assertUser).toBeUndefined(); expect(m.createOpaqueUser).toBeUndefined(); expect(m.authorizeUser).toBeUndefined(); await compile();
  });
  it('validates allOf, exact oneOf, arrays, exclusive bounds and enum sibling constraints', async () => {
    const data = schema(); data.components!.schemas = {
      Both: { allOf: [{ type: 'object', required: ['a'], properties: { a: { type: 'string' } } }, { type: 'object', required: ['b'], properties: { b: { type: 'string' } } }] },
      Exclusive: { oneOf: [{ type: 'number' }, { type: 'integer' }] },
      Bounded: { type: 'array', items: { type: 'integer' }, minItems: 2, maxItems: 3, uniqueItems: true },
      Positive: { type: 'number', exclusiveMinimum: 0 }, ConstrainedEnum: { type: 'string', enum: ['a', 'aa'], minLength: 2 },
    };
    await generate('zod-validation', {}, data, false); const m = await load('types.ts');
    expect(m.BothSchema.safeParse({ a: 'a', b: 'b' }).success).toBe(true); expect(m.BothSchema.safeParse({ a: 'a' }).success).toBe(false);
    expect(m.ExclusiveSchema.safeParse(1).success).toBe(false); expect(m.ExclusiveSchema.safeParse(1.5).success).toBe(true);
    expect(m.BoundedSchema.safeParse([]).success).toBe(false); expect(m.BoundedSchema.safeParse([1, 1]).success).toBe(false); expect(m.BoundedSchema.safeParse([1, 2, 3, 4]).success).toBe(false);
    expect(m.PositiveSchema.safeParse(0).success).toBe(false); expect(m.ConstrainedEnumSchema.safeParse('a').success).toBe(false); await compile();
  });
  it.each(['oneOf', 'anyOf'] as const)('retains %s sibling required fields, properties and type constraints', async keyword => {
    const data = schema(); data.components!.schemas = {
      NeededId: { [keyword]: [{ type: 'object', properties: { a: { type: 'number' } } }, { type: 'string' }], required: ['id'] },
      Constrained: { [keyword]: [{ type: 'object', properties: { a: { type: 'number' } } }, { type: 'string' }], type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    };
    await generate('zod-validation', {}, data); const m = await load('types.ts');
    expect(m.NeededIdSchema.safeParse({ a: 1 }).success).toBe(false);
    expect(m.NeededIdSchema.safeParse({ a: 1, id: 'present' }).success).toBe(true);
    expect(m.ConstrainedSchema.safeParse({ a: 1, id: 2 }).success).toBe(false);
    expect(m.ConstrainedSchema.safeParse('text').success).toBe(false);
    expect(m.ConstrainedSchema.safeParse({ a: 1, id: 'present' }).success).toBe(true); await compile();
  });
  it('retains allOf sibling property counts without an explicit sibling object type', async () => {
    const data = schema(); data.components!.schemas = { Counted: { allOf: [{ type: 'object', additionalProperties: true }], minProperties: 2, maxProperties: 3 } };
    await generate('zod-validation', {}, data); const m = await load('types.ts');
    expect(m.CountedSchema.safeParse({ a: 1 }).success).toBe(false);
    expect(m.CountedSchema.safeParse({ a: 1, b: 2 }).success).toBe(true);
    expect(m.CountedSchema.safeParse({ a: 1, b: 2, c: 3, d: 4 }).success).toBe(false); await compile();
  });
  it('retains reference sibling constraints inside allOf branches', async () => {
    const data = schema(); data.components!.schemas = { Label: { type: 'string' }, Long: { allOf: [{ $ref: '#/components/schemas/Label', minLength: 2 }] } };
    await generate('zod-validation', {}, data); const m = await load('types.ts');
    expect(m.LongSchema.safeParse('a').success).toBe(false); expect(m.LongSchema.safeParse('ab').success).toBe(true); await compile();
  });
  it('preserves nullable reference siblings directly and inside compositions', async () => {
    const data = schema(); data.components!.schemas = { Label: { type: 'string' }, MaybeLabel: { $ref: '#/components/schemas/Label', nullable: true }, ComposedMaybe: { allOf: [{ $ref: '#/components/schemas/Label', nullable: true, minLength: 2 }] } };
    await generate('zod-validation', {}, data); const m = await load('types.ts');
    expect(m.MaybeLabelSchema.safeParse(null).success).toBe(true);
    expect(m.ComposedMaybeSchema.safeParse(null).success).toBe(true);
    expect(m.ComposedMaybeSchema.safeParse('a').success).toBe(false);
    expect(m.ComposedMaybeSchema.safeParse('ab').success).toBe(true); await compile();
  });
  it('preserves strict standalone unions and explicit branch additionalProperties constraints', async () => {
    const data = schema(); data.components!.schemas = {
      Standalone: { oneOf: [{ type: 'object', required: ['a'], properties: { a: { type: 'number' } } }, { type: 'string' }] },
      ExplicitlyClosed: { anyOf: [{ type: 'object', additionalProperties: false, required: ['a'], properties: { a: { type: 'number' } } }], required: ['id'] },
    };
    await generate('zod-validation', {}, data); const m = await load('types.ts');
    expect(m.StandaloneSchema.safeParse({ a: 1, extra: 'unknown' }).success).toBe(false);
    expect(m.StandaloneSchema.safeParse({ a: 1 }).success).toBe(true);
    expect(m.ExplicitlyClosedSchema.safeParse({ a: 1, id: 'present' }).success).toBe(false); await compile();
  });
  it('enforces object property-count bounds on schema-less dictionaries', async () => {
    const data = schema(); data.components!.schemas = { Fields: { type: 'object', additionalProperties: true, minProperties: 1, maxProperties: 2 } };
    await generate('zod-validation', {}, data); const m = await load('types.ts');
    expect(m.FieldsSchema.safeParse({}).success).toBe(false); expect(m.FieldsSchema.safeParse({ a: 1, b: 2, c: 3 }).success).toBe(false); expect(m.FieldsSchema.safeParse({ a: 1 }).success).toBe(true);
  });
  it('refreshes cached allOf validators when a referenced schema changes between generations', async () => {
    const data = schema(); data.components!.schemas = {
      Base: { type: 'object', required: ['id'], properties: { id: { type: 'number', minimum: 1 } } },
      Both: { allOf: [{ $ref: '#/components/schemas/Base' }, { type: 'object', properties: { name: { type: 'string' } } }] },
    };
    await generate('zod-validation', {}, data); expect((await load('types.ts')).BothSchema.safeParse({ id: 1 }).success).toBe(true);
    data.components!.schemas.Base = { type: 'object', required: ['id'], properties: { id: { type: 'number', minimum: 2 } } };
    await generate('zod-validation', {}, data); expect((await load('types.ts')).BothSchema.safeParse({ id: 1 }).success).toBe(false);
  });
  it('preserves invalid response data in permissive validation', async () => {
    await generate('zod-validation', { strictMode: false }); const m = await load(); const { z } = require('zod'); jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(m.validateResponse('wrong', z.number())).toBe('wrong'); await compile();
  });
  it('chooses a validation error class name outside schema exports and uses that class at runtime', async () => {
    const data = schema(); data.components!.schemas = {
      ValidationError: { type: 'object', properties: { message: { type: 'string' } } },
      ResponseValidationError: { type: 'string' }, ResponseValidationError1: { type: 'string' },
    };
    await generate('zod-validation', {}, data); const m = await load(); const { z } = require('zod');
    expect(m.ValidationError).toBeUndefined(); expect(m.ResponseValidationError2).toBeDefined();
    expect(() => m.validateRequest('bad', z.number())).toThrow(m.ResponseValidationError2);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => m.validateResponse('bad', z.number())).toThrow(m.ResponseValidationError2);
    try { m.validateRequest('bad', z.number()); } catch (error) { expect((error as Error).name).toBe('ResponseValidationError2'); }
    await compile();
  });
  it('compiles monitoring with request timing disabled and exports only active helpers', async () => {
    await generate('performance-monitoring', { enableRequestTiming: false }); const m = await load(); expect(m.PerformanceMonitor).toBeUndefined(); await compile();
  });
  it('expires generated monitoring metrics and bounds storage across endpoints', async () => {
    await generate('performance-monitoring', { maxMetricsStorage: 2, metricsTTL: 10 }); const m = await load(); let now = 1000; jest.spyOn(Date, 'now').mockImplementation(() => now);
    m.PerformanceMonitor.recordRequest('/a', 1); m.PerformanceMonitor.recordRequest('/b', 2); m.PerformanceMonitor.recordRequest('/c', 3);
    expect(m.getPerformanceStats()['/a']).toBeUndefined(); expect(m.getPerformanceStats()['/b'].count).toBe(1);
    now += 10; expect(m.getPerformanceStats()).toEqual({}); await compile();
  });
  it('emits a requested monitoring report artifact', async () => {
    await generate('performance-monitoring', { reportFormat: 'markdown', enableRequestTiming: false });
    expect(await fs.readFile(path.join(outputDir, 'performance-report.md'), 'utf8')).toContain('# Schemantic Performance Report');
  });
  it('keeps validation caches isolated by both data and schema', () => {
    const { z } = require('zod'); expect(memoizedValidation(1, z.number(), 'shared')).toBe(1);
    expect(() => memoizedValidation('bad', z.number(), 'shared')).toThrow();
    expect(() => memoizedValidation(1, z.string(), 'shared')).toThrow();
  });
  it('validates recursive branded references without requiring the validation plugin', async () => {
    const data = schema(); data.components!.schemas = { Node: { type: 'object', required: ['id'], properties: { id: { type: 'integer' }, child: { $ref: '#/components/schemas/Node' } } } };
    await generate('branded-types', {}, data); const m = await load('types.ts'); expect(m.isNode({ id: 1, child: { id: 'bad' } })).toBe(false); expect(m.isNode({ id: 1, child: { id: 2 } })).toBe(true); await compile();
  });
  it('validates referenced allOf and ref sibling constraints without rejecting sibling properties', async () => {
    const data = schema(); data.components!.schemas = {
      Base: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
      Both: { allOf: [{ $ref: '#/components/schemas/Base' }, { type: 'object', required: ['name'], properties: { name: { type: 'string' } } }] },
      Label: { type: 'string' }, LongLabel: { $ref: '#/components/schemas/Label', minLength: 2 },
      Unique: { type: 'array', uniqueItems: true, items: { type: 'object', additionalProperties: true } },
    };
    await generate('zod-validation', {}, data); const m = await load('types.ts');
    expect(m.BothSchema.safeParse({ id: 1, name: 'ok' }).success).toBe(true);
    expect(m.LongLabelSchema.safeParse('a').success).toBe(false);
    expect(m.UniqueSchema.safeParse([{ a: 1, b: 2 }, { b: 2, a: 1 }]).success).toBe(false); await compile();
  });
  it('validates media-specific binary projections as Blob while keeping JSON binary strings', async () => {
    const data = schema(); data.components!.schemas = { Upload: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary', 'x-schemantic-binary': true } } }, Encoded: { type: 'string', format: 'binary' } };
    await generate('zod-validation', {}, data); const m = await load('types.ts');
    expect(m.UploadSchema.safeParse({ file: new Blob(['bytes']) }).success).toBe(true);
    expect(m.UploadSchema.safeParse({ file: 'bytes' }).success).toBe(false);
    expect(m.EncodedSchema.safeParse('bytes').success).toBe(true); await compile();
  });
  it('distinguishes undefined from null and never reuses a caller-mutated validation result', () => {
    const { z } = require('zod'); const anySchema = z.any();
    expect(memoizedValidation(undefined, anySchema, 'nullable')).toBeUndefined();
    expect(memoizedValidation(null, anySchema, 'nullable')).toBeNull();
    const objectSchema = z.object({ id: z.number() }); const result = memoizedValidation({ id: 1 }, objectSchema, 'mutable') as { id: unknown }; result.id = 'bad';
    expect(memoizedValidation({ id: 1 }, objectSchema, 'mutable')).toEqual({ id: 1 });
  });
});
