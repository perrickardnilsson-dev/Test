import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { tenantSecret } from "@/core/db/schema";
import { getTenantDb } from "@/core/db/tenant";
import { db } from "@/core/db/client";

const hasDb = Boolean(process.env.DATABASE_URL ?? process.env.RUN_DB_TESTS);

/**
 * Bevisar att RLS + getTenantDb isolerar organisationer.
 * Kräver Postgres med migration 0001 (körs lokalt via docker compose).
 */
describe.runIf(hasDb)("tenant-isolering (RLS)", () => {
  it("organisation A kan inte läsa organisation B:s rader", async () => {
    const orgA = "org-a-test";
    const orgB = "org-b-test";

    await db.execute(sql`delete from tenant_secret where label like 'rls-%'`);

    await getTenantDb(orgA, async (tx) => {
      await tx.insert(tenantSecret).values({
        organizationId: orgA,
        label: "rls-secret-a",
      });
    });

    await getTenantDb(orgB, async (tx) => {
      await tx.insert(tenantSecret).values({
        organizationId: orgB,
        label: "rls-secret-b",
      });
    });

    const fromA = await getTenantDb(orgA, async (tx) => {
      return tx.select().from(tenantSecret);
    });

    const fromB = await getTenantDb(orgB, async (tx) => {
      return tx.select().from(tenantSecret);
    });

    // Medvetet trasig query utan where — RLS ska ändå filtrera
    expect(fromA.every((r) => r.organizationId === orgA)).toBe(true);
    expect(fromB.every((r) => r.organizationId === orgB)).toBe(true);
    expect(fromA.some((r) => r.label === "rls-secret-b")).toBe(false);
    expect(fromB.some((r) => r.label === "rls-secret-a")).toBe(false);
  });
});
