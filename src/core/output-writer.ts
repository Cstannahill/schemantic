import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { GeneratedFile } from '../types/core';

const manifestName = '.schemantic-manifest.json';
const hash = (content: string | Buffer) => createHash('sha256').update(content).digest('hex');
const outputQueues = new Map<string, Promise<void>>();
const transientRenameErrors = new Set(['EPERM', 'EBUSY', 'EACCES']);

async function assertSafePath(root: string, name: string, directory = false): Promise<void> {
  const rootStat = await fs.lstat(root);
  if (rootStat.isSymbolicLink()) throw new Error('Refusing symbolic link output directory: ' + root);
  if (!rootStat.isDirectory()) throw new Error('Output directory is not a directory: ' + root);
  const parts = name.split('/');
  let current = root;
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]!);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw new Error(`Refusing symbolic link output path: ${name}`);
      const isDirectory = index < parts.length - 1 || directory;
      if (isDirectory && !stat.isDirectory()) throw new Error(`Output ancestor is a file: ${name}`);
      if (!isDirectory && !stat.isFile()) throw new Error(`Output destination is not a regular file: ${name}`);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
}

async function cleanupStage(root: string, stage: string): Promise<void> {
  const name = path.basename(stage);
  // Check the generated absolute target before recursive cleanup and reject substituted links.
  if (path.dirname(stage) !== root || !name.startsWith('.schemantic-stage-')) throw new Error('Invalid staging cleanup path');
  await assertSafePath(root, name, true);
  await fs.rm(stage, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 });
}

/** Readers/scanners can briefly lock Windows rename targets. Retry the atomic replacement only. */
async function renameSafely(root: string, source: string, destination: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    // Revalidate both paths every time, including after the backoff delay.
    await assertSafePath(root, source);
    await assertSafePath(root, destination);
    try {
      await fs.rename(path.join(root, source), path.join(root, destination));
      return;
    } catch (error) {
      if (attempt >= 5 || !transientRenameErrors.has((error as NodeJS.ErrnoException).code ?? '')) throw error;
      await new Promise<void>(resolve => setTimeout(resolve, 20 * 2 ** attempt));
    }
  }
}

export function validateOutputNames(names: string[]): void {
  const normalized: string[] = [];
  for (const name of names) {
    const segments = name.replace(/\\/g, '/').split('/');
    if (path.isAbsolute(name) || segments.some(part => !part || part === '.' || part === '..' || /[:<>"|?*]/.test(part)
      || Array.from(part).some(character => character.charCodeAt(0) < 32)
      || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error(`Invalid output filename: ${name}`);
    const key = segments.join('/').toLowerCase();
    if (normalized.some(existing => existing === key || existing.startsWith(key + '/') || key.startsWith(existing + '/'))) throw new Error(`Output filename collision: ${name}`);
    normalized.push(key);
  }
}

/** Active filenames are regenerated. Only manifest-owned, unmodified stale files are removed.
 * Calls in this process are queued by output directory; unrelated directories remain independent.
 */
export async function writeOutput(outputDir: string, files: GeneratedFile[]): Promise<void> {
  const root = path.resolve(outputDir);
  const key = process.platform === 'win32' ? root.toLowerCase() : root;
  const snapshot = files.map(file => ({ ...file }));
  const previous = outputQueues.get(key) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(() => commitOutput(root, snapshot));
  outputQueues.set(key, pending);
  try { await pending; }
  finally { if (outputQueues.get(key) === pending) outputQueues.delete(key); }
}

async function commitOutput(root: string, files: GeneratedFile[]): Promise<void> {
  const names = files.map(file => {
    const relative = path.relative(root, path.resolve(file.path)).replace(/\\/g, '/');
    if (!relative || relative.startsWith('../')) throw new Error(`Output escapes outputDir: ${file.path}`);
    return relative;
  });
  validateOutputNames([...names, manifestName]);
  await fs.mkdir(root, { recursive: true });
  await assertSafePath(root, manifestName);
  const previous: Record<string, string> = Object.create(null) as Record<string, string>;
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(root, manifestName), 'utf8')) as { version: number; files: Record<string, string> };
    if (manifest.version !== 1 || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) throw new Error('Invalid output ownership manifest');
    validateOutputNames([...Object.keys(manifest.files), manifestName]);
    for (const [name, digest] of Object.entries(manifest.files)) {
      if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid output ownership hash');
      previous[name] = digest;
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const destinations = new Set([...names, ...Object.keys(previous), manifestName]);
  const backup = new Map<string, Buffer | undefined>();
  for (const name of destinations) {
    await assertSafePath(root, name);
    try { backup.set(name, await fs.readFile(path.join(root, name))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; backup.set(name, undefined); }
  }
  const stage = await fs.mkdtemp(path.join(root, '.schemantic-stage-'));
  const stageName = path.basename(stage);
  const changed: string[] = [];
  try {
    const next: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let index = 0; index < files.length; index++) {
      const file = files[index]!; const name = names[index]!;
      next[name] = hash(file.content);
      const staged = path.join(stage, String(index));
      await assertSafePath(root, stageName + '/' + String(index));
      await fs.writeFile(staged, file.content, 'utf8');
    }
    await assertSafePath(root, stageName + '/manifest');
    await fs.writeFile(path.join(stage, 'manifest'), JSON.stringify({ version: 1, files: next }, null, 2) + '\n');
    for (let index = 0; index < files.length; index++) {
      const name = names[index]!;
      await assertSafePath(root, name);
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await renameSafely(root, stageName + '/' + String(index), name);
      changed.push(name);
    }
    for (const [name, digest] of Object.entries(previous)) {
      const original = backup.get(name);
      // A user-modified stale file is preserved rather than silently deleted.
      if (!(name in next) && original && hash(original) === digest) {
        await assertSafePath(root, name);
        const alias = names.find(active => active.toLowerCase() === name.toLowerCase());
        if (alias) {
          // On case-insensitive filesystems these spellings name the newly replaced file.
          const [oldStat, activeStat] = await Promise.all([fs.stat(path.join(root, name)), fs.stat(path.join(root, alias))]);
          if (oldStat.dev === activeStat.dev && oldStat.ino === activeStat.ino) continue;
        }
        // Re-read just before deletion: a concurrent user edit after preflight is preserved too.
        let current: Buffer;
        try { current = await fs.readFile(path.join(root, name)); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
        if (hash(current) !== digest) continue;
        await assertSafePath(root, name);
        await fs.unlink(path.join(root, name)); changed.push(name);
      }
    }
    await renameSafely(root, stageName + '/manifest', manifestName);
    changed.push(manifestName);
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const [index, name] of changed.reverse().entries()) {
      try {
        await assertSafePath(root, name);
        const content = backup.get(name);
        if (content !== undefined) {
          const restoreName = stageName + '/restore-' + index;
          await assertSafePath(root, restoreName);
          await fs.writeFile(path.join(root, restoreName), content);
          await renameSafely(root, restoreName, name);
        } else {
          try { await fs.unlink(path.join(root, name)); }
          catch (removeError) { if ((removeError as NodeJS.ErrnoException).code !== 'ENOENT') throw removeError; }
        }
      } catch (rollbackError) { rollbackErrors.push(`${name}: ${String(rollbackError)}`); }
    }
    if (rollbackErrors.length) throw new Error(`${String(error)}; rollback incomplete: ${rollbackErrors.join('; ')}`);
    throw error;
  } finally { await cleanupStage(root, stage); }
}
