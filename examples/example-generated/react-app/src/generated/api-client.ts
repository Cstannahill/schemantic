import { APIHealthCheck, APISuccessResponse, APIHTTPValidationError, APIUserCreate, APIBodyLoginAuthLoginPost, APIUserResponse, APIPaginatedResponseUserResponse, APIUserUpdate, APIPaginatedResponseProductResponse, APIProductResponse, APIProductCreate, APIProductUpdate, APIPaginatedResponseOrderResponse, APIOrderResponse, APIOrderCreate, APIOrderUpdate, APIOrderStatus } from './types';

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ECommerceApiClient {
  private baseUrl: string;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  async healthCheckHealthGet(options?: RequestInit): Promise<APIHealthCheck> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/health/`, {})}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async readinessCheckHealthReadyGet(options?: RequestInit): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/health/ready`, {})}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async livenessCheckHealthLiveGet(options?: RequestInit): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/health/live`, {})}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async registerAuthRegisterPost(body: APIUserCreate, options?: RequestInit): Promise<APISuccessResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/auth/register`, {})}`);

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async loginAuthLoginPost(body: APIBodyLoginAuthLoginPost, options?: RequestInit): Promise<unknown | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/auth/login`, {})}`);

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getCurrentUserInfoAuthMeGet(options?: RequestInit): Promise<APIUserResponse> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/auth/me`, {})}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async refreshTokenAuthRefreshPost(options?: RequestInit): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/auth/refresh`, {})}`);

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async changePasswordAuthChangePasswordPost(current_password: string, new_password: string, options?: RequestInit): Promise<APISuccessResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/auth/change-password`, {})}`);

    // Add query parameters
    if (current_password !== undefined) {
      url.searchParams.set('current_password', String(current_password));
    }
    if (new_password !== undefined) {
      url.searchParams.set('new_password', String(new_password));
    }

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async logoutAuthLogoutPost(options?: RequestInit): Promise<APISuccessResponse> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/auth/logout`, {})}`);

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getUsersUsersGet(role?: unknown, status?: unknown, search?: unknown, page?: number, size?: number, sort_by?: unknown, sort_order?: unknown, options?: RequestInit): Promise<APIPaginatedResponseUserResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/users/`, {})}`);

    // Add query parameters
    if (role !== undefined) {
      url.searchParams.set('role', String(role));
    }
    if (status !== undefined) {
      url.searchParams.set('status', String(status));
    }
    if (search !== undefined) {
      url.searchParams.set('search', String(search));
    }
    if (page !== undefined) {
      url.searchParams.set('page', String(page));
    }
    if (size !== undefined) {
      url.searchParams.set('size', String(size));
    }
    if (sort_by !== undefined) {
      url.searchParams.set('sort_by', String(sort_by));
    }
    if (sort_order !== undefined) {
      url.searchParams.set('sort_order', String(sort_order));
    }

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async createUserUsersPost(body: APIUserCreate, options?: RequestInit): Promise<APIUserResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/users/`, {})}`);

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getUserUsersUserIdGet(user_id: number, options?: RequestInit): Promise<APIUserResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/users/${user_id}`, { user_id })}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async updateUserUsersUserIdPut(user_id: number, body: APIUserUpdate, options?: RequestInit): Promise<APIUserResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/users/${user_id}`, { user_id })}`);

    const requestOptions: RequestInit = {
      method: 'PUT',
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async deleteUserUsersUserIdDelete(user_id: number, options?: RequestInit): Promise<void | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/users/${user_id}`, { user_id })}`);

    const requestOptions: RequestInit = {
      method: 'DELETE',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getMyProfileUsersMeProfileGet(options?: RequestInit): Promise<APIUserResponse> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/users/me/profile`, {})}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async updateMyProfileUsersMeProfilePut(body: APIUserUpdate, options?: RequestInit): Promise<APIUserResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/users/me/profile`, {})}`);

    const requestOptions: RequestInit = {
      method: 'PUT',
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getProductsProductsGet(category?: unknown, featured?: unknown, search?: unknown, min_price?: unknown, max_price?: unknown, in_stock?: unknown, page?: number, size?: number, sort_by?: unknown, sort_order?: unknown, options?: RequestInit): Promise<APIPaginatedResponseProductResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/products/`, {})}`);

    // Add query parameters
    if (category !== undefined) {
      url.searchParams.set('category', String(category));
    }
    if (featured !== undefined) {
      url.searchParams.set('featured', String(featured));
    }
    if (search !== undefined) {
      url.searchParams.set('search', String(search));
    }
    if (min_price !== undefined) {
      url.searchParams.set('min_price', String(min_price));
    }
    if (max_price !== undefined) {
      url.searchParams.set('max_price', String(max_price));
    }
    if (in_stock !== undefined) {
      url.searchParams.set('in_stock', String(in_stock));
    }
    if (page !== undefined) {
      url.searchParams.set('page', String(page));
    }
    if (size !== undefined) {
      url.searchParams.set('size', String(size));
    }
    if (sort_by !== undefined) {
      url.searchParams.set('sort_by', String(sort_by));
    }
    if (sort_order !== undefined) {
      url.searchParams.set('sort_order', String(sort_order));
    }

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async createProductProductsPost(body: APIProductCreate, options?: RequestInit): Promise<APIProductResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/products/`, {})}`);

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async searchProductsProductsSearchGet(q: string, category?: unknown, limit?: number, options?: RequestInit): Promise<unknown[] | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/products/search`, {})}`);

    // Add query parameters
    if (q !== undefined) {
      url.searchParams.set('q', String(q));
    }
    if (category !== undefined) {
      url.searchParams.set('category', String(category));
    }
    if (limit !== undefined) {
      url.searchParams.set('limit', String(limit));
    }

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getFeaturedProductsProductsFeaturedGet(limit?: number, options?: RequestInit): Promise<unknown[] | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/products/featured`, {})}`);

    // Add query parameters
    if (limit !== undefined) {
      url.searchParams.set('limit', String(limit));
    }

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getProductProductsProductIdGet(product_id: number, options?: RequestInit): Promise<APIProductResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/products/${product_id}`, { product_id })}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async updateProductProductsProductIdPut(product_id: number, body: APIProductUpdate, options?: RequestInit): Promise<APIProductResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/products/${product_id}`, { product_id })}`);

    const requestOptions: RequestInit = {
      method: 'PUT',
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async deleteProductProductsProductIdDelete(product_id: number, options?: RequestInit): Promise<void | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/products/${product_id}`, { product_id })}`);

    const requestOptions: RequestInit = {
      method: 'DELETE',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async updateInventoryProductsProductIdInventoryPatch(product_id: number, quantity_change: number, options?: RequestInit): Promise<APIProductResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/products/${product_id}/inventory`, { product_id })}`);

    // Add query parameters
    if (quantity_change !== undefined) {
      url.searchParams.set('quantity_change', String(quantity_change));
    }

    const requestOptions: RequestInit = {
      method: 'PATCH',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getOrdersOrdersGet(status?: unknown, page?: number, size?: number, sort_by?: unknown, sort_order?: unknown, options?: RequestInit): Promise<APIPaginatedResponseOrderResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/orders/`, {})}`);

    // Add query parameters
    if (status !== undefined) {
      url.searchParams.set('status', String(status));
    }
    if (page !== undefined) {
      url.searchParams.set('page', String(page));
    }
    if (size !== undefined) {
      url.searchParams.set('size', String(size));
    }
    if (sort_by !== undefined) {
      url.searchParams.set('sort_by', String(sort_by));
    }
    if (sort_order !== undefined) {
      url.searchParams.set('sort_order', String(sort_order));
    }

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async createOrderOrdersPost(body: APIOrderCreate, options?: RequestInit): Promise<APIOrderResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/orders/`, {})}`);

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getAllOrdersOrdersAllGet(status?: unknown, user_id?: unknown, page?: number, size?: number, sort_by?: unknown, sort_order?: unknown, options?: RequestInit): Promise<APIPaginatedResponseOrderResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/orders/all`, {})}`);

    // Add query parameters
    if (status !== undefined) {
      url.searchParams.set('status', String(status));
    }
    if (user_id !== undefined) {
      url.searchParams.set('user_id', String(user_id));
    }
    if (page !== undefined) {
      url.searchParams.set('page', String(page));
    }
    if (size !== undefined) {
      url.searchParams.set('size', String(size));
    }
    if (sort_by !== undefined) {
      url.searchParams.set('sort_by', String(sort_by));
    }
    if (sort_order !== undefined) {
      url.searchParams.set('sort_order', String(sort_order));
    }

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async getOrderOrdersOrderIdGet(order_id: number, options?: RequestInit): Promise<APIOrderResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/orders/${order_id}`, { order_id })}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async updateOrderOrdersOrderIdPut(order_id: number, body: APIOrderUpdate, options?: RequestInit): Promise<APIOrderResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/orders/${order_id}`, { order_id })}`);

    const requestOptions: RequestInit = {
      method: 'PUT',
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async deleteOrderOrdersOrderIdDelete(order_id: number, options?: RequestInit): Promise<void | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/orders/${order_id}`, { order_id })}`);

    const requestOptions: RequestInit = {
      method: 'DELETE',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async cancelOrderOrdersOrderIdCancelPatch(order_id: number, options?: RequestInit): Promise<APIOrderResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/orders/${order_id}/cancel`, { order_id })}`);

    const requestOptions: RequestInit = {
      method: 'PATCH',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async updateOrderStatusOrdersOrderIdStatusPatch(order_id: number, new_status: APIOrderStatus, options?: RequestInit): Promise<APIOrderResponse | APIHTTPValidationError> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/orders/${order_id}/status`, { order_id })}`);

    // Add query parameters
    if (new_status !== undefined) {
      url.searchParams.set('new_status', String(new_status));
    }

    const requestOptions: RequestInit = {
      method: 'PATCH',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  async rootGet(options?: RequestInit): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${this.buildPath(`/`, {})}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      throw new ApiClientError(
        'Request failed: ' + response.status + ' ' + response.statusText,
        response.status,
        response
      );
    }

    return response.json();
  }

  private buildPath(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      const value = params[key];
      if (value === undefined) {
        throw new Error('Missing required path parameter: ' + key);
      }
      return String(value);
    });
  }}
