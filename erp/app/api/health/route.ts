import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/core/db/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = await checkDatabaseHealth();
  // Liveness: return 200 when the process is up (Railway/Fly healthchecks).
  // Database status is still reported in the JSON body.
  return NextResponse.json(
    {
      status: database.ok ? "ok" : "degraded",
      app: "ok",
      database,
      phase: 1,
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
