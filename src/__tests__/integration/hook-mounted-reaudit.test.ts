import * as React from 'react';
import { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import * as ts from 'typescript';
import { HookGenerator } from '../../generators/hook-generator';
import { createTestConfig } from '../test-config';
import type { GenerationContext } from '../../types/core';
import type { OpenAPISchema } from '../../types/openapi';

interface QueryState {
  data: string | undefined; error: Error | undefined; loading: boolean; refetch(): Promise<void>;
}
interface MutationState {
  data: string | undefined; error: Error | undefined; loading: boolean;
  mutate(payload: { body: string }, requestInit?: RequestInit): Promise<string>; reset(): void;
}
interface Client {
  getUser(id: string, requestInit?: RequestInit): Promise<string>;
  saveUser(body: string, requestInit?: RequestInit): Promise<string>;
}
interface HookApi {
  useGetUserQuery(args: { path: { id: string } }, requestInit?: RequestInit): QueryState;
  useSaveUserMutation(): MutationState;
}
interface Deferred<T> { promise: Promise<T>; resolve(value: T): void; reject(error: Error): void; }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

function generatedFactory(): (client: Client) => HookApi {
  const response = { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'string' as const } } } } };
  const schema: OpenAPISchema = {
    openapi: '3.1.0', info: { title: 'Mounted', version: '1' },
    paths: {
      '/users/{id}': { get: { operationId: 'getUser', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: response } },
      '/users': { post: { operationId: 'saveUser', requestBody: { required: true, content: { 'application/json': { schema: { type: 'string' } } } }, responses: response } },
    },
  };
  const context: GenerationContext = {
    config: createTestConfig({ schemaData: schema, generateHooks: true }), schema,
    resolvedSchemas: new Map(), generatedTypes: new Map(), generatedClients: new Map(), schemaResolver: () => undefined,
    typeRegistry: { registerType: () => undefined, getType: () => undefined, getAllTypes: () => [], getDependencies: () => [], resolveDependencies: () => [] },
  };
  const output = ts.transpileModule(new HookGenerator(context).generate().content, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true,
  });
  expect(output.diagnostics).toEqual([]);
  const exports: { createApiHooks?: (client: Client) => HookApi } = {};
  new Function('exports', 'require', output.outputText)(exports, (name: string) => {
    if (name === 'react') return React;
    throw new Error(`Unexpected generated runtime import: ${name}`);
  });
  return exports.createApiHooks!;
}

