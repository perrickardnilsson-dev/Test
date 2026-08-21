import {
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const partTypeEnum = pgEnum("part_type", [
  "purchased",
  "manufactured",
  "phantom",
  "service",
]);

export const partStatusEnum = pgEnum("part_status", [
  "active",
  "blocked",
  "phased_out",
]);

export const lotSizingRuleEnum = pgEnum("lot_sizing_rule", [
  "lot_for_lot",
  "fixed_qty",
  "min_qty",
  "economic_order_qty",
]);

export const planningMethodEnum = pgEnum("planning_method", [
  "mrp",
  "reorder_point",
  "manual",
]);

export const traceabilityModeEnum = pgEnum("traceability_mode", [
  "none",
  "batch",
  "serial",
]);

export const partUnitEnum = pgEnum("part_unit", [
  "st",
  "kg",
  "m",
  "liter",
  "timme",
]);

/**
 * Varugrupp — hierarkisk.
 */
export const partGroup = pgTable(
  "part_group",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    parentId: uuid("parent_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    uniqueIndex("part_group_org_code_uidx").on(t.organizationId, t.code),
  ],
);

/**
 * Artikel — systemets nav.
 */
export const part = pgTable(
  "part",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    partNumber: text("part_number").notNull(),
    description: text("description").notNull(),
    unit: partUnitEnum("unit").notNull().default("st"),
    type: partTypeEnum("type").notNull().default("purchased"),
    partGroupId: uuid("part_group_id"),
    status: partStatusEnum("status").notNull().default("active"),
    standardCost: numeric("standard_cost", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    salesPrice: numeric("sales_price", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    leadTimeDays: integer("lead_time_days").notNull().default(0),
    safetyStock: numeric("safety_stock", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    reorderPoint: numeric("reorder_point", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    lotSizingRule: lotSizingRuleEnum("lot_sizing_rule")
      .notNull()
      .default("lot_for_lot"),
    lotSize: numeric("lot_size", { precision: 18, scale: 4 }),
    planningMethod: planningMethodEnum("planning_method")
      .notNull()
      .default("mrp"),
    traceabilityMode: traceabilityModeEnum("traceability_mode")
      .notNull()
      .default("none"),
    defaultLocationId: uuid("default_location_id"),
    weightKg: numeric("weight_kg", { precision: 18, scale: 4 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    uniqueIndex("part_org_number_uidx").on(t.organizationId, t.partNumber),
  ],
);

/**
 * Sparad listvy per användare/org (sök, filter, synliga kolumner).
 */
export const savedPartView = pgTable("saved_part_view", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  config: jsonb("config").notNull().$type<{
    search?: string;
    status?: string[];
    type?: string[];
    partGroupId?: string | null;
    columns?: string[];
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inventorySchema = {
  partGroup,
  part,
  savedPartView,
};
