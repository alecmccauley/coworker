"use client";

import { createSdk, type CoworkerSdk } from "@coworker/shared-services";

const TOKEN_KEYS = {
  ACCESS: "coworker_access_token",
  REFRESH: "coworker_refresh_token",
} as const;

/**
 * Get the API base URL
 */
function getBaseUrl(): string {
  // In browser, use relative URL (same origin)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side fallback
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
}

/**
 * Token storage utilities for localStorage
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEYS.ACCESS);
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEYS.REFRESH);
  },

  saveTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
    localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
  },

  clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEYS.ACCESS);
    localStorage.removeItem(TOKEN_KEYS.REFRESH);
  },

  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  },
};

// Singleton SDK instance
let sdkInstance: CoworkerSdk | null = null;

/**
 * Get or create the SDK instance configured for browser use
 */
export function getSdk(): CoworkerSdk {
  if (sdkInstance) {
    return sdkInstance;
  }

  sdkInstance = createSdk({
    baseUrl: getBaseUrl(),
    getAccessToken: async () => {
      return tokenStorage.getAccessToken();
    },
    onTokenExpired: async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        tokenStorage.clearTokens();
        return null;
      }

      try {
        // Use the SDK instance to refresh - this will use postPublic which skips auth
        const result = await sdkInstance!.auth.refresh(refreshToken);
        tokenStorage.saveTokens(result.accessToken, result.refreshToken);
        return result.accessToken;
      } catch (error) {
        // Refresh failed, clear tokens
        console.error("Token refresh failed:", error);
        tokenStorage.clearTokens();
        return null;
      }
    },
  });

  return sdkInstance;
}

/**
 * Reset the SDK instance (useful for logout or testing)
 */
export function resetSdk(): void {
  sdkInstance = null;
}
