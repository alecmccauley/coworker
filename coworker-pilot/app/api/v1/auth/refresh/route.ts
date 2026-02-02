import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@coworker/shared-services/db";
import { refreshTokenSchema } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/api-utils";
import { signAccessToken } from "@/lib/jwt";
import {
  refreshTokenLimiter,
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export async function POST(request: NextRequest) {
  // 1. Rate limit by IP
  const clientIp = getClientIp(request);
  const rateLimitResponse = await checkRateLimit(refreshTokenLimiter, clientIp);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // 2. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  // 3. Validate input
  const result = refreshTokenSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const { refreshToken } = result.data;

  // 4. Find all refresh tokens for comparison (we need to check the hash)
  // Since we hash tokens, we need to iterate and compare
  const allTokens = await prisma.refreshToken.findMany({
    where: {
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  // 5. Find matching token
  let matchedToken: (typeof allTokens)[0] | null = null;
  for (const token of allTokens) {
    const matches = await bcrypt.compare(refreshToken, token.token);
    if (matches) {
      matchedToken = token;
      break;
    }
  }

  if (!matchedToken) {
    return unauthorizedResponse("Invalid refresh token");
  }

  // 6. Check if token was already revoked (potential token theft!)
  if (matchedToken.revokedAt) {
    // Token was already used - potential theft!
    // Revoke ALL tokens for this user (force re-login everywhere)
    await prisma.refreshToken.updateMany({
      where: { userId: matchedToken.userId },
      data: { revokedAt: new Date() },
    });

    console.warn(
      `[SECURITY] Potential token theft detected for user ${matchedToken.userId}. All tokens revoked.`
    );

    return errorResponse(
      "Session invalidated for security. Please sign in again.",
      401
    );
  }

  // 7. Revoke the old refresh token (rotation)
  await prisma.refreshToken.update({
    where: { id: matchedToken.id },
    data: { revokedAt: new Date() },
  });

  // 8. Generate new tokens
  const accessToken = await signAccessToken(
    matchedToken.user.id,
    matchedToken.user.email
  );
  const newRefreshTokenValue = randomBytes(32).toString("hex");
  const hashedNewRefreshToken = await bcrypt.hash(newRefreshTokenValue, 10);

  // 9. Store new refresh token
  const refreshTokenExpiry = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );
  await prisma.refreshToken.create({
    data: {
      token: hashedNewRefreshToken,
      userId: matchedToken.userId,
      expiresAt: refreshTokenExpiry,
    },
  });

  // 10. Return new tokens and user
  return successResponse({
    accessToken,
    refreshToken: newRefreshTokenValue,
    user: {
      id: matchedToken.user.id,
      email: matchedToken.user.email,
      name: matchedToken.user.name,
    },
  });
}
