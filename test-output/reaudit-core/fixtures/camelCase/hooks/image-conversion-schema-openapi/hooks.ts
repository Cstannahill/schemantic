import type { HealthResponse, BodyConvertImageConvertPostBinary, BodyBatchConvertImagesConvertBatchPostBinary, HTTPValidationError } from './types.js';
import type { ImageManipulationApiClient, ApiClientError } from "./api-client.js";
import { useCallback, useEffect, useRef, useState } from 'react';
export function createApiHooks(client: ImageManipulationApiClient) {
  function useHealthCheckHealthGetQuery(requestInit?: RequestInit) {
    const [data, setData] = useState<HealthResponse | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const requestInitRef = useRef(requestInit); requestInitRef.current = requestInit;
    const requestId = useRef(0);
    const normalizedHeaders: Record<string, string> = {}; new Headers(requestInit?.headers).forEach((value, key) => { normalizedHeaders[key] = value; });
    const requestKey = JSON.stringify([null, { ...requestInit, headers: normalizedHeaders }]);
    const fetcher = useCallback(async () => {
      const id = ++requestId.current;
      setLoading(true); setError(undefined);
      try {
        const result = await client.healthCheckHealthGet(requestInitRef.current);
        if (id === requestId.current) setData(result);
      } catch (e) { if (id === requestId.current) setError(e as ApiClientError); } finally { if (id === requestId.current) setLoading(false); }
    }, [client, requestKey, requestInit?.signal]);
    useEffect(() => { void fetcher(); return () => { requestId.current++; }; }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  function useConvertImageConvertPostMutation() {
    const [data, setData] = useState<unknown | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const requestId = useRef(0); const mounted = useRef(true); const activeClient = useRef(client);
    useEffect(() => { mounted.current = true; if (activeClient.current !== client) { activeClient.current = client; setData(undefined); setError(undefined); setLoading(false); } return () => { mounted.current = false; requestId.current++; }; }, [client]);
    const mutate = useCallback(async (payload: { body: BodyConvertImageConvertPostBinary | FormData }, requestInit?: RequestInit) => {
      const id = ++requestId.current;
      if (mounted.current) { setLoading(true); setError(undefined); }
      try {
        const result = await client.convertImageConvertPost(payload.body, requestInit);
        if (mounted.current && id === requestId.current) setData(result);
        return result;
      } catch (e) { if (mounted.current && id === requestId.current) setError(e as ApiClientError); throw e; } finally { if (mounted.current && id === requestId.current) setLoading(false); }
    }, [client]);
    const reset = useCallback(() => { requestId.current++; if (mounted.current) { setData(undefined); setError(undefined); setLoading(false); } }, []);
    return { mutate, data, error, loading, reset };
  }
  function useBatchConvertImagesConvertBatchPostMutation() {
    const [data, setData] = useState<unknown | globalThis.Blob | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const requestId = useRef(0); const mounted = useRef(true); const activeClient = useRef(client);
    useEffect(() => { mounted.current = true; if (activeClient.current !== client) { activeClient.current = client; setData(undefined); setError(undefined); setLoading(false); } return () => { mounted.current = false; requestId.current++; }; }, [client]);
    const mutate = useCallback(async (payload: { body: BodyBatchConvertImagesConvertBatchPostBinary | FormData }, requestInit?: RequestInit) => {
      const id = ++requestId.current;
      if (mounted.current) { setLoading(true); setError(undefined); }
      try {
        const result = await client.batchConvertImagesConvertBatchPost(payload.body, requestInit);
        if (mounted.current && id === requestId.current) setData(result);
        return result;
      } catch (e) { if (mounted.current && id === requestId.current) setError(e as ApiClientError); throw e; } finally { if (mounted.current && id === requestId.current) setLoading(false); }
    }, [client]);
    const reset = useCallback(() => { requestId.current++; if (mounted.current) { setData(undefined); setError(undefined); setLoading(false); } }, []);
    return { mutate, data, error, loading, reset };
  }
  function useListFormatsConvertFormatsGetQuery(requestInit?: RequestInit) {
    const [data, setData] = useState<Record<string, unknown> | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const requestInitRef = useRef(requestInit); requestInitRef.current = requestInit;
    const requestId = useRef(0);
    const normalizedHeaders: Record<string, string> = {}; new Headers(requestInit?.headers).forEach((value, key) => { normalizedHeaders[key] = value; });
    const requestKey = JSON.stringify([null, { ...requestInit, headers: normalizedHeaders }]);
    const fetcher = useCallback(async () => {
      const id = ++requestId.current;
      setLoading(true); setError(undefined);
      try {
        const result = await client.listFormatsConvertFormatsGet(requestInitRef.current);
        if (id === requestId.current) setData(result);
      } catch (e) { if (id === requestId.current) setError(e as ApiClientError); } finally { if (id === requestId.current) setLoading(false); }
    }, [client, requestKey, requestInit?.signal]);
    useEffect(() => { void fetcher(); return () => { requestId.current++; }; }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  function useRootGetQuery(requestInit?: RequestInit) {
    const [data, setData] = useState<unknown | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const requestInitRef = useRef(requestInit); requestInitRef.current = requestInit;
    const requestId = useRef(0);
    const normalizedHeaders: Record<string, string> = {}; new Headers(requestInit?.headers).forEach((value, key) => { normalizedHeaders[key] = value; });
    const requestKey = JSON.stringify([null, { ...requestInit, headers: normalizedHeaders }]);
    const fetcher = useCallback(async () => {
      const id = ++requestId.current;
      setLoading(true); setError(undefined);
      try {
        const result = await client.rootGet(requestInitRef.current);
        if (id === requestId.current) setData(result);
      } catch (e) { if (id === requestId.current) setError(e as ApiClientError); } finally { if (id === requestId.current) setLoading(false); }
    }, [client, requestKey, requestInit?.signal]);
    useEffect(() => { void fetcher(); return () => { requestId.current++; }; }, [fetcher]);
    const refetch = useCallback(fetcher, [fetcher]);
    return { data, error, loading, refetch };
  }
  return { useHealthCheckHealthGetQuery, useConvertImageConvertPostMutation, useBatchConvertImagesConvertBatchPostMutation, useListFormatsConvertFormatsGetQuery, useRootGetQuery };
}
