const { test } = require('node:test');
const assert = require('node:assert/strict');
const { planAssetUploads } = require('../release-assets.cjs');
const files = [{ name: 'schemantic-0.4.0.tgz', bytes: Buffer.from('tested package') }, { name: 'package-info.json', bytes: Buffer.from('metadata') }];
test('missing release assets are uploaded without downloading', () => {
  assert.deepEqual(planAssetUploads(files, [], () => { throw new Error('Unexpected download'); }), files.map(file => file.name));
});
test('identical existing assets are preserved on reruns', () => {
  assert.deepEqual(planAssetUploads(files, files, name => files.find(file => file.name === name).bytes), []);
  assert.deepEqual(planAssetUploads(files, [files[0]], () => files[0].bytes), ['package-info.json']);
});
test('conflicting assets abort the plan before uploads can start', () => {
  assert.throws(() => planAssetUploads(files, [files[1]], () => Buffer.from('unrelated asset')), /different bytes/);
});
test('asset names cannot escape the download directory', () => {
  assert.throws(() => planAssetUploads([{ name: '../outside', bytes: Buffer.from('x') }], [], () => {}), /Unsafe/);
});
