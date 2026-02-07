import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import {
  aiModelIdParamSchema,
  updateAiModelSchema,
} from "@coworker/shared-services";
import type { UpdateAiModelInput } from "@coworker/shared-services";
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

async function resolveModelId(
  context?: { params?: Promise<Record<string, string>> },
): Promise<string | null> {
  const params = await context?.params;
  const id = params?.id;
  if (!id) return null;
  const parsed = aiModelIdParamSchema.safeParse({ id });
  if (!parsed.success) return null;
  return parsed.data.id;
}

/**
 * GET /api/v1/admin/models/:id
 * Get a model by ID (admin only)
 */
async function handleGet(
  _request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> },
): Promise<NextResponse> {
  const id = await resolveModelId(context);
  if (!id) {
    return notFoundResponse("Model ID required");
  }

  const model = await prisma.aiModel.findUnique({ where: { id } });
  if (!model) {
    return notFoundResponse("Model not found");
  }

  return successResponse(model);
}

/**
 * PATCH /api/v1/admin/models/:id
 * Update a model (admin only)
 */
async function handlePatch(
  request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> },
): Promise<NextResponse> {
  const id = await resolveModelId(context);
  if (!id) {
    return notFoundResponse("Model ID required");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  const result = updateAiModelSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data as UpdateAiModelInput;

  const existing = await prisma.aiModel.findUnique({ where: { id } });
  if (!existing) {
    return notFoundResponse("Model not found");
  }

  if (data.value && data.value !== existing.value) {
    const conflict = await prisma.aiModel.findUnique({
      where: { value: data.value },
    });
    if (conflict) {
      return conflictResponse("Model with this value already exists");
    }
  }

  const willSetDefault = data.isDefault === true;
  const willUnsetDefault = data.isDefault === false;
  const willDeactivate = data.isActive === false;

  if (existing.isDefault && (willUnsetDefault || willDeactivate)) {
    const otherDefault = await prisma.aiModel.findFirst({
      where: { isDefault: true, NOT: { id } },
      select: { id: true },
    });
    if (!otherDefault) {
      return conflictResponse("A default model is required");
    }
  }

  const updateData: Parameters<typeof prisma.aiModel.update>[0]["data"] = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

  const model = await prisma.$transaction(async (tx) => {
    if (willSetDefault) {
      await tx.aiModel.updateMany({
        data: { isDefault: false },
        where: { isDefault: true },
      });
      updateData.isActive = true;
      updateData.isDefault = true;
    }

    return tx.aiModel.update({
      where: { id },
      data: updateData,
    });
  });

  return successResponse(model);
}

/**
 * DELETE /api/v1/admin/models/:id
 * Delete a model (admin only)
 */
async function handleDelete(
  _request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> },
): Promise<NextResponse> {
  const id = await resolveModelId(context);
  if (!id) {
    return notFoundResponse("Model ID required");
  }

  const existing = await prisma.aiModel.findUnique({ where: { id } });
  if (!existing) {
    return notFoundResponse("Model not found");
  }

  if (existing.isDefault) {
    const otherDefault = await prisma.aiModel.findFirst({
      where: { isDefault: true, NOT: { id } },
      select: { id: true },
    });
    if (!otherDefault) {
      return conflictResponse("A default model is required");
    }
  }

  await prisma.aiModel.delete({ where: { id } });
  return noContentResponse();
}

export const GET = withAdmin(handleGet);
export const PATCH = withAdmin(handlePatch);
export const DELETE = withAdmin(handleDelete);
