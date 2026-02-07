import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import {
  createAiModelSchema,
} from "@coworker/shared-services";
import type { CreateAiModelInput } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  conflictResponse,
} from "@/lib/api-utils";
import { withAdmin } from "@/lib/admin-middleware";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/models
 * List all models (admin only)
 */
async function handleGet(): Promise<NextResponse> {
  const models = await prisma.aiModel.findMany({
    orderBy: [{ isDefault: "desc" }, { title: "asc" }],
  });

  return successResponse(models);
}

/**
 * POST /api/v1/admin/models
 * Create a new model (admin only)
 */
async function handlePost(request: AuthenticatedRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  const result = createAiModelSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data as CreateAiModelInput;

  const existing = await prisma.aiModel.findUnique({
    where: { value: data.value },
  });

  if (existing) {
    return conflictResponse("Model with this value already exists");
  }

  const shouldSetDefault = Boolean(data.isDefault);
  const isActive = shouldSetDefault ? true : data.isActive ?? true;

  const model = await prisma.$transaction(async (tx) => {
    if (shouldSetDefault) {
      await tx.aiModel.updateMany({
        data: { isDefault: false },
        where: { isDefault: true },
      });
    }

    return tx.aiModel.create({
      data: {
        title: data.title,
        value: data.value,
        isActive,
        isDefault: shouldSetDefault,
      },
    });
  });

  return successResponse(model, 201);
}

export const GET = withAdmin(handleGet);
export const POST = withAdmin(handlePost);
