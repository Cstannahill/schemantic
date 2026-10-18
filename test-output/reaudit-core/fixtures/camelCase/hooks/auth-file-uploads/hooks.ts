import type { LoginRequest, LoginResponse, FileUploadResponse } from './types.js';
import type { AuthUploadApiClient, ApiClientError } from "./api-client.js";
import { useCallback, useEffect, useRef, useState } from 'react';
export function createApiHooks(client: AuthUploadApiClient) {
  function useCreateLoginMutation() {
    const [data, setData] = useState<LoginResponse | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const requestId = useRef(0); const mounted = useRef(true); const activeClient = useRef(client);
    useEffect(() => { mounted.current = true; if (activeClient.current !== client) { activeClient.current = client; setData(undefined); setError(undefined); setLoading(false); } return () => { mounted.current = false; requestId.current++; }; }, [client]);
    const mutate = useCallback(async (payload: { body?: LoginRequest }, requestInit?: RequestInit) => {
      const id = ++requestId.current;
      if (mounted.current) { setLoading(true); setError(undefined); }
      try {
        const result = await client.createLogin(payload?.body, requestInit);
        if (mounted.current && id === requestId.current) setData(result);
        return result;
      } catch (e) { if (mounted.current && id === requestId.current) setError(e as ApiClientError); throw e; } finally { if (mounted.current && id === requestId.current) setLoading(false); }
    }, [client]);
    const reset = useCallback(() => { requestId.current++; if (mounted.current) { setData(undefined); setError(undefined); setLoading(false); } }, []);
    return { mutate, data, error, loading, reset };
  }
  function useCreateUploadMutation() {
    const [data, setData] = useState<FileUploadResponse | undefined>(undefined);
    const [error, setError] = useState<ApiClientError | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const requestId = useRef(0); const mounted = useRef(true); const activeClient = useRef(client);
    useEffect(() => { mounted.current = true; if (activeClient.current !== client) { activeClient.current = client; setData(undefined); setError(undefined); setLoading(false); } return () => { mounted.current = false; requestId.current++; }; }, [client]);
    const mutate = useCallback(async (payload: { body?: { file: Blob; description?: string | undefined; } | FormData }, requestInit?: RequestInit) => {
      const id = ++requestId.current;
      if (mounted.current) { setLoading(true); setError(undefined); }
      try {
        const result = await client.createUpload(payload?.body, requestInit);
        if (mounted.current && id === requestId.current) setData(result);
        return result;
      } catch (e) { if (mounted.current && id === requestId.current) setError(e as ApiClientError); throw e; } finally { if (mounted.current && id === requestId.current) setLoading(false); }
    }, [client]);
    const reset = useCallback(() => { requestId.current++; if (mounted.current) { setData(undefined); setError(undefined); setLoading(false); } }, []);
    return { mutate, data, error, loading, reset };
  }
  return { useCreateLoginMutation, useCreateUploadMutation };
}
