import * as ts from 'typescript';
import { HookGenerator } from '../../generators/hook-generator';
import { DEFAULT_CONFIG, GenerationContext, SchemanticConfig } from '../../types/core';
import { OpenAPISchema } from '../../types/openapi';

type Dependencies = readonly unknown[] | undefined;
type Effect = () => void | (() => void);
interface MemoSlot { dependencies: Dependencies; value: unknown; }
interface EffectSlot { dependencies: Dependencies; cleanup: (() => void) | undefined; }
interface QueryState {
  data: string | undefined;
  error: unknown;
  loading: boolean;
  refetch: () => Promise<void>;
}
type QueryHook = (args: { path: { id: string } }, options?: Record<string, unknown>) => QueryState;

/** Models React's slot persistence and Object.is dependency comparison without installing React. */
class HookHarness {
  private cursor = 0;
  private slots: unknown[] = [];
  private effects: (() => void)[] = [];
  dirty = false;

  private changed(previous: Dependencies, next: Dependencies): boolean {
    return !previous || !next || previous.length !== next.length ||
      previous.some((value, index) => !Object.is(value, next[index]));
  }

  readonly react = {
    useState: <T>(initial: T) => {
      const index = this.cursor++;
      if (!(index in this.slots)) this.slots[index] = initial;
      return [this.slots[index] as T, (value: T | ((old: T) => T)) => {
        const next = typeof value === 'function' ? (value as (old: T) => T)(this.slots[index] as T) : value;
        if (!Object.is(this.slots[index], next)) {
          this.slots[index] = next;
          this.dirty = true;
        }
      }] as const;
    },
    useRef: <T>(initial: T) => {
      const index = this.cursor++;
      if (!(index in this.slots)) this.slots[index] = { current: initial };
      return this.slots[index] as { current: T };
    },
    useMemo: <T>(factory: () => T, dependencies: Dependencies) => {
      const index = this.cursor++;
      const previous = this.slots[index] as MemoSlot | undefined;
      if (!previous || this.changed(previous.dependencies, dependencies)) {
        this.slots[index] = { dependencies, value: factory() };
      }
      return (this.slots[index] as MemoSlot).value as T;
    },
    useCallback: <T extends Function>(callback: T, dependencies: Dependencies): T =>
      this.react.useMemo(() => callback, dependencies),
    useEffect: (effect: Effect, dependencies: Dependencies) => {
      const index = this.cursor++;
      const previous = this.slots[index] as EffectSlot | undefined;
      if (!previous || this.changed(previous.dependencies, dependencies)) {
        const slot: EffectSlot = { dependencies, cleanup: previous?.cleanup };
        this.slots[index] = slot;
        this.effects.push(() => {
          slot.cleanup?.();
          const cleanup = effect();
          slot.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
        });
      }
    },
  };

  render(hook: QueryHook, id: string, options?: Record<string, unknown>): QueryState {
    return this.renderHook(() => hook({ path: { id } }, options));
  }

  renderHook<T>(hook: () => T): T {
    this.cursor = 0;
    this.dirty = false;
    const state = hook();
    const effects = this.effects;
    this.effects = [];
    for (const effect of effects) effect();
    return state;
  }

  unmount(): void {
    for (const slot of this.slots) (slot as EffectSlot | undefined)?.cleanup?.();
    this.dirty = false;
  }
}

function createQuery(harness: HookHarness, getUser: (id: string, options?: unknown) => Promise<string>): QueryHook {
  const schema: OpenAPISchema = {
    openapi: '3.1.0', info: { title: 'Runtime API', version: '1' },
    paths: { '/users/{id}': { get: {
      operationId: 'getUser',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'string' } } } } },
    } } },
  };
  const context: GenerationContext = {
    config: { ...DEFAULT_CONFIG, outputDir: '.', schemaData: schema } as SchemanticConfig,
    schema, resolvedSchemas: new Map(), generatedTypes: new Map(), generatedClients: new Map(),
    schemaResolver: () => undefined,
    typeRegistry: {
      registerType: () => undefined, getType: () => undefined, getAllTypes: () => [],
      getDependencies: () => [], resolveDependencies: () => [],
    },
  };
  const generated = new HookGenerator(context).generate();
  const compiled = ts.transpileModule(generated.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  expect(compiled.diagnostics).toEqual([]);
  const exports: { createApiHooks?: (client: unknown) => { useGetUserQuery: QueryHook } } = {};
  const load = (name: string): unknown => {
    if (name === 'react') return harness.react;
    if (name === './api-client') return { RuntimeApiClient: class {}, ApiClientError: class extends Error {} };
    throw new Error(`Unexpected generated import: ${name}`);
  };
  new Function('exports', 'require', compiled.outputText)(exports, load);
  return exports.createApiHooks!({ getUser }).useGetUserQuery;
}

