import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@coworker/shared-services/db";
import { verifyCodeSchema } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
} from "@/lib/api-utils";
import { signAccessToken } from "@/lib/jwt";
import { verifyCodeLimiter, checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export async function POST(request: NextRequest) {
  // 1. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  // 2. Validate input
  const result = verifyCodeSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const { email, code } = result.data;
  const normalizedEmail = email.toLowerCase().trim();

  // 3. Check rate limit
  const rateLimitResponse = await checkRateLimit(
    verifyCodeLimiter,
    normalizedEmail
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // 4. Find the user
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return errorResponse(
      "We couldn't find an account with that email.",
      404
    );
  }

  // 5. Find the latest valid auth code for this user
  const authCode = await prisma.authCode.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!authCode) {
    return errorResponse(
      "That code has expired. Let's send you a fresh one.",
      400
    );
  }

  // 6. Check if attempts exceeded
  if (authCode.attempts >= MAX_ATTEMPTS) {
    return errorResponse(
      "Too many attempts. Please request a new code.",
      400
    );
  }

  // 7. Verify the code
  const codeMatches = await bcrypt.compare(code, authCode.code);

  if (!codeMatches) {
    // Increment failed attempts
    await prisma.authCode.update({
      where: { id: authCode.id },
      data: { attempts: { increment: 1 } },
    });

    const attemptsRemaining = MAX_ATTEMPTS - authCode.attempts - 1;
    return errorResponse(
      `That code doesn't look right. You have ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
      400
    );
  }

  // 8. Mark code as used
  await prisma.authCode.update({
    where: { id: authCode.id },
    data: { usedAt: new Date() },
  });

  // 9. Generate tokens
  const accessToken = await signAccessToken(user.id, user.email);
  const refreshTokenValue = randomBytes(32).toString("hex");
  const hashedRefreshToken = await bcrypt.hash(refreshTokenValue, 10);

  // 10. Store refresh token in database
  const refreshTokenExpiry = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );
  await prisma.refreshToken.create({
    data: {
      token: hashedRefreshToken,
      userId: user.id,
      expiresAt: refreshTokenExpiry,
    },
  });

  // 11. Log sign-in event (best-effort, non-blocking)
  prisma.event
    .create({
      data: {
        type: "user.sign_in",
        userId: user.id,
        details: {
          email: user.email,
          name: user.name,
          authCodeId: authCode.id,
          attempts: authCode.attempts,
        },
      },
    })
    .catch((error) =>
      console.error("[AUTH] Failed to log sign-in event:", error)
    );

  // 12. Return tokens and user
  return successResponse({
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}
