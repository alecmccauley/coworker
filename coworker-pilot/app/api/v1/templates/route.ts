import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import type { CoworkerTemplatePublic, CoworkerDefaultBehaviors, CoworkerToolsPolicy } from "@coworker/shared-services";
import { successResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * Transform a database template to the public view (excludes internal routing policy)
 */
function toPublicTemplate(template: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rolePrompt: string;
  defaultBehaviorsJson: string | null;
  defaultToolsPolicyJson: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): CoworkerTemplatePublic {
  let defaultBehaviors: CoworkerDefaultBehaviors | null = null;
  let defaultToolsPolicy: CoworkerToolsPolicy | null = null;

  if (template.defaultBehaviorsJson) {
    try {
      defaultBehaviors = JSON.parse(template.defaultBehaviorsJson) as CoworkerDefaultBehaviors;
    } catch {
      // Invalid JSON, keep as null
    }
  }

  if (template.defaultToolsPolicyJson) {
    try {
      defaultToolsPolicy = JSON.parse(template.defaultToolsPolicyJson) as CoworkerToolsPolicy;
    } catch {
      // Invalid JSON, keep as null
    }
  }

  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    rolePrompt: template.rolePrompt,
    defaultBehaviors,
    defaultToolsPolicy,
    version: template.version,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/**
 * GET /api/v1/templates
 * List all published coworker templates (public endpoint)
 */
export async function GET(): Promise<NextResponse> {
  const templates = await prisma.coworkerTemplate.findMany({
    where: { isPublished: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      rolePrompt: true,
      defaultBehaviorsJson: true,
      defaultToolsPolicyJson: true,
      version: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const publicTemplates = templates.map(toPublicTemplate);
  return successResponse(publicTemplates);
}
