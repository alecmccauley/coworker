import { NextRequest } from "next/server";
import { helloQuerySchema } from "@coworker/shared-services";
import type { HelloData } from "@coworker/shared-services";
import { successResponse, validationErrorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/hello
 * Hello world endpoint for testing API connectivity
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const nameParam = searchParams.get("name");

  // Validate with shared schema
  const result = helloQuerySchema.safeParse({
    name: nameParam ?? undefined,
  });

  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const name = result.data.name ?? "World";
  const data: HelloData = {
    message: `Hello ${name}!`,
    timestamp: new Date().toISOString(),
  };

  return successResponse(data);
}
