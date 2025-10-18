import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TestApiClient } from './api-client';

export function createApiHooks(client: TestApiClient) {
  function useSearchItemsQuery(args: { query: { q?: string; category: string } }, requestInit?: RequestInit) {
    const [data, setData] = useState<unknown[] | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => { argsRef.current = args; }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true); setError(undefined);
      try {
        const result = await client.searchItems(args!.query.category, args!.query.q, requestInit);
        setData(result as unknown[]);
      } catch (e) { setError(e); } finally { setLoading(false); }
    }, [client, args, requestInit]);
    useEffect(() => { void fetcher(); }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  return { useSearchItemsQuery };
}
