import { NextResponse } from "next/server";
import { prisma } from "@coworker/shared-services/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await prisma.user.count();

  return NextResponse.json({ status: "ok", users });
}
