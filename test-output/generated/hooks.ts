import { HealthResponse, BodyConvertImageConvertPost, HTTPValidationError, BodyBatchConvertImagesConvertBatchPost } from './types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageManipulationApiClient, ApiClientError } from './api-client';

export function createApiHooks(client: ImageManipulationApiClient) {
  function useHealthCheckHealthGetQuery(requestInit?: RequestInit) {
    const [data, setData] = useState<HealthResponse | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const fetcher = useCallback(async () => {
      setLoading(true); setError(undefined);
      try {
        const result = await client.healthCheckHealthGet(requestInit);
        setData(result);
      } catch (e) { setError(e as ApiClientError); } finally { setLoading(false); }
    }, [client, requestInit]);
    useEffect(() => { void fetcher(); }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  function useConvertImageConvertPostMutation() {
    const [data, setData] = useState<unknown | void | void | void | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (payload: { body: BodyConvertImageConvertPost }, requestInit?: RequestInit) => {
      setLoading(true); setError(undefined);
      try {
        const result = await client.convertImageConvertPost(payload.body, requestInit);
        setData(result);
        return result;
      } catch (e) { setError(e as ApiClientError); throw e; } finally { setLoading(false); }
    }, [client]);
    const reset = useCallback(() => { setData(undefined); setError(undefined); setLoading(false); }, []);
    return { mutate, data, error, loading, reset };
  }
  function useBatchConvertImagesConvertBatchPostMutation() {
    const [data, setData] = useState<unknown | void | void | HTTPValidationError | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (payload: { body: BodyBatchConvertImagesConvertBatchPost }, requestInit?: RequestInit) => {
      setLoading(true); setError(undefined);
      try {
        const result = await client.batchConvertImagesConvertBatchPost(payload.body, requestInit);
        setData(result);
        return result;
      } catch (e) { setError(e as ApiClientError); throw e; } finally { setLoading(false); }
    }, [client]);
    const reset = useCallback(() => { setData(undefined); setError(undefined); setLoading(false); }, []);
    return { mutate, data, error, loading, reset };
  }
  function useListFormatsConvertFormatsGetQuery(requestInit?: RequestInit) {
    const [data, setData] = useState<Record<string, unknown> | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const fetcher = useCallback(async () => {
      setLoading(true); setError(undefined);
      try {
        const result = await client.listFormatsConvertFormatsGet(requestInit);
        setData(result);
      } catch (e) { setError(e as ApiClientError); } finally { setLoading(false); }
    }, [client, requestInit]);
    useEffect(() => { void fetcher(); }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  function useRootGetQuery(requestInit?: RequestInit) {
    const [data, setData] = useState<unknown | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const fetcher = useCallback(async () => {
      setLoading(true); setError(undefined);
      try {
        const result = await client.rootGet(requestInit);
        setData(result);
      } catch (e) { setError(e as ApiClientError); } finally { setLoading(false); }
    }, [client, requestInit]);
    useEffect(() => { void fetcher(); }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  return { useHealthCheckHealthGetQuery, useConvertImageConvertPostMutation, useBatchConvertImagesConvertBatchPostMutation, useListFormatsConvertFormatsGetQuery, useRootGetQuery };
}
