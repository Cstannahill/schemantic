import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import { Schemantic } from '../core/schemantic';
import { OpenAPISchema } from '../types/openapi';
import { createTestConfig } from './test-config';

describe('fresh generated validation behavior', () => {
  let outputDir: string;
  beforeEach(async () => { outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemantic-validation-')); });
  afterEach(async () => { await fs.rm(outputDir, { recursive: true, force: true }); });

  async function generate(schemas: NonNullable<NonNullable<OpenAPISchema['components']>['schemas']>, overrides = {}) {
    const schemaData: OpenAPISchema = { openapi: '3.1.0', info: { title: 'Validation', version: '1' }, paths: {}, components: { schemas } };
    const result = await new Schemantic(createTestConfig({ schemaData, outputDir, generateApiClient: false,
      plugins: [{ name: 'zod-validation', enabled: true }], ...overrides })).generate();
    expect(result.errors).toEqual([]);
    const source = await fs.readFile(path.join(outputDir, 'types.ts'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
    const exports: Record<string, (value: unknown) => unknown> = {};
    new Function('exports', 'require', compiled.outputText)(exports, require);
    return exports;
  }

  it('preserves both existing camelCase and wire keys and reports missing required values', async () => {
    const output = await generate({ User: { type: 'object', required: ['user_id', 'displayName'], properties: {
      user_id: { type: 'string' }, displayName: { type: 'string' }, 'x-label': { type: 'string' },
    } } });
    const input = { user_id: '1', displayName: 'Ada', 'x-label': 'label' };
    expect(output.validateUser!(input)).toEqual({ success: true, data: input });
    expect(output.validateUser!({ displayName: 'Ada' })).toMatchObject({ success: false });
  });

  it('validates numeric enums, nullable values, dictionary entries and unions', async () => {
    const output = await generate({ Fields: { type: 'object', properties: {
      status: { type: 'integer', enum: [1, 2] }, maybe: { type: ['string', 'null'] },
      legacy: { type: 'string', nullable: true }, choice: { anyOf: [{ type: 'string' }, { type: 'number' }] },
      lookup: { type: 'object', additionalProperties: { type: 'integer' } },
    } } });
    expect(output.validateFields!({ status: 3 })).toMatchObject({ success: false });
    expect(output.validateFields!({ maybe: null, legacy: null, choice: 1, lookup: { a: 2 } })).toMatchObject({ success: true });
    expect(output.validateFields!({ choice: false })).toMatchObject({ success: false });
    expect(output.validateFields!({ lookup: { a: 'wrong' } })).toMatchObject({ success: false });
  });

  it('loads forward and recursive references and isolates naming options across generations', async () => {
    const schemas = {
      Parent: { type: 'object' as const, properties: { child: { $ref: '#/components/schemas/Child' } } },
      Child: { type: 'object' as const, required: ['name'], properties: { name: { type: 'string' as const }, parent: { $ref: '#/components/schemas/Parent' } } },
    };
    const first = await generate(schemas, { typePrefix: 'First' });
    expect(first.validateFirstParent!({ child: { name: 'valid' } })).toMatchObject({ success: true });
    const second = await generate(schemas, { typePrefix: 'Second' });
    expect(second.validateSecondParent!({ child: { name: 2 } })).toMatchObject({ success: false });
  });
});
