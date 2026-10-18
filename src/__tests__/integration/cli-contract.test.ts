import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawnSync, spawn } from 'child_process';

describe('CLI contract', () => {
  let directory: string;
  const cli = path.resolve(__dirname, '../../../dist/cli/index.js');
  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'schemantic-cli-'));
    await fs.writeFile(path.join(directory, 'schema.json'), JSON.stringify({
      openapi: '3.1.0', info: { title: 'CLI API', version: '1' }, paths: {},
      components: { schemas: { User: { type: 'object', properties: { id: { type: 'string' } } } } },
    }));
  });
  afterEach(async () => { await fs.rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }); });
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: directory, encoding: 'utf8', timeout: 5000 });

  it('returns nonzero for invalid generation and validation, including quiet mode', async () => {
    await fs.writeFile(path.join(directory, 'invalid.json'), JSON.stringify({ openapi: '3.1.0', info: { title: 'Invalid', version: '' }, paths: {} }));
    for (const command of ['generate', 'validate']) {
      expect(run(command, '--file', 'invalid.json', '--quiet').status).toBe(1);
    }
  });

  it('honors types-only output', async () => {
    const result = run('generate', '--file', 'schema.json', '--output', 'out', '--types');
    expect(result.status).toBe(0);
    expect((await fs.readdir(path.join(directory, 'out'))).sort()).toEqual(['.schemantic-manifest.json', 'conversion.ts', 'index.ts', 'types.ts']);
  });

  it('preserves config naming settings and lets a CLI file override a config URL', async () => {
    await fs.writeFile(path.join(directory, 'config.json'), JSON.stringify({ schemaUrl: 'http://127.0.0.1:1/openapi.json', typePrefix: 'My', typeSuffix: 'Dto', namingConvention: 'snake_case', outputDir: 'out' }));
    const result = run('generate', '--config', 'config.json', '--file', 'schema.json');
    expect(result.status).toBe(0);
    expect(await fs.readFile(path.join(directory, 'out', 'types.ts'), 'utf8')).toContain('interface MyUserDto');
  });

  it('rejects unsupported flags and invalid naming rather than silently ignoring them', () => {
    expect(run('generate', '--file', 'schema.json', '--naming', 'invalid').status).toBe(1);
    expect(run('validate', '--file', 'schema.json', '--fix').status).toBe(1);
    expect(run('generate', '--file', 'schema.json', '--watch', '--url', 'http://127.0.0.1:1').status).toBe(1);
  });
  it('regenerates local schema changes in watch mode', async () => {
    const child = spawn(process.execPath, [cli, 'generate', '--file', 'schema.json', '--output', 'out', '--types', '--watch'], { cwd: directory });
    const closed = new Promise<void>(resolve => child.once('close', () => resolve()));
    let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
    const waitUntil = async (predicate: () => Promise<boolean>) => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (await predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error('Watch did not regenerate: ' + output);
    };
    try {
      await waitUntil(async () => output.includes('Watching'));
      const data = JSON.parse(await fs.readFile(path.join(directory, 'schema.json'), 'utf8'));
      data.components.schemas.User.properties.updated = { type: 'boolean' };
      await fs.writeFile(path.join(directory, 'schema.json'), JSON.stringify(data));
      await waitUntil(async () => (await fs.readFile(path.join(directory, 'out', 'types.ts'), 'utf8')).includes('updated'));
    } finally { child.kill(); await closed; }
  });

});
