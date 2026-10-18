const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { validatePack } = require('./verify-package.cjs');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'schemantic-package-test-'));
  t.after(() => {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert(path.basename(resolved).startsWith('schemantic-package-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const archive = path.join(directory, 'schemantic-1.2.3.tgz');
  const bytes = Buffer.from('archive byte integrity probe');
  fs.writeFileSync(archive, bytes);
  const manifest = { name: 'schemantic', version: '1.2.3', main: 'dist/index.js', types: 'dist/index.d.ts', bin: { schemantic: 'dist/cli/index.js' } };
  const info = { name: manifest.name, version: manifest.version, filename: path.basename(archive), size: bytes.length, unpackedSize: 6,
    integrity: 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64'),
    files: ['dist/index.js', 'dist/index.d.ts', 'dist/cli/index.js', 'package.json', 'README.md', 'LICENSE'].map(value => ({ path: value, size: 1 })) };
  return { archive, manifest, info };
}
test('release metadata describes the verified archive bytes', t => {
  const { archive, manifest, info } = fixture(t);
  const result = validatePack(info, manifest, archive);
  assert.equal(result.integrity, info.integrity);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.filename, path.basename(archive));
});
test('tampering after npm pack is rejected', t => {
  const { archive, manifest, info } = fixture(t);
  fs.writeFileSync(archive, Buffer.alloc(info.size, 42));
  assert.throws(() => validatePack(info, manifest, archive), /integrity/);
});
test('missing runtime/declaration entries and invalid numeric metadata fail closed', t => {
  const { archive, manifest, info } = fixture(t);
  assert.throws(() => validatePack({ ...info, unpackedSize: 5, files: info.files.filter(item => item.path !== 'dist/index.d.ts') }, manifest, archive), /Missing package entry/);
  assert.throws(() => validatePack({ ...info, size: String(info.size) }, manifest, archive), /positive integer/);
});
test('development artifacts, credentials and traversal cannot enter a release', t => {
  const { archive, manifest, info } = fixture(t);
  for (const name of ['node_modules/x.js', 'dist/__tests__/x.js', 'dist/x.test.js', 'test-output/data.json', '.env.production', '.npmrc', '.aws/credentials', 'private.key', '../escape']) {
    assert.throws(() => validatePack({ ...info, files: [...info.files, { path: name, size: 0 }] }, manifest, archive), /(?:Forbidden|Unsafe) package entry/, name);
  }
});
test('archive size budgets allow their exact compressed and unpacked boundaries', t => {
  const { archive, manifest, info } = fixture(t);
  const bytes = Buffer.alloc(10 * 1024 * 1024, 42);
  fs.writeFileSync(archive, bytes);
  const boundary = { ...info, size: bytes.length, unpackedSize: 25 * 1024 * 1024,
    integrity: 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64'),
    files: info.files.map((file, index) => ({ ...file, size: index === 0 ? 25 * 1024 * 1024 - 5 : 1 })) };
  assert.equal(validatePack(boundary, manifest, archive).size, 10 * 1024 * 1024);
});
test('compressed archives exceeding 10 MiB fail with the budget diagnostic', t => {
  const { archive, manifest, info } = fixture(t);
  const bytes = Buffer.alloc(10 * 1024 * 1024 + 1, 42);
  fs.writeFileSync(archive, bytes);
  const oversized = { ...info, size: bytes.length,
    integrity: 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64') };
  assert.throws(() => validatePack(oversized, manifest, archive), /Compressed archive exceeds 10 MiB/);
});
test('unpacked archives exceeding 25 MiB fail with the budget diagnostic', t => {
  const { archive, manifest, info } = fixture(t);
  const oversized = { ...info, unpackedSize: 25 * 1024 * 1024 + 1,
    files: info.files.map((file, index) => ({ ...file, size: index === 0 ? 25 * 1024 * 1024 - 4 : 1 })) };
  assert.throws(() => validatePack(oversized, manifest, archive), /Unpacked archive exceeds 25 MiB/);
});
