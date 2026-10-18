const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { planRelease, validateRelease, registryState, waitForPublished, verifyArchive, readProject, writePreparation, checkTag } = require('../release.cjs');

function fixture() {
  return { manifest: { name: 'schemantic', version: '0.3.0', repository: { url: 'git+https://github.com/Cstannahill/schemantic.git' } },
    lock: { name: 'schemantic', version: '0.3.0', packages: { '': { name: 'schemantic', version: '0.3.0' } } },
    changelog: '# Changelog\n\n## [Unreleased]\n\n### Fixed\n\n- Correct wire conversion.\n\n## [0.3.0] — 2025-10-18\n\n- Old release.\n' };
}
test('prepares matching manifest/lock versions and moves only unreleased notes', () => {
  const original = fixture(); const snapshot = JSON.stringify(original);
  const plan = planRelease(original, 'minor', '2026-10-18');
  assert.equal(plan.version, '0.4.0'); assert.equal(plan.manifest.version, '0.4.0');
  assert.equal(plan.lock.version, '0.4.0'); assert.equal(plan.lock.packages[''].version, '0.4.0');
  assert.match(plan.changelog, /## \[Unreleased\]\n\n## \[0\.4\.0\] — 2026-10-18/);
  assert.match(plan.changelog, /Correct wire conversion/); assert.match(plan.changelog, /Old release/);
  assert.equal(JSON.stringify(original), snapshot);
});
test('supports explicit prereleases and rejects ambiguous/downgraded versions', () => {
  assert.equal(planRelease(fixture(), '0.4.0-rc.1').version, '0.4.0-rc.1');
  for (const input of ['0.3.0', '0.2.9', '0.4', '0.4.0+build', 'latest', '../v0.4.0', '01.2.3']) assert.throws(() => planRelease(fixture(), input));
});
test('rejects inconsistent locks, empty release notes, and existing changelog versions', () => {
  const badLock = fixture(); badLock.lock.packages[''].version = '0.2.0'; assert.throws(() => planRelease(badLock, 'minor'), /lock/i);
  const empty = fixture(); empty.changelog = '# Changelog\n## [Unreleased]\n### Fixed\n\n## [0.3.0]\nold'; assert.throws(() => planRelease(empty, 'minor'), /notes/i);
  const duplicate = fixture(); duplicate.changelog += '\n## [0.4.0]\nAlready here'; assert.throws(() => planRelease(duplicate, 'minor'), /already/i);
});
test('validates tag/version/release flags and selects safe npm channels', () => {
  const stable = planRelease(fixture(), '0.4.0'); assert.equal(validateRelease(stable, 'v0.4.0').npmTag, 'latest');
  assert.throws(() => validateRelease(stable, 'v0.3.0'), /match/i);
  assert.throws(() => validateRelease(stable, 'v0.4.0', { isPrerelease: true }), /prerelease/i);
  const beta = planRelease(fixture(), '0.4.0-beta.2'); assert.equal(validateRelease(beta, 'v0.4.0-beta.2', { isPrerelease: true }).npmTag, 'beta');
  assert.throws(() => validateRelease(beta, 'v0.4.0-beta.2', { isPrerelease: false }), /prerelease/i);
  const privatePackage = { ...stable, manifest: { ...stable.manifest, private: true } }; assert.throws(() => validateRelease(privatePackage, 'v0.4.0'), /private/i);
});
const response = (status, value) => ({ status, ok: status >= 200 && status < 300, json: async () => value });
test('registry checks fail closed, prevent latest regression and permit exact-integrity reruns', async () => {
  const version = { name: 'schemantic', version: '0.4.0', dist: { integrity: 'sha512-expected' } };
  assert.equal((await registryState('schemantic', '0.4.0', 'sha512-expected', 'latest', async () => response(200, version))).alreadyPublished, true);
  await assert.rejects(registryState('schemantic', '0.4.0', 'sha512-different', 'latest', async () => response(200, version)), /integrity/i);
  await assert.rejects(registryState('schemantic', '0.4.0', 'x', 'latest', async () => response(503, {})), /503/);
  await assert.rejects(registryState('schemantic', '0.4.0', 'x', 'latest', async () => { throw new Error('offline'); }), /offline/);
  const missing = async url => url.endsWith('/latest') ? response(200, { version: '0.5.0' }) : response(404, {});
  await assert.rejects(registryState('schemantic', '0.4.0', 'x', 'latest', missing), /latest/i);
  const upcoming = async url => url.endsWith('/latest') ? response(200, { version: '0.3.0' }) : response(404, {});
  assert.equal((await registryState('schemantic', '0.4.0', 'x', 'latest', upcoming)).alreadyPublished, false);
});
test('rejects archive traversal and tampered package bytes before publication', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'schemantic-release-'));
  try {
    fs.writeFileSync(path.join(directory, 'schemantic-0.4.0.tgz'), 'tampered');
    const info = { name: 'schemantic', version: '0.4.0', filename: '../outside.tgz', integrity: 'sha512-x' };
    assert.throws(() => verifyArchive(directory, info, { name: 'schemantic', version: '0.4.0' }), /filename/i);
    info.filename = 'schemantic-0.4.0.tgz';
    assert.throws(() => verifyArchive(directory, info, { name: 'schemantic', version: '0.4.0' }), /integrity/i);
  } finally { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3 }); }
});

