import type { ApiResponse } from "../types/api.js";
import {
  SdkError,
  ValidationSdkError,
  NotFoundSdkError,
  NetworkSdkError,
  ServerSdkError,
} from "./errors.js";

export interface ApiClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

/**
 * Low-level API client that handles HTTP requests and error handling
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };
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
    const data = (await response.json()) as ApiResponse<T>;

    if (data.status === "success") {
      return data.data;
    }

    // Handle error responses
    const { status } = response;
    const message = data.message;

    if (status === 400) {
      throw new ValidationSdkError(message, data.errors);
    }

    if (status === 404) {
      throw new NotFoundSdkError(message);
    }

    if (status >= 500) {
      throw new ServerSdkError(message, status);
    }

    throw new SdkError(message, status);
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
    } = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

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
