import { NextRequest } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { insiderSignUpSchema } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/insider/sign-up
 * Create a new user via insider preview sign-up (public)
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  const result = insiderSignUpSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const { code, name, email } = result.data;

  // Verify insider code is valid and active
  const insiderCode = await prisma.insiderCode.findUnique({
    where: { code },
  });

  if (!insiderCode || !insiderCode.isActive) {
    return notFoundResponse(
      "This code isn't valid. Double-check and try again."
    );
  }

  // Check if user email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return conflictResponse(
      "An account with this email already exists. Try signing in instead."
    );
  }

  // Create user and activation record in a transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { email, name },
    });

    await tx.insiderActivation.create({
      data: {
        insiderCodeId: insiderCode.id,
        userId: newUser.id,
      },
    });

    return newUser;
  });

  return successResponse(
    { id: user.id, email: user.email, name: user.name },
    201
  );
}
