import { SchemanticCli } from '../../cli/index';
import { PluginLoader } from '../../plugins/loader';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { Interface } from 'readline';
import type { SchemanticConfig } from '../../types/core';
import { Schemantic } from '../../core/schemantic';
import type { OpenAPISchema } from '../../types/openapi';
import * as ts from 'typescript';

type CliInternals = {
  loadConfiguration(source?: string, options?: Record<string, string | boolean>): Promise<SchemanticConfig>;
  askYesNo(rl: Interface, question: string, defaultValue?: boolean): Promise<boolean>;
  runInteractiveMode(): Promise<void>;
};

describe('CLI re-audit contracts', () => {
  let directory: string;
  let originalCwd: string;
  let originalExitCode: typeof process.exitCode;
  const schema = { openapi: '3.0.3', info: { title: 'CLI contract', version: '1' }, paths: {}, components: { schemas: { Item: { type: 'object', properties: { id: { type: 'integer' } } } } } };
  const invoke = (args: string[]) => new SchemanticCli().run(['node', 'schemantic', ...args]);
  const internals = () => new SchemanticCli() as unknown as CliInternals;

  beforeEach(async () => {
    // macOS exposes its temporary directory through /var -> /private/var.
    directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'schemantic-cli-')));
    originalCwd = process.cwd();
    originalExitCode = process.exitCode;
    process.chdir(directory);
    process.exitCode = undefined;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await fs.writeFile('schema.json', JSON.stringify(schema));
  });
  afterEach(async () => {
    process.chdir(originalCwd);
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('preserves existing configuration bytes unless force is explicit', async () => {
    const original = '{ "custom": "user-owned" }\n';
    await fs.writeFile('schemantic.config.json', original);
    await invoke(['init', '--yes']);
    expect(process.exitCode).toBe(1);
    expect(await fs.readFile('schemantic.config.json', 'utf8')).toBe(original);
    process.exitCode = undefined;
    await invoke(['init', '--yes', '--force']);
    expect(process.exitCode).toBeUndefined();
    expect(JSON.parse(await fs.readFile('schemantic.config.json', 'utf8')).generateHooks).toBe(false);
  });

  it.each([['default', true, false], ['types', false, false], ['react', true, true]])('initializes the %s template', async (template, client, hooks) => {
    await invoke(['init', '--yes', '--template', String(template)]);
    const config = JSON.parse(await fs.readFile('schemantic.config.json', 'utf8'));
    expect(config.generateApiClient).toBe(client);
    expect(config.generateHooks).toBe(hooks);
  });

  it('rejects unknown templates and help commands', async () => {
    await invoke(['init', '--yes', '--template', 'unknown']);
    expect(process.exitCode).toBe(1);
    await expect(fs.access('schemantic.config.json')).rejects.toThrow();
    process.exitCode = undefined;
    await invoke(['help', 'unknown']);
    expect(process.exitCode).toBe(1);
  });

  it('honors explicit positive and negative defaults on Enter', async () => {
    const rl = { question: (_question: string, callback: (answer: string) => void) => callback('') } as unknown as Interface;
    expect(await internals().askYesNo(rl, 'Hooks? (y/N)', false)).toBe(false);
    expect(await internals().askYesNo(rl, 'Client? (Y/n)', true)).toBe(true);
  });

  it('sets failure status for interactive generation', async () => {
    const cli = internals();
    const answers = ['missing.json', './out', '', '', '', '', ''];
    jest.spyOn(cli as unknown as { askQuestion: () => Promise<string> }, 'askQuestion').mockImplementation(async () => answers.shift() || '');
    jest.spyOn(cli, 'askYesNo').mockImplementation(async (_rl, _question, defaultValue = true) => defaultValue);
    await cli.runInteractiveMode();
    expect(process.exitCode).toBe(1);
  });

  it('discovers JSON configuration and validate accepts the same config', async () => {
    await fs.writeFile('schemantic.config.json', JSON.stringify({ schemaFile: './schema.json', outputDir: './out' }));
    await invoke(['generate']);
    expect(process.exitCode).toBeUndefined();
    expect(await fs.readFile('out/types.ts', 'utf8')).toContain('Item');
    await invoke(['validate', '--config']);
    expect(process.exitCode).toBeUndefined();
  });

  it('anchors file/output paths to configuration and explicit overrides to cwd', async () => {
    await fs.mkdir('config');
    await fs.writeFile('config/schema.json', JSON.stringify(schema));
    await fs.writeFile('config/schemantic.config.cjs', 'module.exports = { schemaFile: "./schema.json", outputDir: "./generated" };');
    const loaded = await internals().loadConfiguration(undefined, { config: './config/schemantic.config.cjs' });
    expect(loaded.schemaFile).toBe(path.join(directory, 'config/schema.json'));
    expect(loaded.outputDir).toBe(path.join(directory, 'config/generated'));
    const overridden = await internals().loadConfiguration('./schema.json', { config: './config/schemantic.config.cjs', output: './other' });
    expect(overridden.schemaFile).toBe('./schema.json');
    expect(overridden.outputDir).toBe('./other');
  });

  it.each([{ generateTypes: 'false' }, { surprise: true }, { generateQueries: true }])('rejects invalid configuration %j', async invalid => {
    await fs.writeFile('schemantic.config.json', JSON.stringify({ schemaFile: './schema.json', ...invalid }));
    await invoke(['generate']);
    expect(process.exitCode).toBe(1);
    await expect(fs.access('src/generated')).rejects.toThrow();
  });

  it('prints effective configuration only when verbose is selected', async () => {
    await invoke(['generate', 'schema.json', '--output', './out', '--verbose']);
    expect(console.log).toHaveBeenCalledWith('Effective configuration:', expect.stringContaining('schema.json'));
    expect(process.exitCode).toBeUndefined();
  });

  it('loads a local plugin in the same generation invocation', async () => {
    await fs.writeFile('plugin.cjs', 'module.exports = { name: "local-plugin", version: "1", description: "fixture", afterTypeGeneration(name, generatedType) { generatedType.content = "/** Local plugin ran */\\n" + generatedType.content; } };');
    await invoke(['generate', 'schema.json', '--plugins', './plugin.cjs', '--output', './out']);
    expect(process.exitCode).toBeUndefined();
    expect(await fs.readFile('out/types.ts', 'utf8')).toContain('Local plugin ran');
  });

  it('resolves package plugins from the consumer directory', async () => {
    const pluginDir = path.join(directory, 'node_modules', 'consumer-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(path.join(pluginDir, 'package.json'), JSON.stringify({ name: 'consumer-plugin', main: 'index.cjs' }));
    await fs.writeFile(path.join(pluginDir, 'index.cjs'), 'module.exports = { name: "package-plugin", version: "1", description: "fixture" };');
    expect((await new PluginLoader().loadPlugin('consumer-plugin')).name).toBe('package-plugin');
    await invoke(['generate', 'schema.json', '--plugins', 'consumer-plugin', '--output', './out']);
    expect(process.exitCode).toBeUndefined();
  });

  it('resolves configured local/package plugins beside a config outside cwd', async () => {
    const configDir = path.join(directory, 'config');
    const packageDir = path.join(configDir, 'node_modules', 'config-plugin');
    await fs.mkdir(packageDir, { recursive: true });
    await fs.writeFile(path.join(configDir, 'schema.json'), JSON.stringify(schema));
    await fs.writeFile(path.join(configDir, 'local.cjs'), 'module.exports = { name: "configured-local", version: "1", description: "fixture", afterTypeGeneration(name, type) { type.content = "/** config local */\\n" + type.content; } };');
    await fs.writeFile(path.join(packageDir, 'package.json'), JSON.stringify({ name: 'config-plugin', main: 'index.cjs' }));
    await fs.writeFile(path.join(packageDir, 'index.cjs'), 'module.exports = { name: "configured-package", version: "1", description: "fixture", afterTypeGeneration(name, type) { type.content = "/** config package */\\n" + type.content; } };');
    await fs.writeFile(path.join(configDir, 'schemantic.config.json'), JSON.stringify({
      schemaFile: './schema.json', outputDir: './generated', plugins: [
        { name: './local.cjs', enabled: true }, { name: 'config-plugin', enabled: true },
      ],
    }));
    await invoke(['generate', '--config', './config/schemantic.config.json']);
    expect(process.exitCode).toBeUndefined();
    const output = await fs.readFile(path.join(configDir, 'generated/types.ts'), 'utf8');
    expect(output).toContain('config local');
    expect(output).toContain('config package');
  });

  it('rejects invalid plugin hooks before invoking generation', async () => {
    await fs.writeFile('invalid.cjs', 'module.exports = { name: "invalid", version: "1", description: "fixture", beforeGeneration: true };');
    await invoke(['generate', 'schema.json', '--plugins', './invalid.cjs', '--output', './out']);
    expect(process.exitCode).toBe(1);
    await expect(fs.access('out')).rejects.toThrow();
  });

  it('compiles every documented TypeScript example against freshly generated output', async () => {
    const exampleSchema: OpenAPISchema = {
      openapi: '3.0.3', info: { title: 'Users API', version: '1' },
      paths: {
        '/users/{user_id}': {
          get: {
            operationId: 'getUser',
            parameters: [{ name: 'user_id', in: 'path', required: true, schema: { type: 'integer' } }],
            responses: { '200': { description: 'User', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
          },
        },
        '/users': {
          post: {
            operationId: 'createUser',
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            responses: { '200': { description: 'User', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
          },
        },
      },
      components: { schemas: { User: { type: 'object', required: ['id', 'display_name'], properties: { id: { type: 'integer' }, display_name: { type: 'string' } } } } },
    };
    const result = await new Schemantic({ schemaData: exampleSchema, outputDir: path.join(directory, 'generated'), generateHooks: true }).generate();
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    const sources: string[] = [];
    for (const name of ['README.md', 'docs/API.md', 'docs/CONFIGURATION.md', 'docs/FASTAPI_TUTORIAL.md', 'docs/PLUGINS.md', 'docs/PLUGIN_DEVELOPMENT.md', 'docs/ADVANCED_PLUGIN_DEVELOPMENT.md', 'docs/ADVANCED_PLUGINS_IMPLEMENTATION.md']) {
      const markdown = await fs.readFile(path.join(originalCwd, name), 'utf8');
      let index = 0;
      for (const match of markdown.matchAll(/```(ts|tsx|typescript)\r?\n([\s\S]*?)```/g)) {
        const file = path.join(directory, `${path.basename(name, '.md')}-${index++}.${match[1] === 'tsx' ? 'tsx' : 'ts'}`);
        await fs.writeFile(file, `${match[2]}\nexport {};\n`);
        sources.push(file);
      }
    }
    const pluginFile = path.join(directory, 'plugin.ts');
    await fs.writeFile(pluginFile, 'import type { SchemanticPlugin } from "schemantic"; export const plugin: SchemanticPlugin = { name: "example", version: "1", description: "fixture" };');
    const reactFile = path.join(directory, 'react.d.ts');
    await fs.writeFile(reactFile, `declare module 'react' {
      export function useState<T>(initial: T): [T, (value: T | ((previous: T) => T)) => void];
      export function useRef<T>(initial: T): { current: T };
      export function useCallback<T extends (...args: never[]) => unknown>(callback: T, dependencies: readonly unknown[]): T;
      export function useEffect(effect: () => void | (() => void), dependencies: readonly unknown[]): void;
      export function useMemo<T>(factory: () => T, dependencies: readonly unknown[]): T;
    }
    declare module 'react/jsx-runtime' { export const jsx: unknown; export const jsxs: unknown; export namespace JSX { interface IntrinsicElements { p: { children?: unknown }; button: { children?: unknown; onClick?: () => void }; } } }
    `);
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, noUnusedLocals: true, noUnusedParameters: true,
      exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, skipLibCheck: true,
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true, types: ['node'], typeRoots: [path.join(originalCwd, 'node_modules/@types')],
      baseUrl: originalCwd, paths: { schemantic: ['src/index.ts'], zod: ['node_modules/zod/index.d.ts'] },
      lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
    };
    const program = ts.createProgram([...sources, pluginFile, reactFile], options);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: file => file, getCurrentDirectory: () => originalCwd, getNewLine: () => '\n',
    })).toBe('');
  });
});
