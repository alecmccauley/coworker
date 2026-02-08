import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { createInsiderCodeSchema } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  conflictResponse,
} from "@/lib/api-utils";
import { withAdmin } from "@/lib/admin-middleware";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/insider-codes
 * List all insider codes with activation count (admin only)
 */
async function handleGet(): Promise<NextResponse> {
  const codes = await prisma.insiderCode.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: { activations: true },
      },
    },
  });

  const result = codes.map(({ _count, ...code }) => ({
    ...code,
    activationCount: _count.activations,
  }));

  return successResponse(result);
}

/**
 * POST /api/v1/admin/insider-codes
 * Create a new insider code (admin only)
 */
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

  const result = createInsiderCodeSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data;

  // Check for existing code
  const existing = await prisma.insiderCode.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    return conflictResponse("An insider code with this value already exists");
  }

  const code = await prisma.insiderCode.create({
    data: {
      code: data.code,
      title: data.title,
      notes: data.notes ?? null,
      isActive: data.isActive ?? true,
    },
  });

  return successResponse(code, 201);
}

export const GET = withAdmin(handleGet);
export const POST = withAdmin(handlePost);
