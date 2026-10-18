const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const ts = require('typescript');
const { root, artifactDirectory, writeJson, compile } = require('./helpers.cjs');

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function waitForHealth(child, portFile) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`FastAPI fixture exited before readiness (${child.exitCode ?? child.signalCode}); see server.log`);
    if (fs.existsSync(portFile)) {
      const { port } = JSON.parse(fs.readFileSync(portFile, 'utf8'));
      assert(Number.isInteger(port) && port > 0 && port <= 65535);
      const baseUrl = `http://127.0.0.1:${port}`;
      try { const response = await fetch(baseUrl + '/health', { signal: AbortSignal.timeout(1000) }); if (response.ok && (await response.json()).ready === true) return baseUrl; }
      catch { /* The socket exists before uvicorn has finished starting. */ }
    }
    await delay(100);
  }
  throw new Error('FastAPI fixture readiness exceeded 30 seconds; see server.log');
}
async function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const waitForExit = milliseconds => new Promise(resolve => {
    const done = () => { clearTimeout(timer); child.removeListener('exit', done); resolve(); };
    const timer = setTimeout(done, milliseconds);
    child.once('exit', done);
    if (child.exitCode !== null || child.signalCode !== null) done();
  });
  const exited = waitForExit(5000);
  child.kill('SIGTERM');
  await exited;
  if (child.exitCode === null && child.signalCode === null) {
    const killed = waitForExit(5000);
    child.kill('SIGKILL');
    await killed;
  }
  assert(child.exitCode !== null || child.signalCode !== null, 'Owned FastAPI fixture failed to stop');
}
async function main() {
  const directory = artifactDirectory('live');
  const report = { passed: false };
  const portFile = path.join(directory, 'server.json');
  const log = fs.openSync(path.join(directory, 'server.log'), 'w');
  let child;
  console.log(`Live integration evidence: ${directory}`);
  try {
    child = spawn(process.env.PYTHON || 'python', [path.join(__dirname, 'fixtures/live_api.py'), portFile], { cwd: directory, stdio: ['ignore', log, log], windowsHide: true });
    let startupError;
    child.once('error', error => { startupError = error; });
    await delay(50);
    if (startupError) throw startupError;
    const baseUrl = await waitForHealth(child, portFile);
    report.backend = JSON.parse(fs.readFileSync(portFile, 'utf8')).versions;
    console.log(`Live backend: ${JSON.stringify(report.backend)}`);
    const response = await fetch(baseUrl + '/openapi.json', { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    const schemaData = await response.json();
    writeJson(path.join(directory, 'openapi.json'), schemaData);
    assert.equal(schemaData.components.schemas.User.properties.user_id.readOnly, true, 'Fixture must expose real readOnly metadata');
    const { Schemantic, DEFAULT_CONFIG } = require(path.join(root, 'dist'));
    const outputDir = path.join(directory, 'generated');
    const result = await new Schemantic({ ...DEFAULT_CONFIG, schemaData, outputDir }).generate();
    assert.equal(result.success, true, JSON.stringify(result.errors));
    // Compile actual call sites and enforce directional request/response models.
    fs.writeFileSync(path.join(outputDir, 'consumer.ts'), `import { LiveVerificationApiClient } from './index.js';
declare const api: LiveVerificationApiClient;
void api.createUser({displayName: 'Ada'});
// @ts-expect-error readOnly identifiers cannot be supplied on create
void api.createUser({userId: 999, displayName: 'Ada'});
void api.getUser(42);
void api.uploadFile('fixture-header', {fileData: new Blob(['bytes'])});
`);
    // CJS output executes directly in Node, independent of workspace module settings.
    writeJson(path.join(outputDir, 'package.json'), { type: 'commonjs' });
    const diagnostics = compile(outputDir, { module: ts.ModuleKind.CommonJS, noEmit: false, outDir: path.join(outputDir, 'compiled') });
    writeJson(path.join(directory, 'diagnostics.json'), diagnostics);
    assert.equal(diagnostics.length, 0, JSON.stringify(diagnostics));
    const generated = await import(pathToFileURL(path.join(outputDir, 'compiled/index.js')).href);
    const api = new generated.LiveVerificationApiClient({ baseUrl, retries: 0, timeout: 5000 });
    assert.deepEqual(await api.createUser({ displayName: 'Ada' }), { userId: 42, displayName: 'Ada' });
    assert.deepEqual(await api.getUser(42), { userId: 42, displayName: 'Ada' });
    const observedResponse = await fetch(baseUrl + '/observed', { signal: AbortSignal.timeout(5000) });
    assert.equal(observedResponse.status, 200);
    assert.deepEqual((await observedResponse.json()).user, { display_name: 'Ada' });
    await assert.rejects(() => api.createUser({ displayName: '' }), error => error instanceof generated.ApiClientError && error.status === 422 && error.response.status === 422);
    const bytes = [0, 1, 127, 128, 255];
    const upload = await api.uploadFile('fixture-header', { fileData: new Blob([new Uint8Array(bytes)]) });
    assert.deepEqual(upload.byteValues, bytes);
    assert.equal(upload.clientHeader, 'fixture-header');
    assert.match(upload.contentType, /^multipart\/form-data; boundary=/);
    assert(upload.fileName.length > 0);
    report.checks = ['real-openapi', 'strict-consumer', 'camelCase-wire-roundtrip', 'readOnly-id-projection', 'http-422-ApiClientError', 'multipart-binary-bytes', 'request-header'];
    report.passed = true;
    console.log(`PASS live FastAPI: ${report.checks.join(', ')}`);
  } catch (error) { report.error = error.stack || String(error); throw error; }
  finally {
    try { await stop(child); }
    catch (error) { report.passed = false; report.cleanupError = error.stack || String(error); throw error; }
    finally { fs.closeSync(log); writeJson(path.join(directory, 'report.json'), report); }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
