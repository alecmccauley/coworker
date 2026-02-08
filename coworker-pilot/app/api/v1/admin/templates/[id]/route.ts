import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { updateCoworkerTemplateSchema } from "@coworker/shared-services";
import type { UpdateCoworkerTemplateInput } from "@coworker/shared-services";
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
 * GET /api/v1/admin/templates/:id
 * Get a template by ID including unpublished (admin only)
 */
async function handleGet(
  _request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    return notFoundResponse("Template ID required");
  }

  const template = await prisma.coworkerTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return notFoundResponse("Template not found");
  }

  return successResponse(template);
}

/**
 * PATCH /api/v1/admin/templates/:id
 * Update a template (admin only)
 */
async function handlePatch(
  request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    return notFoundResponse("Template ID required");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  // Validate with shared schema
  const result = updateCoworkerTemplateSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data as UpdateCoworkerTemplateInput;

  // Check if template exists
  const existingTemplate = await prisma.coworkerTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate) {
    return notFoundResponse("Template not found");
  }

  // Check for slug conflict if slug is being changed
  if (data.slug && data.slug !== existingTemplate.slug) {
    const conflictingTemplate = await prisma.coworkerTemplate.findUnique({
      where: { slug: data.slug },
    });

    if (conflictingTemplate) {
      return conflictResponse("Template with this slug already exists");
    }
  }

  // Build update data
  const updateData: Parameters<typeof prisma.coworkerTemplate.update>[0]["data"] = {
    version: { increment: 1 }, // Always increment version on update
  };

  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.shortDescription !== undefined)
    updateData.shortDescription = data.shortDescription;
  if (data.rolePrompt !== undefined) updateData.rolePrompt = data.rolePrompt;
  if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

  if (data.defaultBehaviors !== undefined) {
    updateData.defaultBehaviorsJson = data.defaultBehaviors
      ? JSON.stringify(data.defaultBehaviors)
      : null;
  }

  if (data.defaultToolsPolicy !== undefined) {
    updateData.defaultToolsPolicyJson = data.defaultToolsPolicy
      ? JSON.stringify(data.defaultToolsPolicy)
      : null;
  }

  if (data.modelRoutingPolicy !== undefined) {
    updateData.modelRoutingPolicyJson = data.modelRoutingPolicy
      ? JSON.stringify(data.modelRoutingPolicy)
      : null;
  }

  if (data.model !== undefined) {
    updateData.model = data.model ?? null;
  }

  const template = await prisma.coworkerTemplate.update({
    where: { id },
    data: updateData,
  });

  return successResponse(template);
}

/**
 * DELETE /api/v1/admin/templates/:id
 * Delete a template (admin only)
 */
async function handleDelete(
  _request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    return notFoundResponse("Template ID required");
  }

  const template = await prisma.coworkerTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return notFoundResponse("Template not found");
  }

  await prisma.coworkerTemplate.delete({
    where: { id },
  });

  return noContentResponse();
}

export const GET = withAdmin(handleGet);
export const PATCH = withAdmin(handlePatch);
export const DELETE = withAdmin(handleDelete);
