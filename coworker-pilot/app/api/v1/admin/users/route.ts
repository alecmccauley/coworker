import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import {
  createUserSchema,
  listUsersQuerySchema,
} from "@coworker/shared-services";
import type { CreateUserSchemaInput } from "@coworker/shared-services";
import {
  successResponse,
  validationErrorResponse,
  conflictResponse,
} from "@/lib/api-utils";
import { withAdmin } from "@/lib/admin-middleware";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/users
 * List users with pagination and search (admin-only)
 */
async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const queryResult = listUsersQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  if (!queryResult.success) {
    return validationErrorResponse(queryResult.error.issues);
  }

  const { page, pageSize, search } = queryResult.data;
  const skip = (page - 1) * pageSize;

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return successResponse({
    users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

/**
 * POST /api/v1/admin/users
 * Create a new user (admin-only)
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

  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data as CreateUserSchemaInput;

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

export const GET = withAdmin(handleGet);
export const POST = withAdmin(handlePost);
