const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { root, artifactDirectory, writeJson, run, npm, consumerSchema } = require('./helpers.cjs');

function validatePack(info, manifest, archive) {
  assert.equal(info.name, manifest.name);
  assert.equal(info.version, manifest.version);
  assert.equal(path.basename(info.filename), info.filename, 'Archive filename must be a basename');
  assert(/^[a-zA-Z0-9@._-]+\.tgz$/.test(info.filename), 'Unsafe archive filename');
  for (const key of ['size', 'unpackedSize']) assert(Number.isSafeInteger(info[key]) && info[key] > 0, `${key} must be a positive integer`);
  assert(info.size <= 10 * 1024 * 1024, 'Compressed archive exceeds 10 MiB release size budget');
  assert(info.unpackedSize <= 25 * 1024 * 1024, 'Unpacked archive exceeds 25 MiB release size budget');
  assert.equal(info.size, fs.statSync(archive).size);
  const digest = crypto.createHash('sha512').update(fs.readFileSync(archive)).digest('base64');
  assert.equal(info.integrity, `sha512-${digest}`, 'npm integrity must match archive bytes');
  assert(Array.isArray(info.files) && info.files.length > 0);
  for (const file of info.files) assert(Number.isSafeInteger(file.size) && file.size >= 0, `Invalid package file size: ${file.path}`);
  assert.equal(info.files.reduce((total, file) => total + file.size, 0), info.unpackedSize, 'Unpacked size must match the file manifest');
  const names = info.files.map(file => file.path.replaceAll('\\', '/'));
  for (const name of [manifest.main, manifest.types, manifest.bin.schemantic, 'package.json', 'README.md', 'LICENSE']) assert(names.includes(name), `Missing package entry: ${name}`);
  assert(names.some(name => name.endsWith('.d.ts')));
  const forbidden = /(^|\/)(?:node_modules|__tests__|tests?|test-output|test-schemas|coverage|\.git|\.artifacts|\.release)(\/|$)|\.(?:test|spec)\.|(^|\/)(?:\.env(?:\..*)?|\.npmrc|credentials(?:\..*)?|id_rsa|id_ed25519)$|\.(?:pem|p12|pfx|key)$/i;
  for (const name of names) {
    assert(!path.posix.isAbsolute(name) && !path.win32.isAbsolute(name) && !name.split('/').includes('..'), `Unsafe package entry: ${name}`);
    assert(!forbidden.test(name), `Forbidden package entry: ${name}`);
  }
  return { name: info.name, version: info.version, filename: info.filename, size: info.size, unpackedSize: info.unpackedSize,
    integrity: info.integrity, sha256: crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex') };
}
async function main() {
  const directory = artifactDirectory('package');
  const destination = path.join(root, '.release/package');
  fs.mkdirSync(destination, { recursive: true });
  // Remove only our prior success marker so a failed run cannot appear publishable.
  fs.rmSync(path.join(destination, 'package-info.json'), { force: true });
  const report = { passed: false, evidenceDirectory: directory };
  console.log(`Package evidence: ${directory}`);
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    for (const entry of [manifest.main, manifest.types, manifest.bin.schemantic]) assert(fs.statSync(path.join(root, entry)).size > 0, `Build first: ${entry}`);
    // Exactly one pack invocation. Consumer validation and publication use these exact bytes.
    const cache = path.join(directory, 'npm-cache');
    const output = npm(['pack', '--ignore-scripts', '--json', '--cache', cache, '--pack-destination', destination], { log: path.join(directory, 'pack.log') });
    const packed = JSON.parse(output);
    assert.equal(packed.length, 1, 'Expected exactly one npm archive');
    const info = packed[0];
    assert.equal(path.basename(info.filename), info.filename);
    const archive = path.join(destination, info.filename);
    const metadata = validatePack(info, manifest, archive);
    writeJson(path.join(directory, 'pack-manifest.json'), info);
    const consumer = path.join(directory, 'consumer');
    fs.mkdirSync(consumer);
    writeJson(path.join(consumer, 'package.json'), { name: 'schemantic-ci-consumer', version: '1.0.0', private: true, type: 'module' });
    npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--cache', cache, archive], { cwd: consumer, log: path.join(directory, 'install.log') });
    writeJson(path.join(consumer, 'schema.json'), consumerSchema());
    fs.copyFileSync(path.join(__dirname, 'packed-consumer.cjs'), path.join(consumer, 'verify.cjs'));
    run(process.execPath, ['verify.cjs'], { cwd: consumer, log: path.join(directory, 'consumer.log'), env: { ...process.env,
      SCHEMANTIC_TSC: path.join(root, 'node_modules/typescript/bin/tsc'), SCHEMANTIC_NODE_TYPES: path.join(root, 'node_modules/@types') } });
    report.consumer = JSON.parse(fs.readFileSync(path.join(consumer, 'verification.json'), 'utf8'));
    assert.equal(report.consumer.passed, true);
    // Verify again after tests, without repacking, before writing the release marker.
    report.package = validatePack(info, manifest, archive);
    assert.deepEqual(report.package, metadata);
    writeJson(path.join(destination, 'package-info.json'), metadata);
    report.passed = true;
    console.log(`Verified ${metadata.filename} (${metadata.size} bytes; sha256 ${metadata.sha256})`);
  } catch (error) { report.error = error.stack || String(error); throw error; }
  finally { writeJson(path.join(directory, 'report.json'), report); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { validatePack };
