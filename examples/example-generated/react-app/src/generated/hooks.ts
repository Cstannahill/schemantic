import {
  APIHealthCheck,
  APISuccessResponse,
  APIHTTPValidationError,
  APIUserCreate,
  APIBodyLoginAuthLoginPost,
  APIUserResponse,
  APIPaginatedResponseUserResponse,
  APIUserUpdate,
  APIPaginatedResponseProductResponse,
  APIProductResponse,
  APIProductCreate,
  APIProductUpdate,
  APIPaginatedResponseOrderResponse,
  APIOrderResponse,
  APIOrderCreate,
  APIOrderUpdate,
  APIOrderStatus,
} from "./types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ECommerceApiClient } from "./api-client";

export function createApiHooks(client: ECommerceApiClient) {
  function useHealthCheckHealthGetQuery(
    args?: void | undefined,
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<APIHealthCheck | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.healthCheckHealthGet(requestInit);
        setData(result as APIHealthCheck);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useReadinessCheckHealthReadyGetQuery(
    args?: void | undefined,
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<unknown | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.readinessCheckHealthReadyGet(requestInit);
        setData(result as unknown);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useLivenessCheckHealthLiveGetQuery(
    args?: void | undefined,
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<unknown | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.livenessCheckHealthLiveGet(requestInit);
        setData(result as unknown);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useRegisterAuthRegisterPostMutation() {
    const [data, setData] = useState<
      APISuccessResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (payload: { body: APIUserCreate }, requestInit?: RequestInit) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.registerAuthRegisterPost(
            payload.body,
            requestInit
          );
          setData(result as APISuccessResponse | APIHTTPValidationError);
          return result as APISuccessResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useLoginAuthLoginPostMutation() {
    const [data, setData] = useState<
      unknown | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { body: APIBodyLoginAuthLoginPost },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.loginAuthLoginPost(
            payload.body,
            requestInit
          );
          setData(result as unknown | APIHTTPValidationError);
          return result as unknown | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useGetCurrentUserInfoAuthMeGetQuery(
    args?: void | undefined,
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<APIUserResponse | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getCurrentUserInfoAuthMeGet(requestInit);
        setData(result as APIUserResponse);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useRefreshTokenAuthRefreshPostMutation() {
    const [data, setData] = useState<unknown | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (payload?: void | undefined, requestInit?: RequestInit) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.refreshTokenAuthRefreshPost(requestInit);
          setData(result as unknown);
          return result as unknown;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useChangePasswordAuthChangePasswordPostMutation() {
    const [data, setData] = useState<
      APISuccessResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { query: { current_password: string; new_password: string } },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.changePasswordAuthChangePasswordPost(
            payload!.query.current_password,
            payload!.query.new_password,
            requestInit
          );
          setData(result as APISuccessResponse | APIHTTPValidationError);
          return result as APISuccessResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useLogoutAuthLogoutPostMutation() {
    const [data, setData] = useState<APISuccessResponse | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (payload?: void | undefined, requestInit?: RequestInit) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.logoutAuthLogoutPost(requestInit);
          setData(result as APISuccessResponse);
          return result as APISuccessResponse;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useGetUsersUsersGetQuery(
    args: {
      query?: {
        role?: unknown;
        status?: unknown;
        search?: unknown;
        page?: number;
        size?: number;
        sort_by?: unknown;
        sort_order?: unknown;
      };
    },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<
      APIPaginatedResponseUserResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getUsersUsersGet(
          args?.query?.role,
          args?.query?.status,
          args?.query?.search,
          args?.query?.page,
          args?.query?.size,
          args?.query?.sort_by,
          args?.query?.sort_order,
          requestInit
        );
        setData(
          result as APIPaginatedResponseUserResponse | APIHTTPValidationError
        );
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useCreateUserUsersPostMutation() {
    const [data, setData] = useState<
      APIUserResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (payload: { body: APIUserCreate }, requestInit?: RequestInit) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.createUserUsersPost(
            payload.body,
            requestInit
          );
          setData(result as APIUserResponse | APIHTTPValidationError);
          return result as APIUserResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useGetUserUsersUserIdGetQuery(
    args: { path: { user_id: number } },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<
      APIUserResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getUserUsersUserIdGet(
          args!.path.user_id,
          requestInit
        );
        setData(result as APIUserResponse | APIHTTPValidationError);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useUpdateUserUsersUserIdPutMutation() {
    const [data, setData] = useState<
      APIUserResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { path: { user_id: number }; body: APIUserUpdate },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.updateUserUsersUserIdPut(
            payload!.path.user_id,
            payload.body,
            requestInit
          );
          setData(result as APIUserResponse | APIHTTPValidationError);
          return result as APIUserResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useDeleteUserUsersUserIdDeleteMutation() {
    const [data, setData] = useState<void | APIHTTPValidationError | undefined>(
      undefined
    );
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { path: { user_id: number } },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.deleteUserUsersUserIdDelete(
            payload!.path.user_id,
            requestInit
          );
          setData(result as void | APIHTTPValidationError);
          return result as void | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useGetMyProfileUsersMeProfileGetQuery(
    args?: void | undefined,
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<APIUserResponse | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getMyProfileUsersMeProfileGet(requestInit);
        setData(result as APIUserResponse);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useUpdateMyProfileUsersMeProfilePutMutation() {
    const [data, setData] = useState<
      APIUserResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (payload: { body: APIUserUpdate }, requestInit?: RequestInit) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.updateMyProfileUsersMeProfilePut(
            payload.body,
            requestInit
          );
          setData(result as APIUserResponse | APIHTTPValidationError);
          return result as APIUserResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useGetProductsProductsGetQuery(
    args: {
      query?: {
        category?: unknown;
        featured?: unknown;
        search?: unknown;
        min_price?: unknown;
        max_price?: unknown;
        in_stock?: unknown;
        page?: number;
        size?: number;
        sort_by?: unknown;
        sort_order?: unknown;
      };
    },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<
      APIPaginatedResponseProductResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getProductsProductsGet(
          args?.query?.category,
          args?.query?.featured,
          args?.query?.search,
          args?.query?.min_price,
          args?.query?.max_price,
          args?.query?.in_stock,
          args?.query?.page,
          args?.query?.size,
          args?.query?.sort_by,
          args?.query?.sort_order,
          requestInit
        );
        setData(
          result as APIPaginatedResponseProductResponse | APIHTTPValidationError
        );
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useCreateProductProductsPostMutation() {
    const [data, setData] = useState<
      APIProductResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { body: APIProductCreate },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.createProductProductsPost(
            payload.body,
            requestInit
          );
          setData(result as APIProductResponse | APIHTTPValidationError);
          return result as APIProductResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useSearchProductsProductsSearchGetQuery(
    args: { query: { q: string; category?: unknown; limit?: number } },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<
      unknown[] | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.searchProductsProductsSearchGet(
          args!.query.q,
          args!.query.category,
          args!.query.limit,
          requestInit
        );
        setData(result as unknown[] | APIHTTPValidationError);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useGetFeaturedProductsProductsFeaturedGetQuery(
    args: { query?: { limit?: number } },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<
      unknown[] | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getFeaturedProductsProductsFeaturedGet(
          args?.query?.limit,
          requestInit
        );
        setData(result as unknown[] | APIHTTPValidationError);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useGetProductProductsProductIdGetQuery(
    args: { path: { product_id: number } },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<
      APIProductResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getProductProductsProductIdGet(
          args!.path.product_id,
          requestInit
        );
        setData(result as APIProductResponse | APIHTTPValidationError);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useUpdateProductProductsProductIdPutMutation() {
    const [data, setData] = useState<
      APIProductResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { path: { product_id: number }; body: APIProductUpdate },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.updateProductProductsProductIdPut(
            payload!.path.product_id,
            payload.body,
            requestInit
          );
          setData(result as APIProductResponse | APIHTTPValidationError);
          return result as APIProductResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useDeleteProductProductsProductIdDeleteMutation() {
    const [data, setData] = useState<void | APIHTTPValidationError | undefined>(
      undefined
    );
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { path: { product_id: number } },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.deleteProductProductsProductIdDelete(
            payload!.path.product_id,
            requestInit
          );
          setData(result as void | APIHTTPValidationError);
          return result as void | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useUpdateInventoryProductsProductIdInventoryPatchMutation() {
    const [data, setData] = useState<
      APIProductResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: {
          path: { product_id: number };
          query: { quantity_change: number };
        },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result =
            await client.updateInventoryProductsProductIdInventoryPatch(
              payload!.path.product_id,
              payload!.query.quantity_change,
              requestInit
            );
          setData(result as APIProductResponse | APIHTTPValidationError);
          return result as APIProductResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useGetOrdersOrdersGetQuery(
    args: {
      query?: {
        status?: unknown;
        page?: number;
        size?: number;
        sort_by?: unknown;
        sort_order?: unknown;
      };
    },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<
      APIPaginatedResponseOrderResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getOrdersOrdersGet(
          args?.query?.status,
          args?.query?.page,
          args?.query?.size,
          args?.query?.sort_by,
          args?.query?.sort_order,
          requestInit
        );
        setData(
          result as APIPaginatedResponseOrderResponse | APIHTTPValidationError
        );
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useCreateOrderOrdersPostMutation() {
    const [data, setData] = useState<
      APIOrderResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (payload: { body: APIOrderCreate }, requestInit?: RequestInit) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.createOrderOrdersPost(
            payload.body,
            requestInit
          );
          setData(result as APIOrderResponse | APIHTTPValidationError);
          return result as APIOrderResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useGetAllOrdersOrdersAllGetQuery(
    args: {
      query?: {
        status?: unknown;
        user_id?: unknown;
        page?: number;
        size?: number;
        sort_by?: unknown;
        sort_order?: unknown;
      };
    },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<
      APIPaginatedResponseOrderResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getAllOrdersOrdersAllGet(
          args?.query?.status,
          args?.query?.user_id,
          args?.query?.page,
          args?.query?.size,
          args?.query?.sort_by,
          args?.query?.sort_order,
          requestInit
        );
        setData(
          result as APIPaginatedResponseOrderResponse | APIHTTPValidationError
        );
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useGetOrderOrdersOrderIdGetQuery(
    args: { path: { order_id: number } },
    requestInit?: RequestInit
  ) {
    const [data, setData] = useState<
      APIOrderResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.getOrderOrdersOrderIdGet(
          args!.path.order_id,
          requestInit
        );
        setData(result as APIOrderResponse | APIHTTPValidationError);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  function useUpdateOrderOrdersOrderIdPutMutation() {
    const [data, setData] = useState<
      APIOrderResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { path: { order_id: number }; body: APIOrderUpdate },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.updateOrderOrdersOrderIdPut(
            payload!.path.order_id,
            payload.body,
            requestInit
          );
          setData(result as APIOrderResponse | APIHTTPValidationError);
          return result as APIOrderResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useDeleteOrderOrdersOrderIdDeleteMutation() {
    const [data, setData] = useState<void | APIHTTPValidationError | undefined>(
      undefined
    );
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { path: { order_id: number } },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.deleteOrderOrdersOrderIdDelete(
            payload!.path.order_id,
            requestInit
          );
          setData(result as void | APIHTTPValidationError);
          return result as void | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }

  function useCancelOrderOrdersOrderIdCancelPatchMutation() {
    const [data, setData] = useState<
      APIOrderResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: { path: { order_id: number } },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.cancelOrderOrdersOrderIdCancelPatch(
            payload!.path.order_id,
            requestInit
          );
          setData(result as APIOrderResponse | APIHTTPValidationError);
          return result as APIOrderResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useUpdateOrderStatusOrdersOrderIdStatusPatchMutation() {
    const [data, setData] = useState<
      APIOrderResponse | APIHTTPValidationError | undefined
    >(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(
      async (
        payload: {
          path: { order_id: number };
          query: { new_status: APIOrderStatus };
        },
        requestInit?: RequestInit
      ) => {
        setLoading(true);
        setError(undefined);
        try {
          const result = await client.updateOrderStatusOrdersOrderIdStatusPatch(
            payload!.path.order_id,
            payload!.query.new_status,
            requestInit
          );
          setData(result as APIOrderResponse | APIHTTPValidationError);
          return result as APIOrderResponse | APIHTTPValidationError;
        } catch (e) {
          setError(e);
          throw e;
        } finally {
          setLoading(false);
        }
      },
      [client]
    );
    const reset = useCallback(() => {
      setData(undefined);
      setError(undefined);
      setLoading(false);
    }, []);
    return { mutate, data, error, loading, reset };
  }
  function useRootGetQuery(args?: void | undefined, requestInit?: RequestInit) {
    const [data, setData] = useState<unknown | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(false);
    const argsRef = useRef(args);
    useEffect(() => {
      argsRef.current = args;
    }, [args]);
    const fetcher = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await client.rootGet(requestInit);
        setData(result as unknown);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }, [client, args, requestInit]);
    useEffect(() => {
      void fetcher();
    }, [fetcher]);
    return { data, error, loading, refetch: fetcher };
  }
  return {
    useHealthCheckHealthGetQuery,
    useReadinessCheckHealthReadyGetQuery,
    useLivenessCheckHealthLiveGetQuery,
    useRegisterAuthRegisterPostMutation,
    useLoginAuthLoginPostMutation,
    useGetCurrentUserInfoAuthMeGetQuery,
    useRefreshTokenAuthRefreshPostMutation,
    useChangePasswordAuthChangePasswordPostMutation,
    useLogoutAuthLogoutPostMutation,
    useGetUsersUsersGetQuery,
    useCreateUserUsersPostMutation,
    useGetUserUsersUserIdGetQuery,
    useUpdateUserUsersUserIdPutMutation,
    useDeleteUserUsersUserIdDeleteMutation,
    useGetMyProfileUsersMeProfileGetQuery,
    useUpdateMyProfileUsersMeProfilePutMutation,
    useGetProductsProductsGetQuery,
    useCreateProductProductsPostMutation,
    useSearchProductsProductsSearchGetQuery,
    useGetFeaturedProductsProductsFeaturedGetQuery,
    useGetProductProductsProductIdGetQuery,
    useUpdateProductProductsProductIdPutMutation,
    useDeleteProductProductsProductIdDeleteMutation,
    useUpdateInventoryProductsProductIdInventoryPatchMutation,
    useGetOrdersOrdersGetQuery,
    useCreateOrderOrdersPostMutation,
    useGetAllOrdersOrdersAllGetQuery,
    useGetOrderOrdersOrderIdGetQuery,
    useUpdateOrderOrdersOrderIdPutMutation,
    useDeleteOrderOrdersOrderIdDeleteMutation,
    useCancelOrderOrdersOrderIdCancelPatchMutation,
    useUpdateOrderStatusOrdersOrderIdStatusPatchMutation,
    useRootGetQuery,
  };
}
