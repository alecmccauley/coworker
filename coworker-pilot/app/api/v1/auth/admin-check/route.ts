import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { successResponse } from "@/lib/api-utils";
import { isAdminEmail } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/admin-check
 * Check if the authenticated user is an admin
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const isAdmin = isAdminEmail(request.auth.email);

  return successResponse({ isAdmin });
});
