'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function planAssetUploads(files, existing, download) {
  const names = new Set(existing.map(asset => asset.name));
  const missing = [];
  for (const file of files) {
    if (path.basename(file.name) !== file.name || !/^[\w.-]+$/.test(file.name)) throw new Error('Unsafe release asset name');
    if (!names.has(file.name)) { missing.push(file.name); continue; }
    if (digest(download(file.name)) !== digest(file.bytes)) throw new Error(`Existing GitHub release asset ${file.name} has different bytes; refusing to replace it`);
  }
  return missing;
}
function main(tag, directory) {
  if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag || '')) throw new Error('Expected an exact version tag');
  if (process.env.GITHUB_REPOSITORY !== 'Cstannahill/schemantic') throw new Error('Unexpected release repository');
  const gh = (...args) => execFileSync('gh', [...args, '--repo', process.env.GITHUB_REPOSITORY], { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
  const info = JSON.parse(fs.readFileSync(path.join(directory, 'package-info.json'), 'utf8'));
  if (info.filename !== `schemantic-${info.version}.tgz` || path.basename(info.filename) !== info.filename) throw new Error('Unexpected archive filename');
  const files = [info.filename, 'package-info.json'].map(name => ({ name, bytes: fs.readFileSync(path.join(directory, name)) }));
  const existing = JSON.parse(gh('release', 'view', tag, '--json', 'assets')).assets;
  const temporary = fs.mkdtempSync(path.join(path.resolve(directory, '..'), 'asset-check-'));
  try {
    // Check all collisions before uploading anything. Never delete or replace assets.
    const missing = planAssetUploads(files, existing, name => {
      gh('release', 'download', tag, '--pattern', name, '--dir', temporary);
      return fs.readFileSync(path.join(temporary, name));
    });
    for (const name of missing) gh('release', 'upload', tag, path.join(directory, name));
    console.log(`Release assets verified: ${files.length - missing.length} identical, ${missing.length} uploaded`);
  } finally { fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 3 }); }
}
module.exports = { planAssetUploads };
if (require.main === module) {
  try { main(...process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
