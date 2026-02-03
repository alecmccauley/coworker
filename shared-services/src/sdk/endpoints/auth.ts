import type { ApiClient } from "../client.js";
import type {
  AuthResponse,
  RequestCodeResponse,
} from "../../types/domain/auth.js";
import type { User } from "../../types/domain/user.js";
import {
  requestCodeSchema,
  verifyCodeSchema,
  refreshTokenSchema,
  logoutSchema,
} from "../../schemas/auth.js";
import { parseWithSchema } from "../validation.js";

/**
 * Auth endpoint for authentication operations
 */
export class AuthEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Request an auth code to be sent to the user's email
   */
  async requestCode(email: string): Promise<RequestCodeResponse> {
    const parsed = parseWithSchema(requestCodeSchema, { email });
    return this.client.postPublic<RequestCodeResponse>(
      "/api/v1/auth/request-code",
      parsed
    );
  }

  /**
   * Verify the auth code and get tokens
   */
  async verifyCode(email: string, code: string): Promise<AuthResponse> {
    const parsed = parseWithSchema(verifyCodeSchema, { email, code });
    return this.client.postPublic<AuthResponse>(
      "/api/v1/auth/verify-code",
      parsed
    );
  }

  /**
   * Refresh the access token using a refresh token
   * Returns new access token AND new refresh token (rotation)
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const parsed = parseWithSchema(refreshTokenSchema, { refreshToken });
    return this.client.postPublic<AuthResponse>(
      "/api/v1/auth/refresh",
      parsed
    );
  }

  /**
   * Logout and revoke the refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    const parsed = parseWithSchema(logoutSchema, { refreshToken });
    await this.client.postPublic<unknown>("/api/v1/auth/logout", parsed);
  }

  /**
   * Get the current authenticated user
   */
  async me(): Promise<User> {
    return this.client.get<User>("/api/v1/auth/me");
  }
}
