#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const semver = require('semver');
const registry = 'https://registry.npmjs.org';
const repository = 'git+https://github.com/Cstannahill/schemantic.git';
const publishedVisibilityDelays = [2000, 5000, 10000, 20000, ...Array(8).fill(30000)];

function assertProject(project) {
  const { manifest, lock } = project;
  if (manifest.name !== 'schemantic' || lock.name !== manifest.name) throw new Error('Release package name must be schemantic');
  if (semver.valid(manifest.version) !== manifest.version || semver.parse(manifest.version).build.length) throw new Error('Invalid package version');
  if (lock.version !== manifest.version || lock.packages?.['']?.version !== manifest.version || lock.packages[''].name !== manifest.name) throw new Error('Package and lockfile versions/names must match');
  if (manifest.private) throw new Error('Cannot release a private package');
  if (manifest.repository?.url !== repository) throw new Error('repository.url must match Cstannahill/schemantic for trusted publishing');
  if (manifest.publishConfig?.registry && manifest.publishConfig.registry.replace(/\/$/, '') !== registry) throw new Error('Release registry must be npmjs.org');
}
function section(changelog, name) {
  const headings = [...changelog.matchAll(/^## \[([^\]]+)\][^\r\n]*(?:\r?\n|$)/gm)];
  const matches = headings.filter(heading => heading[1] === name);
  if (matches.length !== 1) throw new Error(`Expected exactly one changelog section [${name}]`);
  const heading = matches[0]; const index = headings.indexOf(heading);
  const start = heading.index + heading[0].length; const end = headings[index + 1]?.index ?? changelog.length;
  return { headingStart: heading.index, start, end, body: changelog.slice(start, end).trim() };
}
function assertNotes(notes) {
  const content = notes.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/).filter(line => !/^\s*#/.test(line))
    .filter(line => !/^\s*(?:[-*]\s*)?(?:todo|tbd|nothing yet|no unreleased changes|no changes yet)\.?\s*$/i.test(line)).join('\n');
  if (!/[a-z0-9]/i.test(content)) throw new Error('Add meaningful release notes under [Unreleased] before preparing a release');
}
function planRelease(project, target, date = new Date().toISOString().slice(0, 10)) {
  assertProject(project);
  const version = ['patch', 'minor', 'major'].includes(target) ? semver.inc(project.manifest.version, target) : semver.valid(target);
  if (!version || target.includes('+') || semver.parse(version).build.length || !semver.gt(version, project.manifest.version)) throw new Error('Choose patch, minor, major, or an exact higher SemVer version without build metadata');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid release date');
  if ([...project.changelog.matchAll(/^## \[([^\]]+)\]/gm)].some(heading => heading[1] === version)) throw new Error(`Changelog version ${version} already exists`);
  const unreleased = section(project.changelog, 'Unreleased'); assertNotes(unreleased.body);
  const manifest = structuredClone(project.manifest); const lock = structuredClone(project.lock);
  manifest.version = version; lock.version = version; lock.packages[''].version = version;
  const newline = project.changelog.includes('\r\n') ? '\r\n' : '\n';
  const replacement = `## [Unreleased]${newline}${newline}## [${version}] — ${date}${newline}${newline}${unreleased.body}${newline}${newline}`;
  return { manifest, lock, version, changelog: project.changelog.slice(0, unreleased.headingStart) + replacement + project.changelog.slice(unreleased.end) };
}
function validateRelease(project, tag, githubRelease) {
  assertProject(project);
  const version = project.manifest.version;
  if (tag !== 'v' + version) throw new Error(`Release tag must match package version exactly: v${version}`);
  assertNotes(section(project.changelog, version).body);
  const prerelease = semver.prerelease(version);
  if (githubRelease) {
    if (githubRelease.isDraft || githubRelease.draft) throw new Error('Publish the GitHub Release before running npm publication');
    if (githubRelease.tagName !== undefined && githubRelease.tagName !== tag) throw new Error('GitHub release tag mismatch');
    const flag = githubRelease.isPrerelease ?? githubRelease.prerelease;
    if (flag !== undefined && flag !== !!prerelease) throw new Error('GitHub prerelease flag must agree with the SemVer prerelease version');
  }
  return { version, tag, npmTag: prerelease ? ['alpha', 'beta', 'rc', 'next'].includes(String(prerelease[0])) ? String(prerelease[0]) : 'next' : 'latest' };
}
async function registryState(name, version, integrity, npmTag, fetchImpl = fetch) {
  const get = async suffix => {
    const response = await fetchImpl(`${registry}/${encodeURIComponent(name)}/${suffix}`, { signal: AbortSignal.timeout(20000) });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`npm registry returned HTTP ${response.status}; refusing to assume a version is unpublished`);
    return response.json();
  };
  const existing = await get(encodeURIComponent(version));
  if (existing) {
    if (existing.name !== name || existing.version !== version || existing.dist?.integrity !== integrity) throw new Error(`Version ${version} already exists with different integrity; never overwrite a published version`);
    return { alreadyPublished: true };
  }
  const latest = await get('latest');
  if (!latest || !semver.valid(latest.version)) throw new Error('Cannot verify the existing package latest version');
  if (npmTag === 'latest' && !semver.gt(version, latest.version)) throw new Error(`Refusing to move latest backward from ${latest.version} to ${version}`);
  return { alreadyPublished: false };
}
async function waitForPublished({ name, version, integrity, npmTag, fetchImpl = fetch,
  delays = publishedVisibilityDelays, sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) }) {
  for (let attempt = 0; ; attempt++) {
    const state = await registryState(name, version, integrity, npmTag, fetchImpl);
    if (state.alreadyPublished) return { ...state, attempts: attempt + 1 };
    const delay = delays[attempt];
    if (delay === undefined) throw new Error('Published package was not visible with matching integrity before timeout');
    await sleep(delay);
  }
}
function verifyArchive(directory, info, manifest) {
  const expected = `${manifest.name}-${manifest.version}.tgz`;
  if (info.filename !== expected || path.basename(info.filename) !== info.filename) throw new Error('Unexpected package archive filename');
  if (info.name !== manifest.name || info.version !== manifest.version) throw new Error('Archive metadata does not match package version/name');
  const archive = path.resolve(directory, info.filename);
  if (fs.lstatSync(archive).isSymbolicLink()) throw new Error('Archive must not be a symbolic link');
  const bytes = fs.readFileSync(archive);
  const integrity = 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64');
  if (integrity !== info.integrity) throw new Error('Package archive integrity mismatch');
  if (info.sha256 && crypto.createHash('sha256').update(bytes).digest('hex') !== info.sha256) throw new Error('Package archive SHA256 mismatch');
  const packed = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 }));
  if (packed.name !== manifest.name || packed.version !== manifest.version) throw new Error('Packed manifest does not match release version/name');
  return archive;
}
function readProject(root) {
  return { manifest: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')),
    lock: JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')), changelog: fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8') };
}
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function checkTag(root, tag, branch, expectedSha) {
  if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) throw new Error('Invalid release tag');
  git(root, 'check-ref-format', '--branch', branch);
  const sha = git(root, 'rev-parse', '--verify', `refs/tags/${tag}^{commit}`);
  if (git(root, 'rev-parse', 'HEAD') !== sha || expectedSha && sha !== expectedSha) throw new Error('Tag commit changed or checkout does not match the validated release commit');
  try { git(root, 'merge-base', '--is-ancestor', sha, `refs/remotes/origin/${branch}`); }
  catch { throw new Error(`Release tag must point to a commit reachable from origin/${branch}`); }
  return sha;
}
function writePreparation(root, plan) {
  if (git(root, 'status', '--porcelain', '--untracked-files=normal')) throw new Error('Working tree is dirty; commit your reviewed changes before preparing a release (use --dry-run to preview)');
  const updates = { 'package.json': JSON.stringify(plan.manifest, null, 2) + '\n', 'package-lock.json': JSON.stringify(plan.lock, null, 2) + '\n', 'CHANGELOG.md': plan.changelog };
  const originals = new Map(); const changed = [];
  for (const name of Object.keys(updates)) {
    const file = path.join(root, name); if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) throw new Error('Release inputs must be regular files');
    originals.set(name, fs.readFileSync(file));
  }
  try { for (const [name, bytes] of Object.entries(updates)) { changed.push(name); fs.writeFileSync(path.join(root, name), bytes); } }
  catch (error) { for (const name of changed.reverse()) fs.writeFileSync(path.join(root, name), originals.get(name)); throw error; }
}
function outputs(values) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
  console.log(JSON.stringify(values));
}
async function main(args) {
  const command = args.shift(); const root = process.cwd();
  const flags = {}; const positional = [];
  while (args.length) {
    const arg = args.shift();
    if (['--dry-run', '--check-git'].includes(arg)) flags[arg] = true;
    else if (['--tag', '--expected-sha', '--github-release-json', '--package-dir'].includes(arg)) { const value = args.shift(); if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`); flags[arg] = value; }
    else if (arg.startsWith('--')) throw new Error(`Unknown release option: ${arg}`);
    else positional.push(arg);
  }
  const project = readProject(root);
  if (command === 'prepare') {
    if (positional.length !== 1) throw new Error('Usage: npm run release:prepare -- <patch|minor|major|version> [--dry-run]');
    const plan = planRelease(project, positional[0]);
    if (!flags['--dry-run']) writePreparation(root, plan);
    console.log(`${flags['--dry-run'] ? 'Would prepare' : 'Prepared'} ${project.manifest.version} → ${plan.version}: package.json, package-lock.json, CHANGELOG.md`);
    console.log('Review and commit these files, merge to the default branch, then create/publish GitHub Release v' + plan.version + ' at that reviewed commit. Nothing was tagged, pushed or published.'); return;
  }
  if (positional.length) throw new Error('Unexpected release arguments');
  const tag = flags['--tag'] || process.env.RELEASE_TAG || 'v' + project.manifest.version;
  const githubRelease = flags['--github-release-json'] ? JSON.parse(fs.readFileSync(flags['--github-release-json'], 'utf8')) : undefined;
  const validation = validateRelease(project, tag, githubRelease);
  const sha = flags['--check-git'] ? checkTag(root, tag, process.env.DEFAULT_BRANCH || 'main', flags['--expected-sha']) : undefined;
  if (command === 'check') { outputs({ version: validation.version, tag, 'npm-tag': validation.npmTag, ...(sha && { sha }) }); return; }
  if (command === 'notes') { console.log(section(project.changelog, validation.version).body); return; }
  if (!['registry', 'verify-published'].includes(command)) throw new Error('Use release prepare, check, notes, registry or verify-published');
  const directory = path.resolve(flags['--package-dir'] || '.release/package');
  const info = JSON.parse(fs.readFileSync(path.join(directory, 'package-info.json'), 'utf8'));
  verifyArchive(directory, info, project.manifest);
  const state = command === 'verify-published'
    ? await waitForPublished({ name: project.manifest.name, version: validation.version, integrity: info.integrity, npmTag: validation.npmTag })
    : await registryState(project.manifest.name, validation.version, info.integrity, validation.npmTag);
  outputs({ version: validation.version, tag, 'npm-tag': validation.npmTag, 'already-published': String(state.alreadyPublished), 'archive-filename': info.filename });
}
module.exports = { planRelease, validateRelease, registryState, waitForPublished, verifyArchive, checkTag, readProject, writePreparation };
if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
