import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { updateUserSchema, userIdParamSchema } from "@coworker/shared-services";
import type { UpdateUserSchemaInput } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
  noContentResponse,
} from "@/lib/api-utils";
import { withAdmin } from "@/lib/admin-middleware";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

type RouteContext = { params?: Promise<Record<string, string>> } | undefined;

/**
 * GET /api/v1/admin/users/[id]
 * Get a user by ID (admin-only)
 */
async function handleGet(
  _request: AuthenticatedRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const { id } = await context!.params!;

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
 * PATCH /api/v1/admin/users/[id]
 * Update a user (admin-only)
 */
async function handlePatch(
  request: AuthenticatedRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const { id } = await context!.params!;

  const idResult = userIdParamSchema.safeParse({ id });
  if (!idResult.success) {
    return validationErrorResponse(idResult.error.issues);
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    return notFoundResponse("User not found");
  }

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

  const data = result.data as UpdateUserSchemaInput;

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
 * DELETE /api/v1/admin/users/[id]
 * Delete a user (admin-only)
 */
async function handleDelete(
  _request: AuthenticatedRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const { id } = await context!.params!;

  const idResult = userIdParamSchema.safeParse({ id });
  if (!idResult.success) {
    return validationErrorResponse(idResult.error.issues);
  }

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

export const GET = withAdmin(handleGet);
export const PATCH = withAdmin(handlePatch);
export const DELETE = withAdmin(handleDelete);
