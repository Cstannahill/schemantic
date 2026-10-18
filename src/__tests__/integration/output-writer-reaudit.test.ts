import fs = require('fs/promises');
import * as path from 'path';
import { validateOutputNames, writeOutput } from '../../core/output-writer';
import { GeneratedFile } from '../../types/core';

jest.mock('fs/promises', () => {
  const actual = jest.requireActual<typeof fs>('fs/promises');
  return { ...actual, rename: jest.fn(actual.rename) };
});
const realRename = jest.requireActual<typeof fs>('fs/promises').rename;

describe('output writer filesystem re-audit', () => {
  let directory: string;
  let outputDir: string;
  let outsideDir: string;
  const manifest = '.schemantic-manifest.json';
  const file = (name: string, content: string): GeneratedFile => ({ path: path.join(outputDir, name), content,
    type: 'type', dependencies: [], size: Buffer.byteLength(content) });
  beforeEach(async () => {
    jest.mocked(fs.rename).mockReset().mockImplementation(realRename);
    const parent = path.resolve(__dirname, '../../../.artifacts/jest');
    await fs.mkdir(parent, { recursive: true });
    directory = await fs.mkdtemp(path.join(parent, 'writer-'));
    outputDir = path.join(directory, 'output'); outsideDir = path.join(directory, 'outside');
    await fs.mkdir(outputDir); await fs.mkdir(outsideDir);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 });
  });

  it('restores previous bytes and ownership after a real filesystem rename failure during commit', async () => {
    await writeOutput(outputDir, [file('types.ts', 'old types'), file('client.ts', 'old client')]);
    const oldManifest = await fs.readFile(path.join(outputDir, manifest), 'utf8');
    const spy = jest.mocked(fs.rename).mockImplementation(async (source, target) => {
      await realRename(source, target);
      if (path.basename(String(source)) === '0') {
        // Remove the next staged file: the following real rename fails with ENOENT.
        const obstruction = path.join(path.dirname(String(source)), '1');
        await fs.unlink(obstruction);
      }
    });
    const attempt = await writeOutput(outputDir, [file('types.ts', 'new types'), file('client.ts', 'new client')]).then(() => undefined, error => error);
    expect(spy).toHaveBeenCalled();
    expect(attempt).toHaveProperty('code', 'ENOENT');
    spy.mockImplementation(realRename);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('old types');
    expect(await fs.readFile(path.join(outputDir, 'client.ts'), 'utf8')).toBe('old client');
    expect(await fs.readFile(path.join(outputDir, manifest), 'utf8')).toBe(oldManifest);
    expect((await fs.readdir(outputDir)).some(name => name.startsWith('.schemantic-stage-'))).toBe(false);
  });

  it('rejects existing child directory links before touching any output or external file', async () => {
    await fs.writeFile(path.join(outsideDir, 'client.ts'), 'external');
    await fs.symlink(outsideDir, path.join(outputDir, 'nested'), 'junction');
    await expect(writeOutput(outputDir, [file('types.ts', 'new'), file('nested/client.ts', 'generated')])).rejects.toThrow(/symbolic link/);
    expect(await fs.readFile(path.join(outsideDir, 'client.ts'), 'utf8')).toBe('external');
    expect(await fs.readdir(outputDir)).toEqual(['nested']);
  });

  it('rechecks child paths during commit and rolls back instead of following a substituted link', async () => {
    await writeOutput(outputDir, [file('types.ts', 'old types')]);
    const oldManifest = await fs.readFile(path.join(outputDir, manifest), 'utf8');
    await fs.mkdir(path.join(outputDir, 'nested'));
    await fs.writeFile(path.join(outsideDir, 'client.ts'), 'external');
    const spy = jest.mocked(fs.rename).mockImplementation(async (source, target) => {
      await realRename(source, target);
      if (path.basename(String(source)) === '0') {
        await fs.rmdir(path.join(outputDir, 'nested'));
        await fs.symlink(outsideDir, path.join(outputDir, 'nested'), 'junction');
      }
    });
    await expect(writeOutput(outputDir, [file('types.ts', 'new types'), file('nested/client.ts', 'generated')])).rejects.toThrow(/symbolic link/);
    spy.mockImplementation(realRename);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('old types');
    expect(await fs.readFile(path.join(outputDir, manifest), 'utf8')).toBe(oldManifest);
    expect(await fs.readFile(path.join(outsideDir, 'client.ts'), 'utf8')).toBe('external');
  });

  it('preserves modified stale output and relinquishes its manifest ownership', async () => {
    await writeOutput(outputDir, [file('types.ts', 'original'), file('hooks.ts', 'generated hooks')]);
    await fs.writeFile(path.join(outputDir, 'hooks.ts'), 'user-edited hooks');
    await fs.writeFile(path.join(outputDir, 'notes.txt'), 'unrelated');
    await writeOutput(outputDir, [file('types.ts', 'updated')]);
    expect(await fs.readFile(path.join(outputDir, 'hooks.ts'), 'utf8')).toBe('user-edited hooks');
    expect(await fs.readFile(path.join(outputDir, 'notes.txt'), 'utf8')).toBe('unrelated');
    const ownership = JSON.parse(await fs.readFile(path.join(outputDir, manifest), 'utf8')) as { files: Record<string, string> };
    expect(Object.keys(ownership.files)).toEqual(['types.ts']);
  });

  it('restores deleted stale files when the real manifest commit fails', async () => {
    await writeOutput(outputDir, [file('types.ts', 'old types'), file('hooks.ts', 'old hooks')]);
    const oldManifest = await fs.readFile(path.join(outputDir, manifest), 'utf8');
    jest.mocked(fs.rename).mockImplementation(async (source, target) => {
      if (path.basename(String(source)) === 'manifest') await fs.unlink(String(source));
      await realRename(source, target);
    });
    await expect(writeOutput(outputDir, [file('types.ts', 'new types')])).rejects.toHaveProperty('code', 'ENOENT');
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('old types');
    expect(await fs.readFile(path.join(outputDir, 'hooks.ts'), 'utf8')).toBe('old hooks');
    expect(await fs.readFile(path.join(outputDir, manifest), 'utf8')).toBe(oldManifest);
  });

  it('preserves a stale file edited after preflight but before its deletion', async () => {
    await writeOutput(outputDir, [file('types.ts', 'old types'), file('hooks.ts', 'old hooks')]);
    jest.mocked(fs.rename).mockImplementation(async (source, target) => {
      await realRename(source, target);
      if (path.basename(String(source)) === '0') await fs.writeFile(path.join(outputDir, 'hooks.ts'), 'edited during commit');
    });
    await writeOutput(outputDir, [file('types.ts', 'new types')]);
    expect(await fs.readFile(path.join(outputDir, 'hooks.ts'), 'utf8')).toBe('edited during commit');
  });

  it('serializes concurrent writes to the same directory into complete output packages', async () => {
    await Promise.all([
      writeOutput(outputDir, [file('types.ts', 'first types'), file('first.ts', 'first artifact')]),
      writeOutput(outputDir, [file('types.ts', 'second types'), file('second.ts', 'second artifact')]),
    ]);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('second types');
    expect((await fs.readdir(outputDir)).sort()).toEqual([manifest, 'second.ts', 'types.ts'].sort());
    const ownership = JSON.parse(await fs.readFile(path.join(outputDir, manifest), 'utf8')) as { files: Record<string, string> };
    expect(Object.keys(ownership.files).sort()).toEqual(['second.ts', 'types.ts']);
  });

  it('allows a queued package to finish after an earlier queued write fails', async () => {
    let first = true;
    jest.mocked(fs.rename).mockImplementation(async (source, target) => {
      if (first && path.basename(String(source)) === '0') { first = false; await fs.unlink(String(source)); }
      await realRename(source, target);
    });
    const results = await Promise.allSettled([
      writeOutput(outputDir, [file('types.ts', 'failed')]),
      writeOutput(outputDir, [file('types.ts', 'successful'), file('client.ts', 'successful client')]),
    ]);
    expect(results.map(result => result.status)).toEqual(['rejected', 'fulfilled']);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('successful');
    expect((await fs.readdir(outputDir)).sort()).toEqual([manifest, 'client.ts', 'types.ts'].sort());
  });

  it('does not delete an active destination during a case-only output filename change', async () => {
    await writeOutput(outputDir, [file('Client.ts', 'old client')]);
    await writeOutput(outputDir, [file('client.ts', 'new client')]);
    expect(await fs.readFile(path.join(outputDir, 'client.ts'), 'utf8')).toBe('new client');
    expect((await fs.readdir(outputDir)).filter(name => name.toLowerCase() === 'client.ts')).toEqual(['client.ts']);
  });

  it('retains ownership for prototype-looking generated names and removes their stale bytes', async () => {
    await writeOutput(outputDir, [file('__proto__', 'owned')]);
    await writeOutput(outputDir, [file('types.ts', 'current')]);
    await expect(fs.readFile(path.join(outputDir, '__proto__'))).rejects.toHaveProperty('code', 'ENOENT');
  });

  it('regenerates explicitly selected active filenames in pre-manifest output directories', async () => {
    await fs.writeFile(path.join(outputDir, 'types.ts'), 'previous generated output');
    await writeOutput(outputDir, [file('types.ts', 'new generated output')]);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('new generated output');
  });

  it('rejects control characters in output names', () => {
    for (const code of [0, 9, 10, 31]) expect(() => validateOutputNames(['name' + String.fromCharCode(code) + '.ts'])).toThrow(/Invalid output filename/);
  });

  it.each(['EPERM', 'EBUSY', 'EACCES'])('retries a transient %s rename without deleting the active output', async code => {
    await writeOutput(outputDir, [file('types.ts', 'old types')]);
    let locked = true;
    const rename = jest.mocked(fs.rename).mockClear().mockImplementation(async (source, target) => {
      if (locked && path.basename(String(source)) === '0') {
        locked = false;
        expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('old types');
        throw Object.assign(new Error('Temporarily locked output'), { code });
      }
      await realRename(source, target);
    });
    await writeOutput(outputDir, [file('types.ts', 'new types')]);
    expect(rename.mock.calls.filter(([source]) => path.basename(String(source)) === '0')).toHaveLength(2);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('new types');
  });

  it('retries a transient manifest replacement failure after updating output files', async () => {
    await writeOutput(outputDir, [file('types.ts', 'old types')]);
    let locked = true;
    jest.mocked(fs.rename).mockImplementation(async (source, target) => {
      if (locked && path.basename(String(source)) === 'manifest') {
        locked = false; throw Object.assign(new Error('Temporarily locked manifest'), { code: 'EBUSY' });
      }
      await realRename(source, target);
    });
    await writeOutput(outputDir, [file('types.ts', 'new types')]);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('new types');
    const ownership = JSON.parse(await fs.readFile(path.join(outputDir, manifest), 'utf8')) as { files: Record<string, string> };
    expect(ownership.files['types.ts']).toBeDefined();
  });

  it('retries transient rollback replacement failure and restores the earlier successful commit', async () => {
    await writeOutput(outputDir, [file('types.ts', 'old types'), file('client.ts', 'old client')]);
    let rollbackLocked = true;
    jest.mocked(fs.rename).mockImplementation(async (source, target) => {
      const name = path.basename(String(source));
      if (name === '1') await fs.unlink(String(source));
      if (name.startsWith('restore-') && rollbackLocked) {
        rollbackLocked = false; throw Object.assign(new Error('Temporarily locked rollback'), { code: 'EBUSY' });
      }
      await realRename(source, target);
    });
    await expect(writeOutput(outputDir, [file('types.ts', 'new types'), file('client.ts', 'new client')])).rejects.toHaveProperty('code', 'ENOENT');
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('old types');
    expect(await fs.readFile(path.join(outputDir, 'client.ts'), 'utf8')).toBe('old client');
  });

  it('bounds permanent rename retries and preserves prior output bytes and manifest', async () => {
    await writeOutput(outputDir, [file('types.ts', 'old types'), file('client.ts', 'old client')]);
    const oldManifest = await fs.readFile(path.join(outputDir, manifest), 'utf8');
    const rename = jest.mocked(fs.rename).mockClear().mockImplementation(async (source, target) => {
      if (path.basename(String(source)) === '1') throw Object.assign(new Error('Permanently locked client'), { code: 'EACCES' });
      await realRename(source, target);
    });
    await expect(writeOutput(outputDir, [file('types.ts', 'new types'), file('client.ts', 'new client')])).rejects.toHaveProperty('code', 'EACCES');
    expect(rename.mock.calls.filter(([source]) => path.basename(String(source)) === '1')).toHaveLength(6);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('old types');
    expect(await fs.readFile(path.join(outputDir, 'client.ts'), 'utf8')).toBe('old client');
    expect(await fs.readFile(path.join(outputDir, manifest), 'utf8')).toBe(oldManifest);
  });

  it('rechecks output paths before retrying instead of following a link substituted during a lock', async () => {
    await writeOutput(outputDir, [file('types.ts', 'old types')]);
    await fs.mkdir(path.join(outputDir, 'nested'));
    await fs.writeFile(path.join(outsideDir, 'client.ts'), 'external');
    let locked = true;
    const rename = jest.mocked(fs.rename).mockClear().mockImplementation(async (source, target) => {
      if (locked && path.basename(String(source)) === '1') {
        locked = false;
        await fs.rmdir(path.join(outputDir, 'nested'));
        await fs.symlink(outsideDir, path.join(outputDir, 'nested'), 'junction');
        throw Object.assign(new Error('Locked during link substitution'), { code: 'EBUSY' });
      }
      await realRename(source, target);
    });
    await expect(writeOutput(outputDir, [file('types.ts', 'new types'), file('nested/client.ts', 'generated')])).rejects.toThrow(/symbolic link/);
    expect(rename.mock.calls.filter(([source]) => path.basename(String(source)) === '1')).toHaveLength(1);
    expect(await fs.readFile(path.join(outsideDir, 'client.ts'), 'utf8')).toBe('external');
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('old types');
  });
});
