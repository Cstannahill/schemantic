import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import * as http from 'http';
import { Schemantic } from '../../core/schemantic';
import { OpenAPISchema, OpenAPIResponse, OpenAPISchemaObject, OpenAPIRef } from '../../types/openapi';

describe('re-audit generated client contracts', () => {
  let outputDir: string;
  beforeEach(async () => { outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemantic-client-')); });
  afterEach(async () => { await fs.rm(outputDir, { recursive: true, force: true }); });
  const schema = (): OpenAPISchema => ({ openapi: '3.0.3', info: { title: 'Audit', version: '1' }, paths: {}, components: { schemas: {} } });
  const response = (media: string, value?: OpenAPISchemaObject | OpenAPIRef): OpenAPIResponse => ({ description: 'ok', content: { [media]: value === undefined ? {} : { schema: value } } });
  async function generate(data: OpenAPISchema) {
    const result = await new Schemantic({ outputDir, schemaData: data }).generate();
    expect(result.errors).toEqual([]); expect(result.success).toBe(true);
    return result;
  }
  async function compile(consumer = '', extra: ts.CompilerOptions = {}) {
    await fs.writeFile(path.join(outputDir, 'consumer.ts'), consumer);
    const program = ts.createProgram((await fs.readdir(outputDir)).filter(name => name.endsWith('.ts')).map(name => path.join(outputDir, name)), {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, strict: true, exactOptionalPropertyTypes: true,
      noUncheckedIndexedAccess: true, skipLibCheck: true, types: [], lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], noEmit: true, ...extra,
    });
    expect(ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
  }
  async function client(baseUrl: string, headers = {}) {
    const source = await fs.readFile(path.join(outputDir, 'api-client.ts'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
    const exports: Record<string, new (config: unknown) => Record<string, (...args: unknown[]) => unknown>> = {};
    const generatedRequire = (name: string) => {
      if (name !== './conversion.js') return require(name);
      const code = require('fs').readFileSync(path.join(outputDir, 'conversion.ts'), 'utf8') as string;
      const values = {};
      new Function('exports', ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText)(values);
      return values;
    };
    new Function('exports', 'require', compiled.outputText)(exports, generatedRequire);
    return new exports.AuditApiClient!({ baseUrl, headers, retries: 0 });
  }
  async function serverRun(handler: http.RequestListener, run: (url: string) => Promise<void>) {
    const server = http.createServer(handler);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try { await run(`http://127.0.0.1:${(server.address() as { port: number }).port}`); }
    finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  }

  it.each(['camelCase', 'preserve'] as const)('compiles FastAPI error responses under Vite strict flags with %s properties', async propertyNaming => {
    const data = schema();
    data.components!.schemas = {
      User: { type: 'object', required: ['user_id'], properties: { user_id: { type: 'string' } } },
      HTTPValidationError: { type: 'object', properties: { detail: { type: 'string' } } },
      Error: { type: 'object', properties: { message: { type: 'string' } } },
    };
    data.paths['/users'] = { get: { operationId: 'getUsers', responses: {
      '200': response('application/json', { type: 'array', items: { $ref: '#/components/schemas/User' } }),
      '422': response('application/json', { $ref: '#/components/schemas/HTTPValidationError' }),
      '500': response('application/json', { $ref: '#/components/schemas/Error' }),
    } } };
    // Error-shaped schemas still need imports when used by actual request/default-response signatures.
    data.paths['/validation'] = { post: { operationId: 'validate', requestBody: { required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      responses: { default: response('application/json', { $ref: '#/components/schemas/Error' }) } } };
    const result = await new Schemantic({ outputDir, schemaData: data, propertyNaming }).generate();
    expect(result.errors).toEqual([]); expect(result.success).toBe(true);
    const key = propertyNaming === 'camelCase' ? 'userId' : 'user_id';
    await compile(`import { AuditApiClient, ApiClientError } from './index.js';
import type { User, Error as ErrorPayload } from './types.js';
declare const api: AuditApiClient;
const users: Promise<User[]> = api.getUsers(); void users;
const validation: Promise<ErrorPayload> = api.validate({message:'invalid'}); void validation;
void api.getUsers().then(users => users[0]?.${key});
const failure = new ApiClientError('failed', 422, new Response());
const status: number | undefined = failure.status; void status;
const response: Response | undefined = failure.response; void response;
const optionalFields: Pick<ApiClientError, 'status' | 'response'> = {}; void optionalFields;
`, { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      verbatimModuleSyntax: true, isolatedModules: true, noUnusedLocals: true,
      noUnusedParameters: true, erasableSyntaxOnly: true });
  });

  it.each(['camelCase', 'preserve'] as const)('accepts modern FastAPI uploads with %s properties and keeps JSON/encoded strings intact', async propertyNaming => {
    const data = schema(); data.openapi = '3.1.0';
    data.components!.schemas = {
      FilePart: { type: 'string', contentMediaType: 'application/octet-stream' },
      Upload: { type: 'object', required: ['file_data', 'file_list', 'encoded_data'], properties: {
        file_data: { $ref: '#/components/schemas/FilePart' },
        file_list: { type: 'array', items: { $ref: '#/components/schemas/FilePart' } },
        maybe_file: { anyOf: [{ $ref: '#/components/schemas/FilePart' }, { type: 'null' }] },
        encoded_data: { type: 'string', contentMediaType: 'image/png', contentEncoding: 'base64' },
      } },
    };
    for (const [operationId, media] of [['upload', 'multipart/form-data'], ['json', 'application/json']] as const) {
      data.paths['/' + operationId] = { post: { operationId, requestBody: { required: true,
        content: { [media]: { schema: { $ref: '#/components/schemas/Upload' } } } }, responses: { '200': response('application/json', { type: 'object' }) } } };
    }
    data.paths['/inline'] = { post: { operationId: 'inline', requestBody: { required: true,
      content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: {
        file: { type: 'string', contentMediaType: 'application/octet-stream' },
      } } } } }, responses: { '200': response('application/json', { type: 'object' }) } } };
    const result = await new Schemantic({ outputDir, schemaData: data, propertyNaming }).generate();
    expect(result.errors).toEqual([]); expect(result.success).toBe(true);
    const [file, list, encoded, maybe] = propertyNaming === 'camelCase'
      ? ['fileData', 'fileList', 'encodedData', 'maybeFile'] : ['file_data', 'file_list', 'encoded_data', 'maybe_file'];
    await compile(`import { AuditApiClient } from './index.js'; declare const api: AuditApiClient;
void api.upload({${file}: new Blob(['data']), ${list}: [new Blob(['data'])], ${encoded}: 'ZGF0YQ==', ${maybe}: null});
void api.json({${file}: 'wire-string', ${list}: ['wire-string'], ${encoded}: 'ZGF0YQ=='});
void api.inline({file: new Blob(['data'])});
// @ts-expect-error upload references must resolve to binary projections
void api.upload({${file}: 'data', ${list}: [], ${encoded}: 'ZGF0YQ=='});
// @ts-expect-error contentEncoding must not turn an encoded string into a Blob
void api.upload({${file}: new Blob(), ${list}: [], ${encoded}: new Blob()});
// @ts-expect-error JSON representations remain strings
void api.json({${file}: new Blob(), ${list}: [], ${encoded}: 'ZGF0YQ=='});`);
  });

  it('replaces and clears authorization independent of original header spelling', async () => {
    const data = schema(); data.paths['/auth'] = { get: { operationId: 'auth', responses: { '200': response('application/json', { type: 'object' }) } } };
    await generate(data);
    await serverRun((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ authorization: req.headers.authorization ?? null })); }, async url => {
      const api = await client(url, { authorization: 'Bearer original' }); api.setAuthToken!('new');
      expect(await api.auth!()).toEqual({ authorization: 'Bearer new' }); api.clearAuthToken!();
      expect(await api.auth!()).toEqual({ authorization: null });
    });
  });

  it.each(['binary', 'default'])('preserves %s response bodies without explicit 200 schema', async kind => {
    const data = schema(); data.paths['/body'] = { get: { operationId: 'body', responses: kind === 'binary' ? { '200': response('application/octet-stream') } : { default: response('application/json', { type: 'object' }) } } };
    await generate(data);
    await serverRun((_req, res) => { res.setHeader('Content-Type', kind === 'binary' ? 'application/octet-stream' : 'application/json'); res.end(kind === 'binary' ? 'bytes' : '{"ok":true}'); }, async url => {
      const result = await (await client(url)).body!();
      if (kind === 'binary') { expect(result).toBeInstanceOf(Blob); expect(await (result as Blob).text()).toBe('bytes'); }
      else expect(result).toEqual({ ok: true });
    });
  });

  it('types all successful media alternatives and decodes XML text', async () => {
    const data = schema(); data.paths['/mixed'] = { get: { operationId: 'mixed', responses: { '200': { description: 'ok', content: {
      'text/plain': { schema: { type: 'string' } }, 'application/json': { schema: { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' } } } },
    } } } } }; data.paths['/xml'] = { get: { operationId: 'xml', responses: { '200': response('application/xml', { type: 'string' }) } } };
    await generate(data);
    await compile(`import { AuditApiClient } from "./index.js"; declare const client: AuditApiClient; const result: Promise<string | {ok:boolean}> = client.mixed(); void result;
// @ts-expect-error the JSON alternative prevents promising only text
const onlyText: Promise<string> = client.mixed(); void onlyText;`);
    await serverRun((req, res) => { res.setHeader('Content-Type', req.url === '/xml' ? 'application/xml' : 'application/json'); res.end(req.url === '/xml' ? '<ok>true</ok>' : '{"ok":true}'); }, async url => {
      const api = await client(url); expect(await api.xml!()).toBe('<ok>true</ok>'); expect(await api.mixed!()).toEqual({ ok: true });
    });
  });

  it('uses form/explode object query serialization', async () => {
    const data = schema(); data.paths['/query'] = { get: { operationId: 'query', parameters: [{ name: 'filter', in: 'query', schema: { type: 'object', properties: { role: { type: 'string' }, active: { type: 'boolean' } } } }], responses: { '200': response('application/json', { type: 'object' }) } } };
    await generate(data);
    await serverRun((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ url: req.url })); }, async url => {
      expect(await (await client(url)).query!({ role: 'admin', active: true })).toEqual({ url: '/query?role=admin&active=true' });
    });
  });

  it('defaults to camelCase and converts nested inline, referenced and query payloads at HTTP boundaries', async () => {
    const data = schema();
    const payload: OpenAPISchemaObject = { type: 'object', required: ['user_id', 'profile_data'], properties: {
      user_id: { type: 'string' }, profile_data: { type: 'array', items: { type: 'object', properties: { display_name: { type: 'string' } } } },
      metadata_map: { type: 'object', additionalProperties: { type: 'object', properties: { item_name: { type: 'string' } } } },
    } };
    data.components!.schemas!.User = payload;
    data.paths['/users'] = { post: { operationId: 'save', parameters: [{ name: 'filter', in: 'query', schema: { type: 'object', properties: { active_only: { type: 'boolean' } } } }],
      requestBody: { required: true, content: { 'application/json': { schema: payload } } },
      responses: { '200': response('application/json', { $ref: '#/components/schemas/User' }) } } };
    await generate(data);
    await compile(`import { AuditApiClient, User, serializeUser, deserializeUser } from './index.js'; declare const api: AuditApiClient;
const user: User = {userId:'1',profileData:[{displayName:'Ada'}]}; api.save({activeOnly:true},user);
serializeUser(user); deserializeUser({user_id:'1',profile_data:[]});
// @ts-expect-error default types use application properties
const wire: User = {user_id:'1',profile_data:[]}; void wire;`);
    await serverRun((req, res) => { let body = ''; req.on('data', chunk => { body += String(chunk); }); req.on('end', () => {
      expect(req.url).toBe('/users?active_only=true');
      expect(JSON.parse(body)).toEqual({ user_id: '1', profile_data: [{ display_name: 'Ada' }], metadata_map: { arbitrary_key: { item_name: 'x' } } });
      res.setHeader('Content-Type', 'application/json'); res.end(body);
    }); }, async url => {
      expect(await (await client(url)).save!({ activeOnly: true }, { userId: '1', profileData: [{ displayName: 'Ada' }], metadataMap: { arbitrary_key: { itemName: 'x' } } })).toEqual(
        { userId: '1', profileData: [{ displayName: 'Ada' }], metadataMap: { arbitrary_key: { itemName: 'x' } } });
    });
    expect(data.components!.schemas!.User).toEqual(payload);
  });

  it('allows explicit preserve mode for existing wire-shaped consumers', async () => {
    const data = schema(); data.components!.schemas!.User = { type: 'object', required: ['user_id'], properties: { user_id: { type: 'string' } } };
    data.paths['/users'] = { post: { operationId: 'save', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, responses: { '200': response('application/json', { $ref: '#/components/schemas/User' }) } } };
    expect((await new Schemantic({ outputDir, schemaData: data, propertyNaming: 'preserve' }).generate()).success).toBe(true);
    await compile(`import { AuditApiClient, User } from './index.js'; declare const api: AuditApiClient; const value: User = {user_id:'1'}; api.save(value);`);
    await serverRun((req, res) => { req.pipe(res); res.setHeader('Content-Type', 'application/json'); }, async url => {
      expect(await (await client(url)).save!({ user_id: '1' })).toEqual({ user_id: '1' });
    });
  });

  it('resolves Path Item refs instead of silently dropping operations', async () => {
    const data = schema(); data.openapi = '3.1.0'; data.components!.pathItems = { Shared: { get: { operationId: 'shared', responses: { '200': response('text/plain', { type: 'string' }) } } } };
    data.paths['/shared'] = { $ref: '#/components/pathItems/Shared' };
    expect((await generate(data)).statistics.totalEndpoints).toBe(1);
  });

  it('projects readOnly/writeOnly types and binary upload components', async () => {
    const data = schema(); data.components!.schemas = {
      User: { type: 'object', required: ['id', 'name', 'password'], properties: { id: { type: 'string', readOnly: true }, name: { type: 'string' }, password: { type: 'string', writeOnly: true } } },
      Upload: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } },
    };
    data.paths['/users'] = { post: { operationId: 'createUser', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, responses: { '200': response('application/json', { $ref: '#/components/schemas/User' }) } } };
    data.paths['/upload'] = { post: { operationId: 'upload', requestBody: { required: true, content: { 'multipart/form-data': { schema: { $ref: '#/components/schemas/Upload' } } } }, responses: { '204': { description: 'ok' } } } };
    await generate(data);
    await compile(`import { AuditApiClient, UserResponse } from './index.js'; declare const client: AuditApiClient;
const user: Promise<UserResponse> = client.createUser({name:'Ada',password:'secret'}); void user;
client.upload({file:new Blob(['bytes'])});
const response: UserResponse = {id:'1',name:'Ada'}; void response;
// @ts-expect-error password is not a response property
const invalid: UserResponse = {id:'1',name:'Ada',password:'secret'}; void invalid;`);
  });

  it('uses directional wire projections for union conversion and nested multipart references', async () => {
    const data = schema(); data.components!.schemas = {
      User: { type: 'object', required: ['user_id', 'secret_word'], properties: { user_id: { type: 'string', readOnly: true }, secret_word: { type: 'string', writeOnly: true } } },
      Bot: { type: 'object', required: ['bot_id', 'access_key'], properties: { bot_id: { type: 'string', readOnly: true }, access_key: { type: 'string', writeOnly: true } } },
      Choice: { oneOf: [{ $ref: '#/components/schemas/User' }, { $ref: '#/components/schemas/Bot' }] },
      Upload: { type: 'object', required: ['child', 'file'], properties: { child: { $ref: '#/components/schemas/User' }, file: { type: 'string', format: 'binary' } } },
    };
    data.paths['/choice'] = { post: { operationId: 'choice', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Choice' } } } }, responses: { '200': response('application/json', { $ref: '#/components/schemas/Choice' }) } } };
    data.paths['/upload'] = { post: { operationId: 'upload', requestBody: { required: true, content: { 'multipart/form-data': { schema: { $ref: '#/components/schemas/Upload' } } } }, responses: { '204': { description: 'ok' } } } };
    await generate(data);
    await compile(`import { AuditApiClient } from './index.js'; declare const api: AuditApiClient; api.choice({secretWord:'secret'}); api.upload({child:{secretWord:'secret'},file:new Blob(['b'])});`);
    await serverRun((req, res) => { let body = ''; req.on('data', chunk => { body += String(chunk); }); req.on('end', () => {
      expect(JSON.parse(body)).toEqual({ secret_word: 'secret' }); res.setHeader('Content-Type', 'application/json'); res.end('{"user_id":"1"}');
    }); }, async url => { expect(await (await client(url)).choice!({ secretWord: 'secret' })).toEqual({ userId: '1' }); });
  });

  it('uploads actual raw bytes, repeated multipart parts and supplied FormData boundaries', async () => {
    const data = schema();
    data.paths['/raw'] = { post: { operationId: 'raw', requestBody: { required: true, content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } }, responses: { '204': { description: 'ok' } } } };
    data.paths['/parts'] = { post: { operationId: 'parts', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file_parts'], properties: { file_parts: { type: 'array', items: { type: 'string', format: 'binary' } } } } } } }, responses: { '204': { description: 'ok' } } } };
    await generate(data);
    await compile(`import { AuditApiClient } from './index.js'; declare const api: AuditApiClient; api.raw(new Blob(['raw'])); api.parts({fileParts:[new Blob(['a']),new Blob(['b'])]});`);
    const uploads: { url: string; contentType: string; bytes: Buffer }[] = [];
    await serverRun((req, res) => { const chunks: Buffer[] = []; req.on('data', chunk => chunks.push(Buffer.from(chunk))); req.on('end', () => {
      uploads.push({ url: req.url!, contentType: String(req.headers['content-type']), bytes: Buffer.concat(chunks) }); res.statusCode = 204; res.end();
    }); }, async url => {
      const api = await client(url); await api.raw!(new Blob([new Uint8Array([0, 1, 255, 2])]));
      await api.parts!({ fileParts: [new Blob(['first']), new Blob(['second'])] });
      const form = new FormData(); form.append('caller_key', new Blob(['caller bytes']), 'name.bin'); await api.parts!(form);
    });
    expect([...uploads[0]!.bytes]).toEqual([0, 1, 255, 2]); expect(uploads[0]!.contentType).toBe('application/octet-stream');
    expect(uploads[1]!.contentType).toMatch(/^multipart\/form-data; boundary=/); expect(uploads[1]!.bytes.toString().match(/name="file_parts"/g)).toHaveLength(2);
    expect(uploads[1]!.bytes.toString()).toContain('first'); expect(uploads[1]!.bytes.toString()).toContain('second');
    expect(uploads[2]!.bytes.toString()).toContain('name="caller_key"; filename="name.bin"'); expect(uploads[2]!.bytes.toString()).toContain('caller bytes');
  });

  it('converts structural multipart unions using binary request schemas', async () => {
    const data = schema(); data.components!.schemas = {
      Photo: { type: 'object', required: ['kind', 'file_data'], properties: { kind: { type: 'string', enum: ['photo'] }, file_data: { type: 'string', format: 'binary' } } },
      Text: { type: 'object', required: ['kind', 'body_text'], properties: { kind: { type: 'string', enum: ['text'] }, body_text: { type: 'string' } } },
      Choice: { oneOf: [{ $ref: '#/components/schemas/Photo' }, { $ref: '#/components/schemas/Text' }] },
    };
    data.paths['/union'] = { post: { operationId: 'union', requestBody: { required: true, content: { 'multipart/form-data': { schema: { $ref: '#/components/schemas/Choice' } } } }, responses: { '204': { description: 'ok' } } } };
    await generate(data); await compile(`import { AuditApiClient } from './index.js'; declare const api: AuditApiClient; api.union({kind:'photo',fileData:new Blob(['bytes'])});`);
    let sent = '';
    await serverRun((req, res) => { req.on('data', chunk => { sent += String(chunk); }); req.on('end', () => { res.statusCode = 204; res.end(); }); }, async url => {
      await (await client(url)).union!({ kind: 'photo', fileData: new Blob(['actual bytes']) });
    });
    expect(sent).toContain('name="file_data"'); expect(sent).toContain('actual bytes');
    data.paths = { '/raw': { post: { operationId: 'raw', requestBody: { content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } }, responses: { '204': { description: 'ok' } } } } };
    await generate(data); await compile('', { noUnusedLocals: true, noUnusedParameters: true });
  });

  it('serializes flat simple header objects and explicitly rejects unsupported form encodings', async () => {
    const data = schema(); data.paths['/header'] = { get: { operationId: 'header', parameters: [{ name: 'X-Filter', in: 'header', explode: true, schema: { type: 'object', properties: { user_id: { type: 'string' }, active: { type: 'boolean' } } } }], responses: { '200': response('application/json', { type: 'object' }) } } };
    await generate(data);
    await serverRun((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ value: req.headers['x-filter'] })); }, async url => {
      expect(await (await client(url)).header!({ userId: '1', active: true })).toEqual({ value: 'user_id=1,active=true' });
    });
    data.paths['/form'] = { post: { requestBody: { content: { 'multipart/form-data': { schema: { type: 'object' }, encoding: { field: { style: 'pipeDelimited' } } } } }, responses: { '204': { description: 'ok' } } } };
    const failed = await new Schemantic({ outputDir, schemaData: data }).generate();
    expect(failed.success).toBe(false); expect(failed.errors[0]!.message).toMatch(/encoding.*unsupported/i);
  });

  it('keeps schema-less request bodies and types wildcard response media conservatively', async () => {
    const data = schema(); data.paths['/unknown'] = { post: { operationId: 'unknown', requestBody: { required: true, content: { 'application/json': {} } }, responses: { '200': response('application/*') } } };
    await generate(data); await compile(`import { AuditApiClient } from './index.js'; declare const api: AuditApiClient; const result: Promise<unknown> = api.unknown({wire_key:'value'}); void result;`);
    await serverRun((req, res) => { res.setHeader('Content-Type', 'application/json'); req.pipe(res); }, async url => {
      expect(await (await client(url)).unknown!({ wire_key: 'value' })).toEqual({ wire_key: 'value' });
    });
  });

  it('rejects referenced complex cookies instead of stringifying objects', async () => {
    const data = schema(); data.components!.schemas!.Filter = { type: 'object', properties: { role: { type: 'string' } } };
    data.paths['/cookie'] = { get: { parameters: [{ name: 'filter', in: 'cookie', schema: { $ref: '#/components/schemas/Filter' } }], responses: { '204': { description: 'ok' } } } };
    const result = await new Schemantic({ outputDir, schemaData: data }).generate();
    expect(result.success).toBe(false); expect(result.errors[0]!.message).toMatch(/complex cookie.*unsupported/i);
  });

  it.each(['bundler', 'unused', 'esm', 'node'])('compiles an unchanged strict %s consumer', async mode => {
    const data = schema(); data.components!.schemas = { User: { type: 'object', properties: { id: { type: 'string' } } }, Blob: { type: 'string', enum: ['value'] } };
    data.paths['/user'] = { get: { operationId: 'user', responses: { '200': response('application/json', { $ref: '#/components/schemas/User' }) } } };
    await generate(data);
    if (mode === 'esm') await fs.writeFile(path.join(outputDir, 'package.json'), '{"type":"module"}');
    await compile('', mode === 'bundler' ? { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, verbatimModuleSyntax: true } :
      mode === 'unused' ? { noUnusedLocals: true, noUnusedParameters: true } : mode === 'node' ? { lib: ['lib.es2020.d.ts'], types: ['node'], typeRoots: [path.resolve('node_modules/@types')] } : { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, verbatimModuleSyntax: true });
  });

  it('avoids utility type and generated import alias collisions', async () => {
    const data = schema(); data.components!.schemas = { Record: { type: 'string' }, Dict: { type: 'object', additionalProperties: { type: 'string' } },
      Blob: { type: 'string' }, SchemaBlob: { type: 'string' } };
    for (const name of ['Record', 'Dict', 'Blob', 'SchemaBlob']) data.paths['/' + name] = { get: { operationId: 'get' + name, responses: { '200': response('application/json', { $ref: '#/components/schemas/' + name }) } } };
    await generate(data); await compile('', { noUnusedLocals: true, noUnusedParameters: true });
  });
});
