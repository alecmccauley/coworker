import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";
import { createUserSchema } from "@coworker/shared-services";
import type { PromoteUserResponse } from "@coworker/shared-services";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { withMachineKey } from "@/lib/machine-key-middleware";

export const dynamic = "force-dynamic";

const PROMOTE_USER_ENV = "PROMOTE_USER";
type PromoteUserResponseUser = PromoteUserResponse["user"];

function getPromoteUserEmail(): string | null {
  const rawEmail = process.env[PROMOTE_USER_ENV];
  if (!rawEmail) {
    return null;
  }
  const normalizedEmail = rawEmail.trim().toLowerCase();
  return normalizedEmail.length > 0 ? normalizedEmail : null;
}

function mapUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
}): PromoteUserResponseUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

/**
 * POST /api/v1/promote
 * Create the PROMOTE_USER if missing (machine key required)
 */
async function handlePost(_request: NextRequest): Promise<NextResponse> {
  const email = getPromoteUserEmail();

  if (!email) {
    return errorResponse(`${PROMOTE_USER_ENV} is not configured`, 500);
  }

  const emailResult = createUserSchema.pick({ email: true }).safeParse({ email });
  if (!emailResult.success) {
    return errorResponse(`${PROMOTE_USER_ENV} is invalid`, 500);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (existingUser) {
    const data: PromoteUserResponse = {
      created: false,
      user: mapUserResponse(existingUser),
    };
    return successResponse(data);
  }

  const createdUser = await prisma.user.create({
    data: { email },
    select: { id: true, email: true, name: true },
  });

  const data: PromoteUserResponse = {
    created: true,
    user: mapUserResponse(createdUser),
  };

  return successResponse(data, 201);
}

export const POST = withMachineKey(handlePost);
