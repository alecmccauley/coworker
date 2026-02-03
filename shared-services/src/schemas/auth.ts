import { z } from "zod";

/**
 * Schema for requesting an auth code
 */
export const requestCodeSchema = z.object({
  email: z.email("Invalid email address"),
});

/**
 * Schema for verifying an auth code
 */
export const verifyCodeSchema = z.object({
  email: z.email("Invalid email address"),
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Code must contain only digits"),
});

/**
 * Schema for refreshing tokens
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * Schema for logout
 */
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * Schema for auth user (subset of User for JWT payload and responses)
 */
export const authUserSchema = z.object({
  id: z.string(),
  email: z.email("Invalid email address"),
  name: z.string().nullable(),
});

/**
 * Schema for auth response (tokens + user)
 */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: authUserSchema,
});

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type AuthUserSchema = z.infer<typeof authUserSchema>;
export type AuthResponseSchema = z.infer<typeof authResponseSchema>;
