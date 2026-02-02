import type { BaseEntity } from "../crud.js";

/**
 * Auth user - subset of User for JWT payload and responses
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Request to send an auth code
 */
export interface RequestCodeRequest {
  email: string;
}

/**
 * Response after requesting an auth code
 */
export interface RequestCodeResponse {
  success: boolean;
  message: string;
}

/**
 * Request to verify an auth code
 */
export interface VerifyCodeRequest {
  email: string;
  code: string;
}

/**
 * Request to refresh tokens
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Response containing auth tokens and user
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Request to logout (revoke refresh token)
 */
export interface LogoutRequest {
  refreshToken: string;
}

/**
 * Response for authentication status check
 */
export interface AuthStatusResponse {
  authenticated: boolean;
  user?: AuthUser;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  iss: string; // Issuer: 'coworker'
  aud: string; // Audience: 'coworker-app'
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * AuthCode entity (matches Prisma model)
 */
export interface AuthCode extends BaseEntity {
  code: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  attempts: number;
}

/**
 * RefreshToken entity (matches Prisma model)
 */
export interface RefreshToken extends BaseEntity {
  token: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}
