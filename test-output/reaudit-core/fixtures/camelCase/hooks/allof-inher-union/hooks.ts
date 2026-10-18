import type { PetResponse } from './types.js';
import type { InheritanceApiClient, ApiClientError } from "./api-client.js";
import { useCallback, useEffect, useRef, useState } from 'react';
export function createApiHooks(client: InheritanceApiClient) {
  function useGetPetQuery(args: { path: { pet_id: number } }, requestInit?: RequestInit) {
    const [data, setData] = useState<PetResponse | undefined>(undefined);
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
        const result = await client.getPet(argsRef.current!.path["pet_id"], requestInitRef.current);
        if (id === requestId.current) setData(result);
      } catch (e) { if (id === requestId.current) setError(e as ApiClientError); } finally { if (id === requestId.current) setLoading(false); }
    }, [client, requestKey, requestInit?.signal]);
    useEffect(() => { void fetcher(); return () => { requestId.current++; }; }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  return { useGetPetQuery };
}