async function repositoryFixture(run) {
  const parent = path.resolve(__dirname, '../../.artifacts/release-tests');
  fs.mkdirSync(parent, { recursive: true });
  const directory = fs.mkdtempSync(path.join(parent, 'git-'));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Release Test', '-c', 'user.email=release@example.test', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', '-c', `core.hooksPath=${path.join(directory, 'no-hooks')}`, ...args],
    { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    const data = fixture();
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify(data.manifest));
    fs.writeFileSync(path.join(directory, 'package-lock.json'), JSON.stringify(data.lock));
    fs.writeFileSync(path.join(directory, 'CHANGELOG.md'), data.changelog);
    git('init', '-b', 'main'); git('add', '.'); git('commit', '-m', 'fixture');
    await run(directory, git);
  } finally { await fs.promises.rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }); }
}
test('real preparation changes only the three release files without commits or tags', () => repositoryFixture((directory, git) => {
  const before = git('rev-parse', 'HEAD');
  writePreparation(directory, planRelease(readProject(directory), 'minor', '2026-10-18'));
  assert.equal(readProject(directory).manifest.version, '0.4.0');
  assert.equal(git('rev-parse', 'HEAD'), before); assert.equal(git('tag', '--list'), '');
  assert.deepEqual(git('diff', '--name-only').split('\n').sort(), ['CHANGELOG.md', 'package-lock.json', 'package.json']);
}));
test('dirty preparation is refused and CLI dry run leaves bytes untouched', () => repositoryFixture((directory, git) => {
  fs.writeFileSync(path.join(directory, 'unreviewed.txt'), 'unrelated work');
  const data = readProject(directory); const before = JSON.stringify(data);
  assert.throws(() => writePreparation(directory, planRelease(data, 'minor')), /dirty/i);
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../release.cjs'), 'prepare', 'minor', '--dry-run'], { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /Would prepare 0.3.0 → 0.4.0/);
  assert.equal(JSON.stringify(readProject(directory)), before); assert.equal(git('tag', '--list'), '');
}));
test('tag checks reject detached identity changes and commits outside the default branch', () => repositoryFixture((directory, git) => {
  const parent = git('rev-parse', 'HEAD');
  writePreparation(directory, planRelease(readProject(directory), 'minor'));
  git('add', '.'); git('commit', '-m', 'release fixture');
  const sha = git('rev-parse', 'HEAD'); git('tag', '-a', 'v0.4.0', '-m', 'release fixture');
  git('update-ref', 'refs/remotes/origin/main', sha);
  assert.equal(checkTag(directory, 'v0.4.0', 'main', sha), sha);
  assert.throws(() => checkTag(directory, 'v0.4.0', 'main', parent), /changed|match/i);
  git('update-ref', 'refs/remotes/origin/main', parent);
  assert.throws(() => checkTag(directory, 'v0.4.0', 'main', sha), /reachable/i);
  git('update-ref', 'refs/remotes/origin/main', sha); git('checkout', '--detach', parent);
  assert.throws(() => checkTag(directory, 'v0.4.0', 'main', sha), /checkout|match/i);
}));

test('verification waits through temporary npm registry propagation delays', async () => {
  let versionReads = 0;
  const waits = [];
  const published = { name: 'schemantic', version: '0.5.0', dist: { integrity: 'sha512-expected' } };
  const fetchImpl = async url => {
    if (url.endsWith('/0.5.0')) {
      versionReads++;
      return versionReads < 3 ? response(404, {}) : response(200, published);
    }
    return response(200, { version: '0.4.1' });
  };

  const state = await waitForPublished({ name: 'schemantic', version: '0.5.0', integrity: 'sha512-expected', npmTag: 'latest',
    fetchImpl, delays: [1000, 2000], sleep: async milliseconds => waits.push(milliseconds) });

  assert.deepEqual(waits, [1000, 2000]);
  assert.equal(state.alreadyPublished, true);
  assert.equal(state.attempts, 3);
});

test('published verification fails after its configured propagation wait expires', async () => {
  const waits = [];
  const fetchImpl = async url => url.endsWith('/latest') ? response(200, { version: '0.4.1' }) : response(404, {});

  await assert.rejects(waitForPublished({ name: 'schemantic', version: '0.5.0', integrity: 'sha512-expected', npmTag: 'latest',
    fetchImpl, delays: [1000, 2000], sleep: async milliseconds => waits.push(milliseconds) }), /not visible with matching integrity before timeout/i);
  assert.deepEqual(waits, [1000, 2000]);
});

test('default published verification allows several minutes for registry propagation', async () => {
  const waits = [];
  const fetchImpl = async url => url.endsWith('/latest') ? response(200, { version: '0.4.1' }) : response(404, {});

  await assert.rejects(waitForPublished({ name: 'schemantic', version: '0.5.0', integrity: 'sha512-expected', npmTag: 'latest',
    fetchImpl, sleep: async milliseconds => waits.push(milliseconds) }), /not visible with matching integrity before timeout/i);

  const totalWait = waits.reduce((total, milliseconds) => total + milliseconds, 0);
  assert.ok(totalWait >= 4 * 60_000 && totalWait <= 5 * 60_000);
});
