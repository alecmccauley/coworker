import { NextRequest } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { updateUserSchema, userIdParamSchema } from "@coworker/shared-services";
import type { UpdateUserInput } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
  noContentResponse,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/users/[id]
 * Get a user by ID
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Validate ID
  const idResult = userIdParamSchema.safeParse({ id });
  if (!idResult.success) {
    return validationErrorResponse(idResult.error.issues);
  }

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return notFoundResponse("User not found");
  }

  return successResponse(user);
}

/**
 * PATCH /api/v1/users/[id]
 * Update a user
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Validate ID
  const idResult = userIdParamSchema.safeParse({ id });
  if (!idResult.success) {
    return validationErrorResponse(idResult.error.issues);
  }

  // Check user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    return notFoundResponse("User not found");
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  const result = updateUserSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data as UpdateUserInput;

  // Check for email conflict if updating email
  if (data.email) {
    const emailConflict = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (emailConflict && emailConflict.id !== id) {
      return conflictResponse("Email already exists");
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  return successResponse(user);
}

/**
 * DELETE /api/v1/users/[id]
 * Delete a user
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Validate ID
  const idResult = userIdParamSchema.safeParse({ id });
  if (!idResult.success) {
    return validationErrorResponse(idResult.error.issues);
  }

  // Check user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    return notFoundResponse("User not found");
  }

  await prisma.user.delete({
    where: { id },
  });

  return noContentResponse();
}
