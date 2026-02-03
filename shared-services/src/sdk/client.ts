import type { ApiResponse } from "../types/api.js";
import {
  SdkError,
  ValidationSdkError,
  NotFoundSdkError,
  NetworkSdkError,
  ServerSdkError,
  AuthenticationSdkError,
  RateLimitSdkError,
} from "./errors.js";

export interface ApiClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  /**
   * Function to get the current access token
   */
  getAccessToken?: () => Promise<string | null>;
  /**
   * Function called when a 401 is received, should refresh and return new token
   */
  onTokenExpired?: () => Promise<string | null>;
}

/**
 * Low-level API client that handles HTTP requests and error handling
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly getAccessToken?: () => Promise<string | null>;
  private readonly onTokenExpired?: () => Promise<string | null>;
  private isRefreshing = false;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };
    this.getAccessToken = config.getAccessToken;
    this.onTokenExpired = config.onTokenExpired;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            url.searchParams.set(key, value.toISOString());
            continue;
          }

          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "bigint"
          ) {
            url.searchParams.set(key, String(value));
            continue;
          }

          url.searchParams.set(key, JSON.stringify(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Handle API response and throw appropriate errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();

    // Empty body (e.g. server error before writing, or 204)
    if (!text || text.trim() === "") {
      const status = response.status;
      if (status === 204) {
        return undefined as T;
      }
      throw new ServerSdkError(
        status >= 500
          ? "Server returned an invalid or empty response. Please try again."
          : `Request failed with status ${status} and no response body.`,
        status
      );
    }

    let data: ApiResponse<T> & { retryAfter?: number };
    try {
      data = JSON.parse(text) as ApiResponse<T> & { retryAfter?: number };
    } catch {
      throw new ServerSdkError(
        "Server returned invalid JSON. Please try again.",
        response.status
      );
    }

    if (data.status === "success") {
      return data.data;
    }

    // Handle error responses
    const { status } = response;
    const message = data.message;

    if (status === 400) {
      throw new ValidationSdkError(message, data.errors);
    }

    if (status === 401) {
      throw new AuthenticationSdkError(message);
    }

    if (status === 404) {
      throw new NotFoundSdkError(message);
    }

    if (status === 429) {
      const retryHeader = response.headers.get("Retry-After");
      const retryAfter =
        data.retryAfter ??
        (retryHeader ? parseInt(retryHeader, 10) : undefined);
      throw new RateLimitSdkError(message, retryAfter);
    }

    if (status >= 500) {
      throw new ServerSdkError(message, status);
    }

    throw new SdkError(message, status);
  }

  /**
   * Get headers with optional auth token
   */
  private async getHeaders(overrideToken?: string): Promise<Record<string, string>> {
    const headers = { ...this.headers };

    const token = overrideToken ?? (this.getAccessToken ? await this.getAccessToken() : null);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make a fetch request with error handling
   */
  private async request<T>(
    method: string,
    path: string,
    options: {
      query?: Record<string, unknown>;
      body?: unknown;
      skipAuth?: boolean;
    } = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);

    try {
      const headers = options.skipAuth 
        ? this.headers 
        : await this.getHeaders();

      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Handle 401 with token refresh (only once to prevent loops)
      if (response.status === 401 && this.onTokenExpired && !this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const newToken = await this.onTokenExpired();
          if (newToken) {
            // Retry request with new token
            const retryHeaders = await this.getHeaders(newToken);
            const retryResponse = await fetch(url, {
              method,
              headers: retryHeaders,
              body: options.body ? JSON.stringify(options.body) : undefined,
            });
            this.isRefreshing = false;
            return await this.handleResponse<T>(retryResponse);
          }
        } catch {
          // Refresh failed, continue with original 401 response
        }
        this.isRefreshing = false;
      }

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof SdkError) {
        throw error;
      }

      if (error instanceof TypeError) {
        throw new NetworkSdkError("Failed to connect to the server");
      }

      throw new NetworkSdkError(
        error instanceof Error ? error.message : "Unknown network error"
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>("GET", path, { query });
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  /**
   * POST request without authentication (for auth endpoints)
   */
  async postPublic<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, { body, skipAuth: true });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, { body });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
