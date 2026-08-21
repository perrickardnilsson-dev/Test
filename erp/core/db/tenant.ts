import { sql } from "drizzle-orm";
import { db, type Db } from "./client";

/**
 * Tenant-scopad databasåtkomst.
 * Sätter app.current_org för RLS (SET LOCAL via set_config(..., true)).
 * All modulkod ska gå via denna funktion.
 */
export async function getTenantDb(
  organizationId: string,
  fn: (tx: Db) => Promise<void> | void,
): Promise<void>;
export async function getTenantDb<T>(
  organizationId: string,
  fn: (tx: Db) => Promise<T> | T,
): Promise<T>;
export async function getTenantDb<T>(
  organizationId: string,
  fn: (tx: Db) => Promise<T> | T,
): Promise<T> {
  if (!organizationId) {
    throw new Error("getTenantDb kräver organizationId");
  }

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_org', ${organizationId}, true)`,
    );
    return fn(tx as unknown as Db);
  });
}

export type { Db };
