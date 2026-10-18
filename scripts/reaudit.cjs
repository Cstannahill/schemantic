/* Read-only functionality audit. Run after npm run build: node scripts/reaudit.cjs.
 * Writes fresh generated probes/evidence to test-output/reaudit-core.
 * Known failures are recorded as findings rather than hidden by test assertions.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { Schemantic, DEFAULT_CONFIG } = require('../dist');
const root = path.resolve(__dirname, '../test-output/reaudit-core');
const evidence = [];
const base = () => ({ openapi: '3.1.0', info: { title: 'Audit API', version: '1' }, paths: {
  '/users/{id}': { get: { operationId: 'getUser', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } } },
  '/users': { post: { operationId: 'updateUser', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'string' } } } } } } },
}, components: { schemas: { User: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } } } });
const reactDeclarations = `declare module 'react' {
export function useState<T>(initial: T): [T, (value: T) => void];
export function useRef<T>(initial: T): { current: T };
export function useCallback<T extends Function>(fn: T, deps: readonly unknown[]): T;
export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
}`;

async function generate(name, schema, options = {}) {
  const outputDir = path.join(root, name);
  // Keep explicitly rejected capabilities in the evidence instead of aborting all probes.
  fs.mkdirSync(outputDir, { recursive: true });
  let result;
  try { result = await new Schemantic({ ...DEFAULT_CONFIG, outputDir, schemaData: schema, ...options }).generate(); }
  catch (error) { result = { success: false, generatedFiles: [], errors: [{ code: 'CONFIGURATION_ERROR', message: error.message }], warnings: [], statistics: {} }; }
  return { outputDir, result };
}
function compile(outputDir, options = {}) {
  const files = fs.readdirSync(outputDir).filter(file => file.endsWith('.ts')).map(file => path.join(outputDir, file));
  const program = ts.createProgram(files, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, skipLibCheck: true,
    types: [], lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], baseUrl: path.resolve(__dirname, '..'),
    paths: { zod: ['node_modules/zod'] }, noEmit: true, ...options });
  return ts.getPreEmitDiagnostics(program).map(d => ({ code: d.code,
    file: d.file ? path.relative(outputDir, d.file.fileName) : undefined,
    line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : undefined,
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n') }));
}
function record(id, observed) { evidence.push({ id, ...observed }); }

class HookHarness {
  slots = []; cursor = 0; effects = [];
  changed(previous, next) { return !previous || !next || previous.length !== next.length || previous.some((item, i) => !Object.is(item, next[i])); }
  react = {
    useState: initial => { const i = this.cursor++; if (!(i in this.slots)) this.slots[i] = initial;
      return [this.slots[i], value => { this.slots[i] = typeof value === 'function' ? value(this.slots[i]) : value; }]; },
    useRef: initial => { const i = this.cursor++; if (!(i in this.slots)) this.slots[i] = { current: initial }; return this.slots[i]; },
    useCallback: (fn, deps) => { const i = this.cursor++; if (!this.slots[i] || this.changed(this.slots[i].deps, deps)) this.slots[i] = { value: fn, deps }; return this.slots[i].value; },
    useEffect: (fn, deps) => { const i = this.cursor++; const old = this.slots[i]; if (!old || this.changed(old.deps, deps)) {
      const slot = { deps }; this.slots[i] = slot; this.effects.push(() => { old?.cleanup?.(); slot.cleanup = fn(); });
    } },
  };
  render(fn) { this.cursor = 0; const result = fn(); const effects = this.effects.splice(0); effects.forEach(effect => effect()); return result; }
  unmount() { this.slots.forEach(slot => slot?.cleanup?.()); }
}
function loadHooks(outputDir, harness, client) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(outputDir, 'hooks.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
  const exports = {};
  new Function('exports', 'require', compiled.outputText)(exports, name => name === 'react' ? harness.react : {});
  return exports.createApiHooks(client);
}
const settle = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

(async () => {
  fs.mkdirSync(root, { recursive: true });
  for (const file of fs.readdirSync(path.resolve(__dirname, '../test-schemas')).filter(file => file.endsWith('.json'))) {
    for (const propertyNaming of ['camelCase', 'preserve']) {
    for (const mode of ['plain', 'zod', 'hooks']) {
      const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../test-schemas', file), 'utf8'));
      const { outputDir, result } = await generate(`fixtures/${propertyNaming}/${mode}/${file.slice(0, -5)}`, schema,
        { propertyNaming, ...(mode === 'zod' ? { plugins: [{ name: 'zod-validation', enabled: true }] } : mode === 'hooks' ? { generateHooks: true } : {}) });
      if (mode === 'hooks') fs.writeFileSync(path.join(outputDir, 'react.d.ts'), reactDeclarations);
      record(`fixture:${propertyNaming}:${mode}:${file}`, { success: result.success, generationErrors: result.errors, diagnostics: compile(outputDir) });
    }
    }
  }
  const { outputDir } = await generate('consumer-matrix', base());
  record('consumer:cjs-strict-dom', { diagnostics: compile(outputDir) });
  record('consumer:bundler-verbatim', { diagnostics: compile(outputDir, { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, verbatimModuleSyntax: true, isolatedModules: true }) });
  record('consumer:no-unused', { diagnostics: compile(outputDir, { noUnusedLocals: true, noUnusedParameters: true }) });
  record('consumer:node-server-no-dom', { diagnostics: compile(outputDir, { lib: ['lib.es2020.d.ts'], types: ['node'], typeRoots: [path.resolve(__dirname, '../node_modules/@types')] }) });
  fs.writeFileSync(path.join(outputDir, 'package.json'), JSON.stringify({ type: 'module' }));
  record('consumer:nodenext-esm', { diagnostics: compile(outputDir, { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, verbatimModuleSyntax: true }) });

  const hookOutput = await generate('hook-lifecycle', base(), { generateHooks: true });
  {
    const harness = new HookHarness(); const pending = new Map();
    const hooks = loadHooks(hookOutput.outputDir, harness, { updateUser: body => new Promise(resolve => pending.set(body.id, resolve)) });
    const render = () => harness.render(() => hooks.useUpdateUserMutation());
    let state = render(); const old = state.mutate({ body: { id: 'old' } }); const newer = state.mutate({ body: { id: 'new' } });
    pending.get('new')('new-result'); await newer; pending.get('old')('old-result'); await old;
    state = render(); record('hook:overlapping-mutation', { expectedLatestData: 'new-result', observedData: state.data, loading: state.loading });
  }
  {
    const harness = new HookHarness(); let resolveRequest;
    const hooks = loadHooks(hookOutput.outputDir, harness, { updateUser: () => new Promise(resolve => { resolveRequest = resolve; }) });
    const render = () => harness.render(() => hooks.useUpdateUserMutation());
    let state = render(); const promise = state.mutate({ body: { id: 'pending' } }); state.reset(); resolveRequest('late-result'); await promise;
    state = render(); record('hook:reset-pending-mutation', { expectedData: 'undefined', observedData: state.data, loading: state.loading });
  }
  {
    const harness = new HookHarness(); const pending = new Map();
    const hooks = loadHooks(hookOutput.outputDir, harness, { updateUser: body => new Promise(resolve => pending.set(body.id, resolve)) });
    const render = () => harness.render(() => hooks.useUpdateUserMutation()); const state = render();
    const first = state.mutate({ body: { id: 'a' } }); const second = state.mutate({ body: { id: 'b' } });
    pending.get('a')('a'); await first;
    record('hook:pending-mutation-loading', { expectedLoading: true, observedLoading: render().loading });
    pending.get('b')('b'); await second;
  }
  {
    const harness = new HookHarness(); let calls = 0;
    const hooks = loadHooks(hookOutput.outputDir, harness, { getUser: async () => { calls++; return { id: 'same' }; } });
    harness.render(() => hooks.useGetUserQuery({ path: { id: 'same' } })); await settle();
    harness.render(() => hooks.useGetUserQuery({ path: { id: 'same' } }, { headers: { 'X': 'x' } })); await settle();
    const before = calls; harness.render(() => hooks.useGetUserQuery({ path: { id: 'same' } }, { headers: { 'X': 'x' } })); await settle();
    record('hook:equivalent-input-stability', { before, after: calls, stable: before === calls });
  }

  const unresolved = base(); unresolved.components.schemas.Bad = { $ref: '#/components/schemas/Missing' };
  const generator = new Schemantic({ ...DEFAULT_CONFIG, outputDir: path.join(root, 'invalid-ref'), schemaData: unresolved });
  record('lifecycle:validate-vs-generate', { validation: await generator.validate(), generation: await generator.generate() });
  const ignored = await generate('queries-only', base(), { generateTypes: false, generateApiClient: false, generateQueries: true });
  record('feature:generate-queries', { success: ignored.result.success, errors: ignored.result.errors, files: ignored.result.generatedFiles.map(file => path.basename(file.path)), statistics: ignored.result.statistics });

  const stateful = new Schemantic({ ...DEFAULT_CONFIG, outputDir: path.join(root, 'stale-output'), schemaData: base(), generateHooks: true });
  await stateful.generate(); Object.assign(stateful.getConfig(), { generateHooks: false, generateApiClient: false });
  const secondRun = await stateful.generate();
  record('lifecycle:stale-output-files', { reportedFiles: secondRun.generatedFiles.map(file => path.basename(file.path)), actualFiles: fs.readdirSync(path.join(root, 'stale-output')) });

  for (const [name, outputFileName] of [['case', 'Types.ts'], ['ancestor', 'types.ts/client.ts']]) {
    const collision = await generate(`file-collisions/${name}`, base(), { outputFileName });
    const typesPath = path.join(collision.outputDir, 'types.ts');
    const content = fs.existsSync(typesPath) ? fs.readFileSync(typesPath, 'utf8') : '';
    record(`lifecycle:file-collision-${name}`, { platform: process.platform, outputFileName,
      success: collision.result.success, errors: collision.result.errors,
      actualFiles: fs.readdirSync(collision.outputDir), userInterfacePresent: content.includes('interface User'),
      clientWrittenToTypes: content.includes('class AuditApiClient') });
  }

  {
    const outputDir = path.join(root, 'custom-plugin-import');
    const generator = new Schemantic({ ...DEFAULT_CONFIG, outputDir, schemaData: base(),
      plugins: [{ name: 'audit-custom-import', enabled: true }] });
    generator.getPluginManager().registerPlugin({ name: 'audit-custom-import', version: '1.0.0',
      afterTypeGeneration: (_name, generated) => {
        generated.content += '\nimport type { ExternalShape } from "./external";\nexport type ExternalModel = ExternalShape;';
        generated.dependencies.push('./external'); generated.exports.push('ExternalModel');
      } });
    const result = await generator.generate();
    fs.writeFileSync(path.join(outputDir, 'external.ts'), 'export interface ExternalShape { external: string; }\n');
    record('plugin:custom-import-preservation', { success: result.success, diagnostics: compile(outputDir),
      importPreserved: fs.readFileSync(path.join(outputDir, 'types.ts'), 'utf8').includes('from "./external"') });
  }

  const report = path.join(root, 'evidence.json'); fs.writeFileSync(report, JSON.stringify(evidence, null, 2) + '\n');
  for (const item of evidence) console.log(JSON.stringify({ id: item.id, success: item.success, diagnostics: item.diagnostics?.map(d => d.code), observedData: item.observedData, observedLoading: item.observedLoading, stable: item.stable }));
  console.log(`Evidence: ${report}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
