import * as jose from "jose";
import type { JwtPayload } from "@coworker/shared-services";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ISSUER = "coworker";
const AUDIENCE = "coworker-app";

// Token expiry times
export const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
export const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

/**
 * Get the encoded secret for JWT signing/verification
 */
function getAccessSecret(): Uint8Array {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(JWT_SECRET);
}

function getRefreshSecret(): Uint8Array {
  if (!JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(JWT_REFRESH_SECRET);
}

/**
 * Sign an access token for a user
 */
export async function signAccessToken(
  userId: string,
  email: string
): Promise<string> {
  return new jose.SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getAccessSecret());
}

/**
 * Sign a refresh token for a user
 */
export async function signRefreshToken(
  userId: string,
  email: string
): Promise<string> {
  return new jose.SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getRefreshSecret());
}

/**
 * Verify an access token and return the payload
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jose.jwtVerify(token, getAccessSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      iss: payload.iss as string,
      aud: payload.aud as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new JwtExpiredError("Access token has expired");
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      throw new JwtValidationError("Token claim validation failed");
    }
    throw new JwtValidationError("Invalid access token");
  }
}

/**
 * Verify a refresh token and return the payload
 */
export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jose.jwtVerify(token, getRefreshSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      iss: payload.iss as string,
      aud: payload.aud as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new JwtExpiredError("Refresh token has expired");
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      throw new JwtValidationError("Token claim validation failed");
    }
    throw new JwtValidationError("Invalid refresh token");
  }
}

/**
 * Custom error for expired tokens
 */
export class JwtExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JwtExpiredError";
  }
}

/**
 * Custom error for invalid tokens
 */
export class JwtValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JwtValidationError";
  }
}
