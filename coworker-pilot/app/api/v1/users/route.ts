import { NextRequest } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { createUserSchema } from "@coworker/shared-services";
import type { CreateUserInput } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  conflictResponse,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/users
 * List all users
 */
export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return successResponse(users);
}

/**
 * POST /api/v1/users
 * Create a new user
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
