import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@coworker/shared-services/db";
import { successResponse, notFoundResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  // Get the full user from the database
  const user = await prisma.user.findUnique({
    where: { id: request.auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return notFoundResponse("User not found");
  }

  return successResponse(user);
}

export const GET = withAuth(handleGet);
