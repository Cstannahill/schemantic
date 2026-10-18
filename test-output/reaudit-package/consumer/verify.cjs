const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

(async () => {
  const cjs = require('schemantic');
  const esm = await import('schemantic');
  assert.equal(esm.Schemantic, cjs.Schemantic);
  assert.equal(typeof esm.defineConfig, 'function');
  const schemaData = { openapi: '3.1.2', info: { title: 'Consumer API', version: '1' },
    components: { schemas: { User: { type: 'object', required: ['user_id', 'display_name'], properties: {
      user_id: { type: 'string' }, display_name: { type: 'string' },
    } } } }, paths: {
      '/users/{user_id}': { get: { operationId: 'getUser', parameters: [{ name: 'user_id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } } },
      '/users': { post: { operationId: 'saveUser', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, responses: { '200': { description: 'User', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } } },
    } };
  const generator = new esm.Schemantic(esm.defineConfig({ schemaData, outputDir: './generated', typePrefix: 'Api', typeSuffix: 'Dto' }));
  assert((await generator.validate()).isValid);
  const result = await generator.generate(); assert(result.success, JSON.stringify(result.errors));
  fs.writeFileSync('consumer.ts', `import { ConsumerApiClient, serializeApiUserDto, deserializeApiUserDto } from './generated/index.js';
import type { ApiUserDto } from './generated/index.js';
const user: ApiUserDto = {userId:'1',displayName:'Ada'};
const client = new ConsumerApiClient({baseUrl:'https://example.test',headers:new Headers()});
void client.getUser(user.userId); void client.saveUser(user); serializeApiUserDto(user); deserializeApiUserDto({user_id:'1',display_name:'Ada'});
// @ts-expect-error wire keys are not the default application shape
const wrong: ApiUserDto = {user_id:'1',display_name:'Ada'}; void wrong;
`);
  fs.writeFileSync('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true,
    verbatimModuleSyntax: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, noUnusedLocals: true, noUnusedParameters: true,
    lib: ['ES2020', 'DOM'], types: [], skipLibCheck: true, outDir: './compiled' }, include: ['consumer.ts', 'generated/*.ts'] }, null, 2));
  const compiler = path.resolve(__dirname, '../../../node_modules/typescript/bin/tsc');
  const compile = spawnSync(process.execPath, [compiler, '-p', 'tsconfig.json'], { encoding: 'utf8', timeout: 20000 });
  assert.equal(compile.status, 0, compile.stdout + compile.stderr);
  const generated = await import('./compiled/generated/index.js');
  let posted;
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'GET') response.end('{"user_id":"1","display_name":"Ada"}');
    else { let body = ''; request.on('data', chunk => { body += String(chunk); }); request.on('end', () => { posted = JSON.parse(body); response.end(body); }); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const client = new generated.ConsumerApiClient({ baseUrl: `http://127.0.0.1:${server.address().port}`, retries: 0 });
    assert.deepEqual(await client.getUser('1'), { userId: '1', displayName: 'Ada' });
    assert.deepEqual(await client.saveUser({ userId: '1', displayName: 'Ada' }), { userId: '1', displayName: 'Ada' });
    assert.deepEqual(posted, { user_id: '1', display_name: 'Ada' });
  } finally { await new Promise(resolve => server.close(resolve)); }
  fs.writeFileSync('schema.json', JSON.stringify(schemaData));
  const cli = spawnSync(process.execPath, [path.resolve('node_modules/schemantic/dist/cli/index.js'), 'generate', 'schema.json', '--types', '--output', 'cli-generated', '--quiet'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
  assert(fs.existsSync('cli-generated/conversion.ts'));
  const report = { commonJs: true, esm: true, strictNodeNextConsumer: true, camelCaseHttpRoundTrip: true, installedCli: true };
  fs.writeFileSync('verification.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
})().catch(error => { console.error(error); process.exitCode = 1; });
