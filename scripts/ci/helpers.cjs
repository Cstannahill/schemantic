const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
function artifactDirectory(gate) {
  const parent = path.join(root, '.artifacts', gate);
  fs.mkdirSync(parent, { recursive: true });
  return fs.mkdtempSync(path.join(parent, 'run-'));
}
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, ...options });
  const output = (result.stdout || '') + (result.stderr || '');
  if (options.log) fs.writeFileSync(options.log, output);
  if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.status}): ${result.error?.message || ''}\n${output}`);
  return result.stdout;
}
// Invoke npm's JavaScript entry point directly: npm.cmd requires a shell on Windows.
function npmCli() {
  const candidates = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')];
  for (const entry of (process.env.PATH || '').split(path.delimiter)) {
    candidates.push(path.join(entry, 'node_modules/npm/bin/npm-cli.js'));
    const launcher = path.join(entry, 'npm');
    try { candidates.push(fs.realpathSync(launcher)); } catch { /* Not every PATH entry contains npm. */ }
  }
  const found = candidates.find(file => file && /npm-cli\.js$/.test(file) && fs.existsSync(file));
  if (!found) throw new Error('Cannot locate npm-cli.js. Run this gate through its npm run command.');
  return found;
}
function npm(args, options = {}) { return run(process.execPath, [npmCli(), ...args], { cwd: root, ...options }); }
function compile(directory, overrides = {}) {
  const ts = require('typescript');
  const files = fs.readdirSync(directory).filter(file => /\.(?:ts|mts|cts)$/.test(file)).map(file => path.join(directory, file));
  const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
    noUnusedLocals: true, noUnusedParameters: true, skipLibCheck: true, types: [],
    lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], noEmit: true,
    baseUrl: root, paths: { zod: ['node_modules/zod'], react: ['node_modules/@types/react'] }, ...overrides };
  const program = ts.createProgram(files, options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (!options.noEmit && diagnostics.length === 0) diagnostics.push(...program.emit().diagnostics);
  return diagnostics.map(item => ({ code: item.code, file: item.file ? path.relative(directory, item.file.fileName) : undefined,
    line: item.file && item.start !== undefined ? item.file.getLineAndCharacterOfPosition(item.start).line + 1 : undefined,
    message: ts.flattenDiagnosticMessageText(item.messageText, '\n') }));
}
function consumerSchema() {
  const content = { 'application/json': { schema: { $ref: '#/components/schemas/User' } } };
  return { openapi: '3.1.0', info: { title: 'Consumer API', version: '1' },
    components: { schemas: { User: { type: 'object', required: ['user_id', 'display_name'], properties: {
      user_id: { type: 'string' }, display_name: { type: 'string' },
    } } } },
    paths: {
      '/users/{user_id}': { get: { operationId: 'getUser', parameters: [{ name: 'user_id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User', content } } } },
      '/users': { post: { operationId: 'saveUser', requestBody: { required: true, content }, responses: { '200': { description: 'User', content } } } },
    } };
}
module.exports = { root, artifactDirectory, writeJson, run, npmCli, npm, compile, consumerSchema };
