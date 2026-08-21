import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Plattformsschema (Fas 0).
 * Affärstabeller tillhör respektive modul och läggs till via modulmanifestet.
 * Alla affärstabeller ska ha organizationId + RLS (Fas 1).
 */
export const healthProbe = pgTable("health_probe", {
  id: uuid("id").defaultRandom().primaryKey(),
  note: text("note").notNull().default("ok"),
  checkedAt: timestamp("checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const platformSchema = {
  healthProbe,
};
