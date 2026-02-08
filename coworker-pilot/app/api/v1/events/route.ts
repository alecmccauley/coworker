import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { trackEventSchema } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
} from "@/lib/api-utils";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { sendFirstWorkspaceEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function handlePost(
  request: AuthenticatedRequest
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  const result = trackEventSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  try {
    const event = await prisma.event.create({
      data: {
        type: result.data.type,
        userId: request.auth.userId,
        details: result.data.details ?? undefined,
      },
    });

    // Fire-and-forget: send welcome email on first workspace creation
    if (result.data.type === "workspace.created") {
      prisma.event
        .count({ where: { type: "workspace.created", userId: request.auth.userId } })
        .then(async (count) => {
          if (count !== 1) return; // Not their first — skip
          const user = await prisma.user.findUnique({
            where: { id: request.auth.userId },
            select: { name: true },
          });
          const displayName = user?.name ?? request.auth.email;
          const workspaceName =
            (result.data.details as Record<string, unknown> | undefined)
              ?.workspaceName as string | undefined;
          await sendFirstWorkspaceEmail(
            request.auth.email, displayName, workspaceName ?? "your workspace"
          );
        })
        .catch((error) =>
          console.error("[Events] Failed to send first workspace email:", error)
        );
    }

    return successResponse(event, 201);
  } catch (error) {
    console.error("[Events] Failed to create event:", error);
    return errorResponse("Failed to track event");
  }
}

export const POST = withAuth(handlePost);
