import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { createFeedbackSchema } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
} from "@/lib/api-utils";
import { withOptionalAuth } from "@/lib/auth-middleware";
import type { NextRequest } from "next/server";
import { getAdminEmails } from "@/lib/admin-middleware";
import {
  sendFeedbackNotificationEmail,
  sendFeedbackReceiptEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

async function handlePost(
  request: NextRequest & { auth?: { userId: string; email: string } }
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  const result = createFeedbackSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data;

  if (data.includeScreenshot && !data.screenshot) {
    return validationErrorResponse([
      {
        path: ["screenshot"],
        message: "Screenshot is required when includeScreenshot is true",
        code: "custom",
      },
    ]);
  }

  let screenshotBytes: Buffer | null = null;
  if (data.includeScreenshot && data.screenshot) {
    try {
      screenshotBytes = Buffer.from(data.screenshot.dataBase64, "base64");
    } catch {
      return validationErrorResponse([
        {
          path: ["screenshot", "dataBase64"],
          message: "Screenshot data is not valid base64",
          code: "custom",
        },
      ]);
    }
  }

  try {
    const created = await prisma.feedback.create({
      data: {
        userId: request.auth?.userId ?? null,
        type: data.type,
        message: data.message,
        canContact: data.canContact,
        includeScreenshot: data.includeScreenshot,
        screenshotBytes,
        screenshotMime: data.screenshot?.mime ?? null,
        screenshotWidth: data.screenshot?.width ?? null,
        screenshotHeight: data.screenshot?.height ?? null,
        screenshotSize: data.screenshot?.byteSize ?? null,
        screenshotCapturedAt: data.screenshot?.capturedAt
          ? new Date(data.screenshot.capturedAt)
          : null,
      },
    });

    const adminEmails = getAdminEmails();
    if (adminEmails.length > 0) {
      const createdAt = new Date(created.createdAt).toISOString();
      await Promise.allSettled(
        adminEmails.map((to) =>
          sendFeedbackNotificationEmail({
            to,
            type: created.type,
            message: created.message,
            userEmail: request.auth?.email ?? null,
            canContact: created.canContact,
            includeScreenshot: created.includeScreenshot,
            createdAt,
          })
        )
      );
    }

    if (request.auth?.email) {
      const createdAt = new Date(created.createdAt).toISOString();
      await Promise.allSettled([
        sendFeedbackReceiptEmail({
          to: request.auth.email,
          type: created.type,
          message: created.message,
          canContact: created.canContact,
          includeScreenshot: created.includeScreenshot,
          createdAt,
        }),
      ]);
    }

    const { screenshotBytes: _omit, ...response } = created;
    return successResponse(response, 201);
  } catch (error) {
    console.error("[Feedback] Failed to create feedback:", error);
    return errorResponse("Failed to submit feedback");
  }
}

export const POST = withOptionalAuth(handlePost);
