import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { createCoworkerTemplateSchema } from "@coworker/shared-services";
import type { CreateCoworkerTemplateInput } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  conflictResponse,
} from "@/lib/api-utils";
import { withAdmin } from "@/lib/admin-middleware";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/templates
 * List all templates including unpublished (admin only)
 */
async function handleGet(): Promise<NextResponse> {
  const templates = await prisma.coworkerTemplate.findMany({
    orderBy: [{ isPublished: "desc" }, { name: "asc" }],
  });

  return successResponse(templates);
}

/**
 * POST /api/v1/admin/templates
 * Create a new coworker template (admin only)
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

  // Validate with shared schema
  const result = createCoworkerTemplateSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data as CreateCoworkerTemplateInput;

  // Check for existing template with same slug
  const existingTemplate = await prisma.coworkerTemplate.findUnique({
    where: { slug: data.slug },
  });

  if (existingTemplate) {
    return conflictResponse("Template with this slug already exists");
  }

  const template = await prisma.coworkerTemplate.create({
    data: {
      slug: data.slug,
      name: data.name,
      description: data.description,
      rolePrompt: data.rolePrompt,
      defaultBehaviorsJson: data.defaultBehaviors
        ? JSON.stringify(data.defaultBehaviors)
        : null,
      defaultToolsPolicyJson: data.defaultToolsPolicy
        ? JSON.stringify(data.defaultToolsPolicy)
        : null,
      modelRoutingPolicyJson: data.modelRoutingPolicy
        ? JSON.stringify(data.modelRoutingPolicy)
        : null,
      isPublished: data.isPublished ?? false,
    },
  });

  return successResponse(template, 201);
}

export const GET = withAdmin(handleGet);
export const POST = withAdmin(handlePost);
