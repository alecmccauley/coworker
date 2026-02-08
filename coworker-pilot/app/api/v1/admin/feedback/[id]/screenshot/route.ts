import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { withAdmin } from "@/lib/admin-middleware";
import { notFoundResponse } from "@/lib/api-utils";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

async function handleGet(
  _request: AuthenticatedRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    return notFoundResponse("Feedback not found");
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      screenshotBytes: true,
      screenshotMime: true,
    },
  });

  if (!feedback?.screenshotBytes) {
    return notFoundResponse("Screenshot not found");
  }

  return new NextResponse(feedback.screenshotBytes, {
    status: 200,
    headers: {
      "Content-Type": feedback.screenshotMime || "image/png",
      "Cache-Control": "private, max-age=0, no-cache",
    },
  });
}

export const GET = withAdmin(handleGet);
