import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authSchema } from "./auth-schema";

/**
 * Plattformsschema.
 * Affärstabeller tillhör respektive modul och läggs till via modulmanifestet.
 * Alla affärstabeller ska ha organizationId + RLS.
 */
export const healthProbe = pgTable("health_probe", {
  id: uuid("id").defaultRandom().primaryKey(),
  note: text("note").notNull().default("ok"),
  checkedAt: timestamp("checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Isoleringstest-tabell — bevisar att RLS stoppar läckage mellan organisationer.
 * Inte en affärstabell; endast för plattformens säkerhetstest.
 */
export const tenantSecret = pgTable("tenant_secret", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const platformSchema = {
  healthProbe,
  tenantSecret,
  ...authSchema,
};

export { authSchema };
export * from "./auth-schema";
