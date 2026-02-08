import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { withAdmin } from "@/lib/admin-middleware";
import { successResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

async function handleGet(): Promise<NextResponse> {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      type: true,
      message: true,
      canContact: true,
      includeScreenshot: true,
      screenshotSize: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  const result = feedback.map((item) => ({
    ...item,
    hasScreenshot: item.screenshotSize !== null,
  }));

  return successResponse(result);
}

export const GET = withAdmin(handleGet);
