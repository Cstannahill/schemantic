// Copied into an isolated npm installation by verify-package.cjs.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

async function main() {
  const cjs = require('schemantic');
  const esm = await import('schemantic');
  assert.equal(esm.Schemantic, cjs.Schemantic);
  assert.equal(typeof esm.defineConfig, 'function');
  const resolved = require.resolve('schemantic');
  assert(resolved.startsWith(path.join(__dirname, 'node_modules', 'schemantic') + path.sep), `Package escaped installation: ${resolved}`);
  assert.equal(fs.lstatSync(path.join(__dirname, 'node_modules/schemantic')).isSymbolicLink(), false);
  const schemaData = JSON.parse(fs.readFileSync('schema.json', 'utf8'));
  const result = await new esm.Schemantic(esm.defineConfig({ schemaData, outputDir: './generated', typePrefix: 'Api', typeSuffix: 'Dto' })).generate();
  assert.equal(result.success, true, JSON.stringify(result.errors));
  fs.writeFileSync('consumer.ts', `import { Schemantic, defineConfig } from 'schemantic';
import { ConsumerApiClient, serializeApiUserDto, deserializeApiUserDto } from './generated/index.js';
import type { ApiUserDto } from './generated/index.js';
const user: ApiUserDto = {userId:'1',displayName:'Ada'};
const client = new ConsumerApiClient({baseUrl:'https://example.test',headers:new Headers()});
void new Schemantic(defineConfig({schemaData: {openapi:'3.1.0',info:{title:'Consumer',version:'1'},paths:{}}, outputDir: './unused'}));
void client.getUser(user.userId); void client.saveUser(user); serializeApiUserDto(user); deserializeApiUserDto({user_id:'1',display_name:'Ada'});
// @ts-expect-error wire names must not leak into the application model
const wrong: ApiUserDto = {user_id:'1',display_name:'Ada'}; void wrong;
`);
  const base = { target: 'ES2020', strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
    noUnusedLocals: true, noUnusedParameters: true, lib: ['ES2020', 'DOM'], types: ['node'],
    typeRoots: [process.env.SCHEMANTIC_NODE_TYPES], skipLibCheck: true, outDir: './compiled' };
  const modes = [
    ['commonjs', { module: 'CommonJS', moduleResolution: 'Node10', noEmit: true }],
    ['bundler', { module: 'ESNext', moduleResolution: 'Bundler', verbatimModuleSyntax: true, isolatedModules: true, noEmit: true }],
    ['node-no-dom', { module: 'NodeNext', moduleResolution: 'NodeNext', lib: ['ES2020'], noEmit: true }],
    ['nodenext', { module: 'NodeNext', moduleResolution: 'NodeNext', verbatimModuleSyntax: true }],
  ];
  for (const [mode, options] of modes) {
    fs.writeFileSync('tsconfig.json', JSON.stringify({ compilerOptions: { ...base, ...options }, include: ['consumer.ts', 'generated/*.ts'] }, null, 2));
    const compile = spawnSync(process.execPath, [process.env.SCHEMANTIC_TSC, '-p', 'tsconfig.json'], { encoding: 'utf8', timeout: 60000 });
    fs.writeFileSync(`compile-${mode}.log`, (compile.stdout || '') + (compile.stderr || ''));
    assert.equal(compile.status, 0, `${mode}: ${compile.error || ''}\n${compile.stdout}\n${compile.stderr}`);
  }
  const generated = await import('./compiled/generated/index.js');
  let posted;
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'GET') response.end('{"user_id":"1","display_name":"Ada"}');
    else { let body = ''; request.on('data', chunk => { body += String(chunk); }); request.on('end', () => { posted = JSON.parse(body); response.end(body); }); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const client = new generated.ConsumerApiClient({ baseUrl: `http://127.0.0.1:${server.address().port}`, retries: 0 });
    assert.deepEqual(await client.getUser('1'), { userId: '1', displayName: 'Ada' });
    assert.deepEqual(await client.saveUser({ userId: '1', displayName: 'Ada' }), { userId: '1', displayName: 'Ada' });
    assert.deepEqual(posted, { user_id: '1', display_name: 'Ada' });
  } finally { await new Promise(resolve => server.close(resolve)); }
  const cli = spawnSync(process.execPath, [path.resolve('node_modules/schemantic/dist/cli/index.js'), 'generate', 'schema.json', '--types', '--output', 'cli-generated', '--quiet'], { encoding: 'utf8', timeout: 30000 });
  fs.writeFileSync('cli.log', (cli.stdout || '') + (cli.stderr || ''));
  assert.equal(cli.status, 0, `${cli.error || ''}\n${cli.stdout}\n${cli.stderr}`);
  assert(fs.statSync('cli-generated/conversion.ts').size > 0);
  const report = { passed: true, commonJsImport: true, esmImport: true, compilerModes: modes.map(([mode]) => mode), camelCaseHttpRoundTrip: true, installedCli: true };
  fs.writeFileSync('verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
