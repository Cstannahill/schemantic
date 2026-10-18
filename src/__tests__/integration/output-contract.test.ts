import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as ts from 'typescript';
import * as http from 'http';
import { Schemantic } from '../../core/schemantic';
import { OpenAPISchema } from '../../types/openapi';
import { createTestConfig } from '../test-config';

describe('fresh generated output contract', () => {
  let outputDir: string;
  beforeEach(async () => { outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemantic-contract-')); });
  afterEach(async () => { await fs.rm(outputDir, { recursive: true, force: true }); });

  const schema = (): OpenAPISchema => ({
    openapi: '3.1.0', info: { title: 'Contract API', version: '1' }, paths: {},
    components: { schemas: {
      User: { type: 'object', required: ['user_id'], properties: { user_id: { type: 'string' } } },
    } },
  });

  async function generate(data: OpenAPISchema, overrides = {}) {
    const result = await new Schemantic(createTestConfig({ schemaData: data, outputDir, ...overrides })).generate();
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    return result;
  }

  async function compile(consumer: string) {
    const consumerFile = path.join(outputDir, 'consumer.ts');
    await fs.writeFile(consumerFile, consumer);
    const files = (await fs.readdir(outputDir)).filter(f => f.endsWith('.ts')).map(f => path.join(outputDir, f));
    const program = ts.createProgram(files, {
      strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
      skipLibCheck: true, types: [], lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
      baseUrl: process.cwd(), paths: { zod: ['node_modules/zod'] },
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
  }

  async function loadClient() {
    const source = await fs.readFile(path.join(outputDir, 'api-client.ts'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
    const module = { exports: {} as Record<string, new (config: unknown) => Record<string, (...args: unknown[]) => Promise<unknown>>> };
    new Function('exports', 'require', compiled.outputText)(module.exports, require);
    return module.exports.ContractApiClient!;
  }

  it('preserves wire properties and compiles composition, arrays, aliases, dictionaries and nullability', async () => {
    const data = schema();
    Object.assign(data.components!.schemas!, {
      Users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
      Alias: { $ref: '#/components/schemas/User' },
      Choice: { anyOf: [{ type: 'string' }, { type: 'number' }] },
      Both: { allOf: [{ $ref: '#/components/schemas/User' }, { type: 'object', required: ['active'], properties: { active: { type: 'boolean' } } }] },
      Lookup: { type: 'object', additionalProperties: { $ref: '#/components/schemas/User' } },
      Fields: { type: 'object', properties: {
        values: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'number' }] } },
        nullable: { type: ['string', 'null'], format: 'date-time' },
        legacy: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['active', 'inactive'] },
        'x-trace': { type: 'string' },
      } },
    });
    await generate(data);
    await compile(`import { User, Users, Alias, Choice, Both, Lookup, Fields } from './index';
const user: User = { user_id: '1' };
const users: Users = [user]; const alias: Alias = user;
const choice: Choice = 1; const both: Both = { ...user, active: true };
const lookup: Lookup = { a: user };
const fields: Fields = { values: ['a', 1], nullable: null, legacy: null, status: 'active', 'x-trace': 'yes' };
// @ts-expect-error invalid enum value
const invalid: Fields = { status: 'other' };`);
  });

  it('exports enum values, config and errors through the generated entry point', async () => {
    const data = schema();
    data.components!.schemas!.Status = { type: 'string', enum: ['active', 'inactive'] };
    await generate(data);
    await compile(`import { Status, ApiClientError, ApiClientConfig, ContractApiClient } from './index';
const status = Status.ACTIVE; const config: ApiClientConfig = { baseUrl: 'http://localhost' };
const client = new ContractApiClient(config); const error = new ApiClientError('failed');`);
  });

  it('compiles inherited referenced parameters and required bodies following optional queries', async () => {
    const data = schema();
    data.components!.parameters = { Id: { name: 'user-id', in: 'path', required: true, schema: { type: 'string' } } };
    data.components!.requestBodies = { Update: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } };
    data.components!.responses = { User: { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } };
    data.paths['/users/{user-id}'] = { parameters: [{ $ref: '#/components/parameters/Id' }], post: {
      operationId: 'update-user', parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }],
      requestBody: { $ref: '#/components/requestBodies/Update' }, responses: { '200': { $ref: '#/components/responses/User' } },
    } };
    await generate(data);
    await compile(`import { ContractApiClient } from './index';
const client = new ContractApiClient({ baseUrl: 'http://localhost' });
client.updateUser('a', undefined, { user_id: '1' });`);
  });

  it('sends encoded paths, repeated query arrays, header parameters and merged Headers', async () => {
    const data = schema();
    data.paths['/users/{user_id}'] = { get: {
      operationId: 'getUser', parameters: [
        { name: 'user_id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'tag', in: 'query', schema: { type: 'array', items: { type: 'string' } } },
        { name: 'X-Trace', in: 'header', schema: { type: 'string' } },
      ], responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'object' } } } } },
    } };
    await generate(data);
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ url: req.url, auth: req.headers.authorization, trace: req.headers['x-trace'], extra: req.headers.extra }));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address() as { port: number };
      const Client = await loadClient();
      const client = new Client({ baseUrl: `http://127.0.0.1:${address.port}`, headers: { Authorization: 'Bearer token' }, retries: 0 });
      const response = await client.getUser!('a/b ?#', ['one', 'two'], 'trace', { headers: new Headers({ extra: 'yes' }) });
      expect(response).toEqual({ url: '/users/a%2Fb%20%3F%23?tag=one&tag=two', auth: 'Bearer token', trace: 'trace', extra: 'yes' });
    } finally { await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())); }
  });

  it('clears stale schemas between generations and leaves input untouched', async () => {
    const data = schema();
    const original = JSON.stringify(data);
    const generator = new Schemantic(createTestConfig({ schemaData: data, outputDir }));
    expect((await generator.generate()).success).toBe(true);
    expect(JSON.stringify(data)).toBe(original);
    data.components!.schemas = { Fresh: { type: 'string' } };
    const second = await generator.generate();
    expect(second.statistics.totalTypes).toBe(1);
    await compile(`import { Fresh } from './index'; const fresh: Fresh = 'yes';`);
  });

  it('rejects malformed schemas before writing output', async () => {
    const data = schema(); data.info.version = '';
    const result = await new Schemantic(createTestConfig({ schemaData: data, outputDir })).generate();
    expect(result.success).toBe(false);
    expect(await fs.readdir(outputDir)).toEqual([]);
  });

  it('compiles hooks with prefixes, a custom client filename and inherited parameters', async () => {
    const data = schema();
    data.paths['/users/{user-id}'] = { parameters: [{ name: 'user-id', in: 'path', required: true, schema: { type: 'string' } }], get: {
      operationId: 'getUser', parameters: [{ name: 'X-Trace', in: 'header', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
    }, post: {
      operationId: 'updateUser', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'session', in: 'cookie', schema: { type: 'string' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
      responses: { '204': { description: 'ok' } },
    } };
    await generate(data, { generateHooks: true, outputFileName: 'service.ts', typePrefix: 'My' });
    // Match the React signatures without requiring React in the generator package.
    await fs.writeFile(path.join(outputDir, 'react.d.ts'), `declare module 'react' {
export function useState<T>(initial: T): [T, (value: T) => void];
export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
export function useCallback<T extends Function>(callback: T, deps: readonly unknown[]): T;
export function useRef<T>(initial: T): { current: T };
}`);
    await compile(`import { createApiHooks, ContractApiClient } from './index';
const hooks = createApiHooks(new ContractApiClient({ baseUrl: 'http://localhost' }));
hooks.useGetUserQuery({ path: { 'user-id': '1' }, header: { 'X-Trace': 'yes' } });
hooks.useUpdateUserMutation().mutate({ path: { 'user-id': '1' }, body: { user_id: '1' } });`);
  });

  it('applies path filters and retains schema dependencies when filtering types', async () => {
    const data = schema();
    data.components!.schemas!.Container = { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } };
    data.paths = { '/health': { get: { responses: { '204': { description: 'ok' } } } }, '/api/users': { get: { responses: { '200': { description: 'ok' } } } } };
    const result = await generate(data, { includePaths: ['/api/*'], includeSchemas: ['Container'] });
    expect(result.statistics.totalEndpoints).toBe(1);
    expect(result.statistics.totalTypes).toBe(2);
    await compile(`import { User, Container } from './index'; const value: Container = { user: { user_id: '1' } };`);
  });

  it('reports unresolved references instead of writing uncompilable output', async () => {
    const data = schema();
    data.components!.schemas!.Bad = { type: 'object', properties: { item: { $ref: '#/components/schemas/Missing' } } };
    const result = await new Schemantic(createTestConfig({ schemaData: data, outputDir })).generate();
    expect(result.success).toBe(false);
    expect(result.errors.some(error => /Missing/.test(error.message))).toBe(true);
  });

  it('compiles unusual type names and enum literals without duplicate or invalid members', async () => {
    const data = schema();
    Object.assign(data.components!.schemas!, {
      '123-model': { type: 'string' },
      Status: { type: 'string', enum: ['a-b', 'a b', '', 'active'] },
      Numeric: { type: 'number', enum: [-1, 1.5, 1e21] },
      Mixed: { enum: ['value_1', 1] },
      NullableStatus: { type: 'string', enum: ['active'], nullable: true },
      Flags: { type: 'boolean', enum: [true, false] },
    });
    await generate(data);
    await compile(`import { _123Model, Status, Numeric, Flags, Mixed, NullableStatus } from './index';
const value: _123Model = 'yes'; const status = Status.ACTIVE;
const number: Numeric = -1; const flag: Flags = true; const mixed = Mixed.VALUE_1;
const nullable: NullableStatus = null;`);
  });

  it('compiles colliding method and local names consistently', async () => {
    const data = schema();
    const responses = { '204': { description: 'ok' } };
    data.paths = {
      '/a': { get: { operationId: 'get-item', responses } },
      '/b': { get: { operationId: 'get_item', responses, parameters: [
        { name: 'options', in: 'query', schema: { type: 'string' } },
        { name: 'class', in: 'query', schema: { type: 'string' } },
        ...['throw', 'catch', 'eval', 'arguments', 'typeof', 'false'].map(name => ({ name, in: 'query' as const, schema: { type: 'string' as const } })),
      ] } },
    };
    await generate(data);
    await compile(`import { ContractApiClient } from './index';
const client = new ContractApiClient({ baseUrl: 'http://localhost' });
client.getItem(); client.getItem2('a', 'b');`);
  });

  it('decodes text, binary and empty successes instead of always parsing JSON', async () => {
    const data = schema();
    data.paths = {
      '/text': { get: { operationId: 'getText', responses: { '200': { description: 'ok', content: { 'text/plain': { schema: { type: 'string' } } } } } } },
      '/binary': { get: { operationId: 'getBinary', responses: { '200': { description: 'ok', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } } } } },
      '/empty': { get: { operationId: 'getEmpty', responses: { '200': { description: 'ok' } } } },
    };
    await generate(data);
    await compile(`import { ContractApiClient } from './index'; const client = new ContractApiClient({ baseUrl: 'http://localhost' });
const binary: Promise<Blob> = client.getBinary(); const text: Promise<string> = client.getText();`);
    const server = http.createServer((req, res) => {
      if (req.url === '/text') { res.setHeader('Content-Type', 'text/plain'); res.end('hello'); }
      else if (req.url === '/binary') { res.setHeader('Content-Type', 'application/octet-stream'); res.end(Buffer.from([1, 2, 3])); }
      else res.end();
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const Client = await loadClient();
      const client = new Client({ baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}`, retries: 0 });
      expect(await client.getText!()).toBe('hello');
      const binary = await client.getBinary!() as Blob;
      expect([...new Uint8Array(await binary.arrayBuffer())]).toEqual([1, 2, 3]);
      expect(await client.getEmpty!()).toBeUndefined();
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });

  it('retries transient reads with zero delay while avoiding repeated mutations and client errors', async () => {
    const data = schema();
    const responses = { '204': { description: 'ok' } };
    data.paths = { '/retry': { get: { operationId: 'retryRead', responses } }, '/error': { get: { operationId: 'clientError', responses } }, '/mutation': { post: { operationId: 'createItem', responses } } };
    await generate(data);
    const requests: Record<string, number> = {};
    const server = http.createServer((req, res) => {
      const route = req.url!; requests[route] = (requests[route] || 0) + 1;
      res.statusCode = route === '/error' ? 400 : route === '/retry' && requests[route]! > 1 ? 204 : 503;
      res.end();
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const Client = await loadClient();
      const client = new Client({ baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}`, retries: 2, retryDelay: 0 });
      expect(await client.retryRead!()).toBeUndefined();
      await expect(client.clientError!()).rejects.toMatchObject({ status: 400 });
      await expect(client.createItem!()).rejects.toMatchObject({ status: 503 });
      expect(requests).toEqual({ '/retry': 2, '/error': 1, '/mutation': 1 });
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });

  it('keeps nullable objects and enum strings named null nullable', async () => {
    const data = schema();
    data.components!.schemas!.NullFields = { type: 'object', required: ['value'], properties: {
      value: { type: 'object', nullable: true, properties: { null: { type: 'string' } } },
      literal: { type: 'string', enum: ['null'], nullable: true },
    } };
    await generate(data);
    await compile(`import { NullFields } from './index'; const fields: NullFields = { value: null, literal: null };`);
  });

  it('resolves nested JSON pointers and does not prune definitions needed by unused components', async () => {
    const data = schema();
    data.components!.schemas!.Inner = { $ref: '#/components/schemas/User/properties/user_id' };
    data.components!.responses = { Unused: { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } };
    await generate(data, { generateApiClient: false, includeSchemas: ['Inner'] });
    await compile(`import { Inner } from './index'; const value: Inner = 'yes';`);
  });

  it.each(['validation', 'zod-validation', 'request-deduplication', 'branded-types', 'performance-monitoring'])('compiles configured built-in plugin %s output', async name => {
    const data = schema();
    await generate(data, { plugins: [{ name, enabled: true }] });
    await compile(`import { User } from './index'; const user: User = { user_id: '1' };`);
    const types = await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8');
    const client = await fs.readFile(path.join(outputDir, 'api-client.ts'), 'utf8');
    if (name.includes('validation')) expect(types).toContain('validateUser');
    if (name === 'request-deduplication') expect(client).toContain('RequestDeduplicator');
    if (name === 'branded-types') expect(types).toContain('BrandedUser');
    if (name === 'performance-monitoring') expect(client).toContain('PerformanceMonitor');
  });

  it('runs custom type generators and preserves every custom client file', async () => {
    const generator = new Schemantic(createTestConfig({ schemaData: schema(), outputDir }));
    generator.getPluginManager().registerPlugin({ name: 'custom', version: '1', description: 'test',
      customTypeGenerators: { label: sourceSchema => ({ name: 'UserLabel', content: 'export type UserLabel = string;', exports: ['UserLabel'], dependencies: [], isInterface: false, isEnum: false, isUnion: false, sourceSchema }) },
      customClientGenerators: { extra: () => ({ name: 'ExtraClient', content: 'export class ExtraClient {}', exports: ['ExtraClient'], dependencies: [], endpoints: [] }) },
    });
    generator.getPluginManager().enablePlugin('custom');
    const result = await generator.generate();
    expect(result.success).toBe(true);
    expect(new Set(result.generatedFiles.map(file => file.path)).size).toBe(result.generatedFiles.length);
    await compile(`import { UserLabel, ExtraClient, ContractApiClient } from './index'; const label: UserLabel = 'yes'; const extra = new ExtraClient();`);
  });
  it('rejects secondary enum export collisions before writing output', async () => {
    const data = schema();
    Object.assign(data.components!.schemas!, { Status: { type: 'string', enum: ['active'] }, StatusValues: { type: 'string' } });
    const result = await new Schemantic(createTestConfig({ schemaData: data, outputDir })).generate();
    expect(result.success).toBe(false);
    expect(result.errors.some(error => error.message.includes('StatusValues'))).toBe(true);
    expect(await fs.readdir(outputDir)).toEqual([]);
  });

  it('compiles a nested client filename with imports relative to its directory', async () => {
    const data = schema();
    data.paths['/user'] = { get: { operationId: 'getUser', responses: { '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } } };
    await generate(data, { outputFileName: 'client/service.ts' });
    await compile("import { ContractApiClient } from './index'; new ContractApiClient({ baseUrl: 'http://localhost' }).getUser();");
  });

  it('serializes referenced query arrays and URL-encoded object bodies', async () => {
    const data = schema();
    data.components!.schemas!.Tags = { type: 'array', items: { type: 'string' } };
    data.paths['/form'] = { post: { operationId: 'sendForm', parameters: [
      { name: 'tag', in: 'query', schema: { $ref: '#/components/schemas/Tags' } },
    ], requestBody: { required: true, content: { 'application/x-www-form-urlencoded': { schema: {
      type: 'object', required: ['field'], properties: { field: { type: 'string' } },
    } } } }, responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'object' } } } } } } };
    await generate(data);
    await compile("import { ContractApiClient } from './index'; new ContractApiClient({ baseUrl: 'http://localhost' }).sendForm(['a','b'], { field: 'hello world' });");
    const server = http.createServer((req, res) => {
      let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => {
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ url: req.url, body }));
      });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const Client = await loadClient();
      const client = new Client({ baseUrl: 'http://127.0.0.1:' + (server.address() as { port: number }).port });
      expect(await client.sendForm!(['a', 'b'], { field: 'hello world' })).toEqual({ url: '/form?tag=a&tag=b', body: 'field=hello+world' });
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });

  async function loadGenerated(file: string): Promise<Record<string, unknown>> {
    const source = await fs.readFile(path.join(outputDir, file), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
    const exports: Record<string, unknown> = {};
    new Function('exports', 'require', compiled.outputText)(exports, require);
    return exports;
  }

  it('tracks branded authentication metadata through transitions', async () => {
    await generate(schema(), { plugins: [{ name: 'branded-types', enabled: true }] });
    const output = await loadGenerated('types.ts') as Record<string, (data: unknown) => unknown>;
    const input = { user_id: '1', __auth: 'unauthenticated' };
    expect(output.isAuthenticatedUser!(input)).toBe(false);
    const authorized = output.authorizeUser!(input);
    expect(output.isAuthenticatedUser!(authorized)).toBe(true);
    expect(output.isAuthenticatedUser!(output.unauthorizeUser!(authorized))).toBe(false);
    expect(input.__auth).toBe('unauthenticated');
  });

  it('honors disabled coalescing and keeps mutation requests out of deduplication caches', async () => {
    await generate(schema(), { plugins: [{ name: 'request-deduplication', enabled: true, options: { enableCoalescing: false } }] });
    const output = await loadGenerated('api-client.ts');
    const Deduplicator = output.RequestDeduplicator as new () => { execute(method: string, url: string, factory: () => Promise<number>): Promise<number> };
    const deduplicator = new Deduplicator();
    const read = jest.fn(async () => 1);
    await Promise.all([deduplicator.execute('GET', '/read', read), deduplicator.execute('GET', '/read', read)]);
    expect(read).toHaveBeenCalledTimes(2);
    const write = jest.fn(async () => 2);
    await deduplicator.execute('POST', '/write', write); await deduplicator.execute('POST', '/write', write);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('serves stale cached reads while refreshing and honors stale mode being disabled', async () => {
    await generate(schema(), { plugins: [{ name: 'request-deduplication', enabled: true, options: { defaultTTL: 10 } }] });
    const output = await loadGenerated('api-client.ts');
    type Cache = { set(key: string, value: number, ttl?: number): void; get(key: string): number | undefined; revalidateInBackground(key: string, refresh: () => Promise<number>): void };
    const Manager = output.CacheManager as new (options: { defaultTTL: number; enableStaleWhileRevalidate: boolean; debugLogging: boolean }) => Cache;
    let now = 100;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      const cache = new Manager({ defaultTTL: 10, enableStaleWhileRevalidate: true, debugLogging: false });
      cache.set('read', 1); now = 111;
      expect(cache.get('read')).toBe(1); expect(cache.get('read')).toBe(1);
      cache.revalidateInBackground('read', async () => 2);
      await Promise.resolve(); await Promise.resolve();
      expect(cache.get('read')).toBe(2);
      const strict = new Manager({ defaultTTL: 10, enableStaleWhileRevalidate: false, debugLogging: false });
      strict.set('read', 1); now = 122;
      expect(strict.get('read')).toBeUndefined();
    } finally { clock.mockRestore(); }
  });

});
