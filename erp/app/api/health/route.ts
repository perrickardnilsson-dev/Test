import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/core/db/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = await checkDatabaseHealth();
  const status = database.ok ? 200 : 503;

  return NextResponse.json(
    {
      status: database.ok ? "ok" : "degraded",
      app: "ok",
      database,
      phase: 1,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}
