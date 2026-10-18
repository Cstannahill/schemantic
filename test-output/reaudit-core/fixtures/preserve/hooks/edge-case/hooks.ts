import type { UserResponse, CreateItemRequest, Item } from './types.js';
import type { SampleApiClient, ApiClientError } from "./api-client.js";
import { useCallback, useEffect, useRef, useState } from 'react';
export function createApiHooks(client: SampleApiClient) {
  function useGetUserQuery(args: { path: { user_id: number }; query?: { verbose?: boolean } }, requestInit?: RequestInit) {
    const [data, setData] = useState<UserResponse | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args); argsRef.current = args;
    const requestInitRef = useRef(requestInit); requestInitRef.current = requestInit;
    const requestId = useRef(0);
    const normalizedHeaders: Record<string, string> = {}; new Headers(requestInit?.headers).forEach((value, key) => { normalizedHeaders[key] = value; });
    const requestKey = JSON.stringify([args, { ...requestInit, headers: normalizedHeaders }]);
    const fetcher = useCallback(async () => {
      const id = ++requestId.current;
      setLoading(true); setError(undefined);
      try {
        const result = await client.getUser(argsRef.current!.path["user_id"], argsRef.current?.query?.["verbose"], requestInitRef.current);
        if (id === requestId.current) setData(result);
      } catch (e) { if (id === requestId.current) setError(e as ApiClientError); } finally { if (id === requestId.current) setLoading(false); }
    }, [client, requestKey, requestInit?.signal]);
    useEffect(() => { void fetcher(); return () => { requestId.current++; }; }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  function useCreateItemMutation() {
    const [data, setData] = useState<Item | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const requestId = useRef(0); const mounted = useRef(true); const activeClient = useRef(client);
    useEffect(() => { mounted.current = true; if (activeClient.current !== client) { activeClient.current = client; setData(undefined); setError(undefined); setLoading(false); } return () => { mounted.current = false; requestId.current++; }; }, [client]);
    const mutate = useCallback(async (payload: { body?: CreateItemRequest }, requestInit?: RequestInit) => {
      const id = ++requestId.current;
      if (mounted.current) { setLoading(true); setError(undefined); }
      try {
        const result = await client.createItem(payload?.body, requestInit);
        if (mounted.current && id === requestId.current) setData(result);
        return result;
      } catch (e) { if (mounted.current && id === requestId.current) setError(e as ApiClientError); throw e; } finally { if (mounted.current && id === requestId.current) setLoading(false); }
    }, [client]);
    const reset = useCallback(() => { requestId.current++; if (mounted.current) { setData(undefined); setError(undefined); setLoading(false); } }, []);
    return { mutate, data, error, loading, reset };
  }
  return { useGetUserQuery, useCreateItemMutation };
}
