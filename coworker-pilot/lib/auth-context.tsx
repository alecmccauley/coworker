"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthUser } from "@coworker/shared-services";
import { getSdk, tokenStorage, resetSdk } from "./sdk";

interface AuthContextValue {
  /** Current authenticated user */
  user: AuthUser | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the user is an admin */
  isAdmin: boolean;
  /** Whether the initial auth check is in progress */
  isLoading: boolean;
  /** Request a verification code for email */
  requestCode: (email: string) => Promise<{ success: boolean; message: string }>;
  /** Verify the code and log in */
  verifyCode: (email: string, code: string) => Promise<void>;
  /** Log out and clear tokens */
  logout: () => Promise<void>;
  /** Refresh admin status */
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  /**
   * Check if the current user is an admin
   */
  const checkAdminStatus = useCallback(async (): Promise<boolean> => {
    try {
      const sdk = getSdk();
      // Call the admin-check endpoint
      const response = await fetch("/api/v1/auth/admin-check", {
        headers: {
          Authorization: `Bearer ${tokenStorage.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        setIsAdmin(false);
        return false;
      }

      const data = await response.json();
      const adminStatus = data.data?.isAdmin ?? false;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.error("Failed to check admin status:", error);
      setIsAdmin(false);
      return false;
    }
  }, []);

  /**
   * Check authentication status on mount
   */
  useEffect(() => {
    async function checkAuth() {
      if (!tokenStorage.hasTokens()) {
        setIsLoading(false);
        return;
      }

      try {
        const sdk = getSdk();
        const currentUser = await sdk.auth.me();
        setUser(currentUser);

        // Check admin status after getting user
        await checkAdminStatus();
      } catch (error) {
        console.error("Auth check failed:", error);
        // Clear invalid tokens
        tokenStorage.clearTokens();
        setUser(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [checkAdminStatus]);

  /**
   * Request a verification code
   */
  const requestCode = useCallback(
    async (email: string): Promise<{ success: boolean; message: string }> => {
      const sdk = getSdk();
      const result = await sdk.auth.requestCode(email);
      return result;
    },
    []
  );

  /**
   * Verify the code and log in
   */
  const verifyCode = useCallback(
    async (email: string, code: string): Promise<void> => {
      const sdk = getSdk();
      const result = await sdk.auth.verifyCode(email, code);

      // Save tokens
      tokenStorage.saveTokens(result.accessToken, result.refreshToken);

      // Set user
      setUser(result.user);

      // Check admin status
      await checkAdminStatus();
    },
    [checkAdminStatus]
  );

  /**
   * Log out
   */
  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefreshToken();

    if (refreshToken) {
      try {
        const sdk = getSdk();
        await sdk.auth.logout(refreshToken);
      } catch (error) {
        // Ignore logout errors - we're logging out anyway
        console.error("Logout API error:", error);
      }
    }

    // Clear local state
    tokenStorage.clearTokens();
    resetSdk();
    setUser(null);
    setIsAdmin(false);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    requestCode,
    verifyCode,
    logout,
    checkAdminStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