async function settle(): Promise<void> {
  for (let index = 0; index < 5; index++) await Promise.resolve();
}

describe('generated query hook runtime', () => {
  it.each([false, true])('does not refetch on state renders with equal inline args (inline RequestInit: %s)', async inlineOptions => {
    const harness = new HookHarness();
    const getUser = jest.fn(async (id: string) => id);
    const query = createQuery(harness, getUser);
    const render = () => harness.render(query, 'same', inlineOptions ? { headers: { 'X-Trace': 'same' } } : undefined);
    let state = render();
    await settle();
    // Bound the renders so a regression produces a failure instead of hanging the test runner.
    for (let index = 0; index < 10 && harness.dirty; index++) {
      state = render();
      await settle();
    }
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(state.data).toBe('same');
    expect(state.loading).toBe(false);
    expect(harness.dirty).toBe(false);
  });

  it('keeps the latest result when an older request completes after it', async () => {
    const harness = new HookHarness();
    const pending = new Map<string, (value: string) => void>();
    const getUser = jest.fn((id: string) => new Promise<string>(resolve => pending.set(id, resolve)));
    const query = createQuery(harness, getUser);
    harness.render(query, 'old');
    harness.render(query, 'new');
    expect(getUser).toHaveBeenCalledTimes(2);
    pending.get('new')!('new result');
    await settle();
    pending.get('old')!('old result');
    await settle();
    const state = harness.render(query, 'new');
    expect(state.data).toBe('new result');
    expect(state.loading).toBe(false);
    expect(getUser).toHaveBeenCalledTimes(2);
  });
});

interface MutationState {
  data: string | undefined; error: unknown; loading: boolean;
  mutate: (payload: { body: string }) => Promise<string>;
  reset: () => void;
}

function createMutation(harness: HookHarness, updateUser: (body: string) => Promise<string>): () => MutationState {
  const schema: OpenAPISchema = { openapi: '3.1.0', info: { title: 'Mutation', version: '1' }, paths: {
    '/users': { post: { operationId: 'updateUser', requestBody: { required: true, content: { 'application/json': { schema: { type: 'string' } } } },
      responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'string' } } } } } } },
  } };
  const context = { config: { ...DEFAULT_CONFIG, outputDir: '.' } as SchemanticConfig, schema, resolvedSchemas: new Map(), generatedTypes: new Map(), generatedClients: new Map(), schemaResolver: () => undefined,
    typeRegistry: { registerType: () => undefined, getType: () => undefined, getAllTypes: () => [], getDependencies: () => [], resolveDependencies: () => [] } };
  const compiled = ts.transpileModule(new HookGenerator(context).generate().content, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
  const exports: { createApiHooks?: (client: unknown) => { useUpdateUserMutation: () => MutationState } } = {};
  new Function('exports', 'require', compiled.outputText)(exports, (name: string) => name === 'react' ? harness.react : {});
  return exports.createApiHooks!({ updateUser }).useUpdateUserMutation;
}

describe('generated mutation lifecycle', () => {
  it('keeps newest result and loading when an older call completes first', async () => {
    const harness = new HookHarness(); const pending = new Map<string, (value: string) => void>();
    const mutation = createMutation(harness, value => new Promise(resolve => pending.set(value, resolve)));
    const state = harness.renderHook(mutation);
    const first = state.mutate({ body: 'first' }); const second = state.mutate({ body: 'second' });
    pending.get('first')!('old result'); await first;
    expect(harness.renderHook(mutation).loading).toBe(true);
    pending.get('second')!('new result'); await second;
    expect(harness.renderHook(mutation).data).toBe('new result');
  });

  it('does not overwrite newest data with a late older success', async () => {
    const harness = new HookHarness(); const pending = new Map<string, (value: string) => void>();
    const mutation = createMutation(harness, value => new Promise(resolve => pending.set(value, resolve)));
    const state = harness.renderHook(mutation);
    const first = state.mutate({ body: 'first' }); const second = state.mutate({ body: 'second' });
    pending.get('second')!('new'); expect(await second).toBe('new');
    pending.get('first')!('old'); expect(await first).toBe('old');
    expect(harness.renderHook(mutation).data).toBe('new');
  });

  it.each(['reset', 'unmount'])('suppresses completion after %s', async action => {
    const harness = new HookHarness(); let resolveRequest!: (value: string) => void;
    const mutation = createMutation(harness, () => new Promise(resolve => { resolveRequest = resolve; }));
    const state = harness.renderHook(mutation); const pending = state.mutate({ body: 'pending' });
    if (action === 'reset') { state.reset(); harness.renderHook(mutation); } else harness.unmount();
    resolveRequest('late'); expect(await pending).toBe('late');
    expect(harness.dirty).toBe(false);
    if (action === 'reset') expect(harness.renderHook(mutation).data).toBeUndefined();
  });
});
