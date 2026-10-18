import { serializeValue, deserializeValue } from './conversion.js';
export class ApiClientError extends globalThis.Error {
    constructor(message, status, response) {
        super(message);
        this.status = status;
        this.response = response;
        this.name = 'ApiClientError';
    }
}
export class ConsumerApiClient {
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.config = {
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            ...config,
        };
    }
    async getUser(userId, options) {
        const url = new URL(this.baseUrl + this.buildPath("/users/{user_id}", { "user_id": serializeValue(userId, { "type": "string" }) }, { "user_id": { "explode": false } }));
        const headers = new Headers(this.config.headers);
        new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
        const requestOptions = {
            ...options,
            method: "GET",
            headers,
        };
        return this.request(url.toString(), requestOptions, [{ "status": "200", "contentType": "application/json", "schema": { "$ref": "#/components/schemas/User" }, "mode": "json" }]);
    }
    async saveUser(body, options) {
        const url = new URL(this.baseUrl + this.buildPath("/users", {}, {}));
        const headers = new Headers(this.config.headers);
        headers.set("Content-Type", "application/json");
        new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
        const requestOptions = {
            ...options,
            method: "POST",
            headers,
            ...(body !== undefined ? { body: JSON.stringify(serializeValue(body, { "$ref": "#/components/schemas/User" })) } : {}),
        };
        return this.request(url.toString(), requestOptions, [{ "status": "200", "contentType": "application/json", "schema": { "$ref": "#/components/schemas/User" }, "mode": "json" }]);
    }
    buildPath(template, params, metadata = {}) {
        return template.replace(/\{([^}]+)\}/g, (_match, key) => {
            const value = params[key];
            if (value === undefined)
                throw new Error('Missing required path parameter: ' + key);
            if (Array.isArray(value))
                return value.map(item => encodeURIComponent(String(item))).join(',');
            if (value !== null && typeof value === 'object')
                return Object.entries(value).map(([name, item]) => encodeURIComponent(name) + (metadata[key]?.explode ? '=' : ',') + encodeURIComponent(String(item))).join(',');
            return encodeURIComponent(String(value));
        });
    }
    async request(url, options, responses) {
        const retries = this.config.retries ?? 0;
        const delayMs = this.config.retryDelay ?? 0;
        const canRetry = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(options.method || 'GET');
        for (let attempt = 0;; attempt++) {
            const controller = new AbortController();
            const timeout = this.config.timeout ?? 0;
            const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;
            const onAbort = () => controller.abort();
            if (options.signal?.aborted)
                controller.abort();
            else
                options.signal?.addEventListener('abort', onAbort, { once: true });
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                if (!response.ok)
                    throw new ApiClientError('Request failed: ' + response.status + ' ' + response.statusText, response.status, response);
                if (response.status === 204 || response.status === 205 || options.method === 'HEAD')
                    return undefined;
                let candidates = responses.filter(item => item.status === String(response.status));
                if (!candidates.length)
                    candidates = responses.filter(item => item.status.toUpperCase() === Math.floor(response.status / 100) + 'XX');
                if (!candidates.length)
                    candidates = responses.filter(item => item.status === 'default');
                const contentType = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
                const declared = candidates.find(item => item.contentType?.toLowerCase() === contentType) || candidates[0];
                if (declared?.mode === 'empty')
                    return undefined;
                const mode = contentType ? /(?:\/json|\+json)$/.test(contentType) ? 'json' : contentType.startsWith('text/') || /(?:\/xml|\+xml)$/.test(contentType) || contentType === 'application/x-www-form-urlencoded' ? 'text' : 'blob' : declared?.mode || 'json';
                if (mode === 'json')
                    return deserializeValue(await response.json(), declared?.schema);
                if (mode === 'text')
                    return await response.text();
                return await response.blob();
            }
            catch (error) {
                const status = error instanceof ApiClientError ? error.status : undefined;
                const transient = status === undefined || status === 408 || status === 429 || (status !== undefined && status >= 500);
                if (!canRetry || !transient || attempt >= retries || options.signal?.aborted || controller.signal.aborted || error instanceof SyntaxError)
                    throw error;
            }
            finally {
                if (timer !== undefined)
                    clearTimeout(timer);
                options.signal?.removeEventListener('abort', onAbort);
            }
            if (delayMs > 0)
                await new Promise((resolve, reject) => {
                    const abort = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); reject(options.signal?.reason || new Error('Request aborted')); };
                    const timer = setTimeout(() => { options.signal?.removeEventListener('abort', abort); resolve(); }, delayMs);
                    if (options.signal?.aborted)
                        abort();
                    else
                        options.signal?.addEventListener('abort', abort, { once: true });
                });
        }
    }
    setDefaultHeader(name, value) {
        const headers = new globalThis.Headers(this.config.headers);
        headers.set(name, value);
        this.config.headers = headers;
    }
    removeDefaultHeader(name) {
        const headers = new globalThis.Headers(this.config.headers);
        headers.delete(name);
        this.config.headers = headers;
    }
    setAuthToken(token) { this.setDefaultHeader('Authorization', 'Bearer ' + token); }
    clearAuthToken() { this.removeDefaultHeader('Authorization'); }
}
