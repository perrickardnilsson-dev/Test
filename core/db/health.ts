import { sql } from "drizzle-orm";
import { db } from "./client";

export type DbHealth = {
  ok: boolean;
  latencyMs: number | null;
  error: string | null;
};

export async function checkDatabaseHealth(): Promise<DbHealth> {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return {
      ok: true,
      latencyMs: Date.now() - started,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: null,
      error: error instanceof Error ? error.message : "Okänt databasfel",
    };
  }
}
