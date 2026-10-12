import { NextResponse } from "next/server";
import prisma from "@bot/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("Dashboard health check failed:", error);
    return NextResponse.json(
      { status: "unavailable", database: "unavailable" },
      { status: 503 }
    );
  }
}
