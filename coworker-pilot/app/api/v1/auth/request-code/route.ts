import { NextRequest } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@coworker/shared-services/db";
import { requestCodeSchema } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/api-utils";
import {
  sendVerificationEmail,
  EmailConfigError,
  EmailSendError,
} from "@/lib/email";
import {
  requestCodeLimiter,
  checkRateLimit,
} from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

// Auth code expires in 10 minutes
const CODE_EXPIRY_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
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
    const result = requestCodeSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(result.error.issues);
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 3. Check rate limit (before any database operations)
    const rateLimitResponse = await checkRateLimit(
      requestCodeLimiter,
      normalizedEmail
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 4. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return notFoundResponse(
        "We couldn't find an account with that email. Please check and try again."
      );
    }

    // 5. Invalidate all previous unused codes for this user
    await prisma.authCode.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used to invalidate
      },
    });

    // 6. Generate a cryptographically secure 6-digit code
    const plainCode = randomInt(100000, 999999).toString();

    // 7. Hash the code before storing
    const hashedCode = await bcrypt.hash(plainCode, 10);

    // 8. Store the auth code
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
    await prisma.authCode.create({
      data: {
        code: hashedCode,
        userId: user.id,
        expiresAt,
      },
    });

    // 9. Send the verification email
    try {
      await sendVerificationEmail(normalizedEmail, plainCode, CODE_EXPIRY_MINUTES);
    } catch (error) {
      console.error("[AUTH] Failed to send verification email:", error);
      if (error instanceof EmailConfigError) {
        return errorResponse(
          "Email service is not configured. Please contact support.",
          503
        );
      }
      if (error instanceof EmailSendError) {
        return errorResponse(
          "Unable to send verification email. Please try again.",
          503
        );
      }
      throw error;
    }

    return successResponse({
      success: true,
      message: "Verification code sent. Please check your email.",
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message;
    const stack = err.stack ?? "";
    // Log to stderr so it appears in Next.js dev server output
    console.error("[AUTH] request-code 500:", message);
    if (stack) {
      console.error("[AUTH] request-code stack:", stack);
    }
    if (error && typeof error === "object" && "code" in error) {
      console.error("[AUTH] request-code code:", (error as { code: string }).code);
    }
    const isDev = process.env.NODE_ENV === "development";
    return errorResponse(
      isDev ? `Something went wrong: ${message}` : "Something went wrong. Please try again.",
      500
    );
  }
}
