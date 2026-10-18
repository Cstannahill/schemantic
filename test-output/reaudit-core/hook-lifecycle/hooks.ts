import type { User } from './types.js';
import type { AuditApiClient, ApiClientError } from "./api-client.js";
import { useCallback, useEffect, useRef, useState } from 'react';
export function createApiHooks(client: AuditApiClient) {
  function useGetUserQuery(args: { path: { id: string } }, requestInit?: RequestInit) {
    const [data, setData] = useState<User | undefined>(undefined);
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
        const result = await client.getUser(argsRef.current!.path["id"], requestInitRef.current);
        if (id === requestId.current) setData(result);
      } catch (e) { if (id === requestId.current) setError(e as ApiClientError); } finally { if (id === requestId.current) setLoading(false); }
    }, [client, requestKey, requestInit?.signal]);
    useEffect(() => { void fetcher(); return () => { requestId.current++; }; }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  function useUpdateUserMutation() {
    const [data, setData] = useState<string | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const requestId = useRef(0); const mounted = useRef(true); const activeClient = useRef(client);
    useEffect(() => { mounted.current = true; if (activeClient.current !== client) { activeClient.current = client; setData(undefined); setError(undefined); setLoading(false); } return () => { mounted.current = false; requestId.current++; }; }, [client]);
    const mutate = useCallback(async (payload: { body: User }, requestInit?: RequestInit) => {
      const id = ++requestId.current;
      if (mounted.current) { setLoading(true); setError(undefined); }
      try {
        const result = await client.updateUser(payload.body, requestInit);
        if (mounted.current && id === requestId.current) setData(result);
        return result;
      } catch (e) { if (mounted.current && id === requestId.current) setError(e as ApiClientError); throw e; } finally { if (mounted.current && id === requestId.current) setLoading(false); }
    }, [client]);
    const reset = useCallback(() => { requestId.current++; if (mounted.current) { setData(undefined); setError(undefined); setLoading(false); } }, []);
    return { mutate, data, error, loading, reset };
  }
  return { useGetUserQuery, useUpdateUserMutation };
}
