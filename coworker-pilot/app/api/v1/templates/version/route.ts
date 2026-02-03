import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import type { TemplateVersionInfo } from "@coworker/shared-services";
import { successResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/templates/version
 * Get template version info for sync checking (public endpoint)
 */
export async function GET(): Promise<NextResponse> {
  const [count, latestTemplate] = await Promise.all([
    prisma.coworkerTemplate.count({
      where: { isPublished: true },
    }),
    prisma.coworkerTemplate.findFirst({
      where: { isPublished: true },
      orderBy: { updatedAt: "desc" },
      select: {
        version: true,
        updatedAt: true,
      },
    }),
  ]);

  const versionInfo: TemplateVersionInfo = {
    latestVersion: latestTemplate?.version ?? 0,
    templateCount: count,
    lastUpdated: latestTemplate?.updatedAt ?? new Date(0),
  };

  return successResponse(versionInfo);
}
