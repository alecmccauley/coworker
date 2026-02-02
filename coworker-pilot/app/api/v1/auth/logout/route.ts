import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@coworker/shared-services/db";
import { logoutSchema } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

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
  const result = logoutSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const { refreshToken } = result.data;

  // 3. Find all non-revoked refresh tokens
  const allTokens = await prisma.refreshToken.findMany({
    where: {
      revokedAt: null,
    },
  });

  // 4. Find matching token and revoke it
  for (const token of allTokens) {
    const matches = await bcrypt.compare(refreshToken, token.token);
    if (matches) {
      await prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });
      break;
    }
  }

  // 5. Always return success (don't leak whether token existed)
  return successResponse({
    success: true,
    message: "Successfully logged out",
  });
}
