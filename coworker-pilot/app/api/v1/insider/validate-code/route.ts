import { NextRequest } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { validateInsiderCodeSchema } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/insider/validate-code
 * Validate that an insider code exists and is active (public)
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  const result = validateInsiderCodeSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const insiderCode = await prisma.insiderCode.findUnique({
    where: { code: result.data.code },
  });

  if (!insiderCode || !insiderCode.isActive) {
    return notFoundResponse(
      "This code isn't valid. Double-check and try again."
    );
  }

  return successResponse({ valid: true });
}
