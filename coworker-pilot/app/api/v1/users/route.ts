import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { createUserSchema } from "@coworker/shared-services";
import type { CreateUserInput } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  conflictResponse,
} from "@/lib/api-utils";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/users
 * List all users (requires authentication)
 */
async function handleGet(): Promise<NextResponse> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return successResponse(users);
}

/**
 * POST /api/v1/users
 * Create a new user (requires authentication)
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
  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data as CreateUserInput;

  // Check for existing user with same email
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    return conflictResponse("Email already exists");
  }

  const user = await prisma.user.create({
    data,
  });

  return successResponse(user, 201);
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