describe('generated hooks mounted in real React', () => {
  const actGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  let previousActEnvironment: boolean | undefined;
  let factory: (client: Client) => HookApi;
  let renderers: ReactTestRenderer[];

  beforeAll(() => {
    previousActEnvironment = actGlobal.IS_REACT_ACT_ENVIRONMENT;
    actGlobal.IS_REACT_ACT_ENVIRONMENT = true;
    factory = generatedFactory();
  });
  beforeEach(() => { renderers = []; });
  afterEach(async () => { await act(async () => { for (const renderer of renderers) renderer.unmount(); }); });
  afterAll(() => {
    if (previousActEnvironment === undefined) delete actGlobal.IS_REACT_ACT_ENVIRONMENT;
    else actGlobal.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  async function mountMutation(client: Client, strict = true) {
    let latest!: MutationState;
    let renders = 0;
    function Probe(props: { client: Client }) {
      latest = factory(props.client).useSaveUserMutation();
      renders++;
      return React.createElement('span', null, latest.data);
    }
    const element = (activeClient: Client) => strict
      ? React.createElement(React.StrictMode, null, React.createElement(Probe, { client: activeClient }))
      : React.createElement(Probe, { client: activeClient });
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(element(client)); });
    renderers.push(renderer);
    return {
      state: () => latest, renderCount: () => renders,
      update: async (nextClient: Client) => { await act(async () => { renderer.update(element(nextClient)); }); },
      unmount: async () => { await act(async () => { renderer.unmount(); }); },
    };
  }
  const clientWithMutation = (saveUser: Client['saveUser']): Client => ({ saveUser, getUser: async id => id });

  it.each([false, true])('keeps latest mutation state with reverse completion (StrictMode=%s)', async strict => {
    const older = deferred<string>(); const newer = deferred<string>();
    const saveUser = jest.fn((body: string) => body === 'old' ? older.promise : newer.promise);
    const probe = await mountMutation(clientWithMutation(saveUser), strict);
    let oldResult!: Promise<string>; let newResult!: Promise<string>;
    await act(async () => { oldResult = probe.state().mutate({ body: 'old' }); newResult = probe.state().mutate({ body: 'new' }); });
    expect(probe.state().loading).toBe(true);
    await act(async () => { newer.resolve('new result'); await newResult; });
    expect(probe.state().data).toBe('new result');
    expect(probe.state().loading).toBe(false);
    await act(async () => { older.resolve('old result'); expect(await oldResult).toBe('old result'); });
    expect(probe.state().data).toBe('new result');
    expect(saveUser).toHaveBeenCalledTimes(2);
  });

  it('keeps loading while the newest mutation is pending after the older one completes', async () => {
    const older = deferred<string>(); const newer = deferred<string>();
    const probe = await mountMutation(clientWithMutation(body => body === 'old' ? older.promise : newer.promise));
    let oldResult!: Promise<string>; let newResult!: Promise<string>;
    await act(async () => { oldResult = probe.state().mutate({ body: 'old' }); newResult = probe.state().mutate({ body: 'new' }); });
    await act(async () => { older.resolve('old'); await oldResult; });
    expect(probe.state().loading).toBe(true);
    expect(probe.state().data).toBeUndefined();
    await act(async () => { newer.resolve('new'); await newResult; });
    expect(probe.state().loading).toBe(false);
    expect(probe.state().data).toBe('new');
  });

  it('preserves the latest failure against an older success', async () => {
    const older = deferred<string>(); const newer = deferred<string>();
    const probe = await mountMutation(clientWithMutation(body => body === 'old' ? older.promise : newer.promise));
    let oldResult!: Promise<string | Error>; let newResult!: Promise<string | Error>;
    await act(async () => {
      oldResult = probe.state().mutate({ body: 'old' }).catch((error: Error) => error);
      newResult = probe.state().mutate({ body: 'new' }).catch((error: Error) => error);
    });
    const latestError = new Error('latest failure');
    await act(async () => { newer.reject(latestError); expect(await newResult).toBe(latestError); });
    await act(async () => { older.resolve('old success'); await oldResult; });
    expect(probe.state().error).toBe(latestError);
    expect(probe.state().data).toBeUndefined();
    expect(probe.state().loading).toBe(false);
  });

  it('suppresses an older failure after a newer mutation succeeds', async () => {
    const older = deferred<string>(); const newer = deferred<string>();
    const probe = await mountMutation(clientWithMutation(body => body === 'old' ? older.promise : newer.promise));
    let oldResult!: Promise<string | Error>; let newResult!: Promise<string>;
    await act(async () => {
      oldResult = probe.state().mutate({ body: 'old' }).catch((error: Error) => error);
      newResult = probe.state().mutate({ body: 'new' });
    });
    await act(async () => { newer.resolve('new success'); await newResult; });
    const oldError = new Error('old failure');
    await act(async () => { older.reject(oldError); expect(await oldResult).toBe(oldError); });
    expect(probe.state().data).toBe('new success');
    expect(probe.state().error).toBeUndefined();
    expect(probe.state().loading).toBe(false);
  });

  it.each(['success', 'failure'])('reset invalidates a pending %s without changing its caller promise', async outcome => {
    const pending = deferred<string>();
    const probe = await mountMutation(clientWithMutation(() => pending.promise));
    let result!: Promise<string | Error>;
    await act(async () => { result = probe.state().mutate({ body: 'pending' }).catch((error: Error) => error); });
    await act(async () => { probe.state().reset(); });
    expect(probe.state().loading).toBe(false);
    const error = new Error('pending failed');
    await act(async () => {
      if (outcome === 'success') pending.resolve('pending success'); else pending.reject(error);
      expect(await result).toBe(outcome === 'success' ? 'pending success' : error);
    });
    expect(probe.state().data).toBeUndefined();
    expect(probe.state().error).toBeUndefined();
    expect(probe.state().loading).toBe(false);
  });

  it('invalidates work and clears pending state when the client changes', async () => {
    const pending = deferred<string>();
    const probe = await mountMutation(clientWithMutation(() => pending.promise));
    let result!: Promise<string>;
    await act(async () => { result = probe.state().mutate({ body: 'old client' }); });
    await probe.update(clientWithMutation(async () => 'new client'));
    expect(probe.state().loading).toBe(false);
    await act(async () => { pending.resolve('old client'); await result; });
    expect(probe.state().data).toBeUndefined();
    await act(async () => { expect(await probe.state().mutate({ body: 'new' })).toBe('new client'); });
    expect(probe.state().data).toBe('new client');
  });

  it('does not render stale mutation completion after unmount and remount', async () => {
    const pending = deferred<string>();
    const probe = await mountMutation(clientWithMutation(() => pending.promise));
    let result!: Promise<string>;
    await act(async () => { result = probe.state().mutate({ body: 'old mount' }); });
    await probe.unmount();
    const renderCount = probe.renderCount();
    const remounted = await mountMutation(clientWithMutation(async () => 'new mount'));
    await act(async () => { pending.resolve('old mount'); await result; });
    expect(probe.renderCount()).toBe(renderCount);
    expect(remounted.state().data).toBeUndefined();
    await act(async () => { await remounted.state().mutate({ body: 'new mount' }); });
    expect(remounted.state().data).toBe('new mount');
  });

  it('runs StrictMode effect cleanup and keeps only the current query result', async () => {
    const requests: Array<{ id: string; result: Deferred<string> }> = [];
    const client: Client = {
      getUser: id => { const result = deferred<string>(); requests.push({ id, result }); return result.promise; },
      saveUser: async body => body,
    };
    let latest!: QueryState;
    function Probe(props: { id: string }) {
      latest = factory(client).useGetUserQuery({ path: { id: props.id } }, { headers: { 'X-Test': 'same' } });
      return React.createElement('span', null, latest.data);
    }
    const element = (id: string) => React.createElement(React.StrictMode, null, React.createElement(Probe, { id }));
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(element('old')); });
    renderers.push(renderer);
    expect(requests).toHaveLength(2); // Real StrictMode setup -> cleanup -> setup.
    await act(async () => { renderer.update(element('new')); });
    expect(requests).toHaveLength(3);
    await act(async () => { requests[2]!.result.resolve('new result'); });
    expect(latest.data).toBe('new result');
    await act(async () => { requests[0]!.result.resolve('stale strict effect'); requests[1]!.result.resolve('stale argument'); });
    expect(latest.data).toBe('new result');
    expect(latest.loading).toBe(false);
    expect(requests).toHaveLength(3); // Inline equal args/headers do not create a render loop.
  });

  it('invalidates queries across client changes and does not render a completion after unmount', async () => {
    const older: Deferred<string>[] = [];
    const current = deferred<string>();
    const oldClient: Client = {
      getUser: () => { const request = deferred<string>(); older.push(request); return request.promise; },
      saveUser: async body => body,
    };
    const newClient: Client = { getUser: () => current.promise, saveUser: async body => body };
    let latest!: QueryState;
    let renders = 0;
    function Probe(props: { client: Client }) {
      latest = factory(props.client).useGetUserQuery({ path: { id: 'same' } });
      renders++;
      return React.createElement('span', null, latest.data);
    }
    const element = (client: Client) => React.createElement(React.StrictMode, null, React.createElement(Probe, { client }));
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(element(oldClient)); });
    renderers.push(renderer);
    expect(older).toHaveLength(2);
    await act(async () => { renderer.update(element(newClient)); });
    await act(async () => { for (const request of older) request.resolve('old client'); });
    expect(latest.data).toBeUndefined();
    expect(latest.loading).toBe(true);
    await act(async () => { renderer.unmount(); });
    const beforeCompletion = renders;
    await act(async () => { current.resolve('unmounted result'); });
    expect(renders).toBe(beforeCompletion);
  });
});
