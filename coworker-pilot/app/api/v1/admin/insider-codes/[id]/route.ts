import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { updateInsiderCodeSchema } from "@coworker/shared-services";
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

/**
 * GET /api/v1/admin/insider-codes/:id
 * Get a single insider code with activation count (admin only)
 */
async function handleGet(
  _request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    return notFoundResponse("Insider code ID required");
  }

  const code = await prisma.insiderCode.findUnique({
    where: { id },
    include: {
      _count: {
        select: { activations: true },
      },
    },
  });

  if (!code) {
    return notFoundResponse("Insider code not found");
  }

  const { _count, ...rest } = code;
  return successResponse({ ...rest, activationCount: _count.activations });
}

/**
 * PATCH /api/v1/admin/insider-codes/:id
 * Update an insider code (admin only)
 */
async function handlePatch(
  request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    return notFoundResponse("Insider code ID required");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  const result = updateInsiderCodeSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data;

  const existing = await prisma.insiderCode.findUnique({
    where: { id },
  });

  if (!existing) {
    return notFoundResponse("Insider code not found");
  }

  // Check for code uniqueness if code is being changed
  if (data.code && data.code !== existing.code) {
    const conflicting = await prisma.insiderCode.findUnique({
      where: { code: data.code },
    });

    if (conflicting) {
      return conflictResponse("An insider code with this value already exists");
    }
  }

  const updateData: Parameters<typeof prisma.insiderCode.update>[0]["data"] =
    {};

  if (data.code !== undefined) updateData.code = data.code;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.insiderCode.update({
    where: { id },
    data: updateData,
  });

  return successResponse(updated);
}

/**
 * DELETE /api/v1/admin/insider-codes/:id
 * Delete an insider code (admin only, cascade deletes activations)
 */
async function handleDelete(
  _request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    return notFoundResponse("Insider code ID required");
  }

  const code = await prisma.insiderCode.findUnique({
    where: { id },
  });

  if (!code) {
    return notFoundResponse("Insider code not found");
  }

  await prisma.insiderCode.delete({
    where: { id },
  });

  return noContentResponse();
}

export const GET = withAdmin(handleGet);
export const PATCH = withAdmin(handlePatch);
export const DELETE = withAdmin(handleDelete);
