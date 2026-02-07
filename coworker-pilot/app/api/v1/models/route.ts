import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import type { AiModelPublic } from "@coworker/shared-services";
import { successResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

function toPublicModel(model: {
  id: string;
  title: string;
  value: string;
  isDefault: boolean;
}): AiModelPublic {
  return {
    id: model.id,
    title: model.title,
    value: model.value,
    isDefault: model.isDefault,
  };
}

/**
 * GET /api/v1/models
 * List all active models (public endpoint)
 */
export async function GET(): Promise<NextResponse> {
  const models = await prisma.aiModel.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      value: true,
      isDefault: true,
    },
  });

  return successResponse(models.map(toPublicModel));
}
