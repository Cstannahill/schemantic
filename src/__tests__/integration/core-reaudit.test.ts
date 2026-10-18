import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as ts from 'typescript';
import { Schemantic } from '../../core/schemantic';
import { createTestConfig } from '../test-config';
import { OpenAPISchema } from '../../types/openapi';

describe('re-audit core lifecycle contracts', () => {
  let outputDir: string;
  const schema = (): OpenAPISchema => ({ openapi: '3.1.0', info: { title: 'Audit', version: '1' }, paths: {},
    components: { schemas: { User: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } } } });
  beforeEach(async () => { outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemantic-reaudit-')); });
  afterEach(async () => { await fs.rm(outputDir, { recursive: true, force: true }); });
  const generator = (overrides = {}) => new Schemantic(createTestConfig({ outputDir, schemaData: schema(), ...overrides }));

  it.each(['Types.ts', 'types.ts/client.ts'])('rejects file alias/ancestor collision %s before writing', async outputFileName => {
    await fs.writeFile(path.join(outputDir, 'types.ts'), 'existing types');
    const result = await generator({ outputFileName }).generate();
    expect(result.success).toBe(false);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('existing types');
    expect(result.generatedFiles).toEqual([]);
  });

  it('includes unresolved references in public validation', async () => {
    const data = schema(); data.components!.schemas!.Bad = { $ref: '#/components/schemas/Missing' };
    const result = await generator({ schemaData: data }).validate();
    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.message).toContain('Missing');
  });

  it('accepts a typed components-only OpenAPI 3.1 input with defaulted configuration', async () => {
    const result = await new Schemantic({ outputDir, generateApiClient: false, schemaData: {
      openapi: '3.1.2', info: { title: 'Types', version: '1' }, components: { schemas: { User: { type: 'object', properties: { user_id: { type: 'string' } } } } },
    } }).generate();
    expect(result.success).toBe(true);
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toContain('userId?: string');
  });

  it('fails required plugin hooks and preserves previous output', async () => {
    const instance = generator({ plugins: [{ name: 'required-plugin', enabled: true }] });
    instance.getPluginManager().registerPlugin({ name: 'required-plugin', version: '1', description: 'required',
      afterGeneration: () => { throw new Error('cannot validate output'); } });
    await fs.writeFile(path.join(outputDir, 'types.ts'), 'old valid output');
    const result = await instance.generate();
    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toContain('required-plugin');
    expect(await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8')).toBe('old valid output');
  });

  it('removes stale owned output but preserves unrelated files', async () => {
    const instance = generator({ generateHooks: true });
    expect((await instance.generate()).success).toBe(true);
    await fs.writeFile(path.join(outputDir, 'notes.txt'), 'user content');
    Object.assign(instance.getConfig(), { generateHooks: false, generateApiClient: false });
    expect((await instance.generate()).success).toBe(true);
    expect(await fs.readFile(path.join(outputDir, 'notes.txt'), 'utf8')).toBe('user content');
    const files = await fs.readdir(outputDir);
    expect(files).not.toContain('api-client.ts'); expect(files).not.toContain('hooks.ts');
  });

  it('preserves arbitrary custom plugin imports', async () => {
    const instance = generator({ plugins: [{ name: 'custom-import', enabled: true }] });
    instance.getPluginManager().registerPlugin({ name: 'custom-import', version: '1', description: 'custom',
      afterTypeGeneration: (_name, generated) => {
        generated.content += '\nimport type { ExternalShape } from "./external.js";\nexport type ExternalModel = ExternalShape;';
        generated.dependencies.push('./external'); generated.exports.push('ExternalModel');
      } });
    expect((await instance.generate()).success).toBe(true);
    await fs.writeFile(path.join(outputDir, 'external.ts'), 'export interface ExternalShape { external: string; }');
    const program = ts.createProgram([path.join(outputDir, 'types.ts')], { strict: true, noEmit: true, types: [], skipLibCheck: true });
    expect(ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
  });

  it.each([{ generateTypes: 'false' }, { mysteryFlag: true }, { generateQueries: true }])('rejects ineffective or malformed configuration %j', options => {
    expect(() => generator(options)).toThrow();
  });
});
