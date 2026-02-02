import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextResponse } from "next/server";

/**
 * Rate limiter for auth code requests: 3 requests per 15 minutes per email
 */
export const requestCodeLimiter = new RateLimiterMemory({
  points: 3,
  duration: 15 * 60, // 15 minutes
  keyPrefix: "request_code",
});

/**
 * Rate limiter for code verification: 5 attempts per 15 minutes per email
 */
export const verifyCodeLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60, // 15 minutes
  keyPrefix: "verify_code",
});

/**
 * Rate limiter for token refresh: 10 requests per minute per IP
 */
export const refreshTokenLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60, // 1 minute
  keyPrefix: "refresh_token",
});

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(retryAfter?: number) {
  const headers: HeadersInit = {};
  if (retryAfter) {
    headers["Retry-After"] = String(Math.ceil(retryAfter));
  }

  return NextResponse.json(
    {
      status: "error",
      message: "Too many requests. Please try again later.",
      retryAfter: retryAfter ? Math.ceil(retryAfter) : undefined,
    },
    { status: 429, headers }
  );
}

/**
 * Check rate limit for a given limiter and key
 * Returns null if allowed, or a NextResponse if rate limited
 */
export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<NextResponse | null> {
  try {
    await limiter.consume(key);
    return null;
  } catch (error) {
    if (error && typeof error === "object" && "msBeforeNext" in error) {
      const rateLimitError = error as { msBeforeNext: number };
      return rateLimitResponse(rateLimitError.msBeforeNext / 1000);
    }
    throw error;
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}
