import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
    /** Djupaste BOM-nivå; beräknas vid strukturändring / NBK. */
    lowLevelCode: integer("low_level_code").notNull().default(0),
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

export const bomStatusEnum = pgEnum("bom_status", [
  "draft",
  "active",
  "obsolete",
]);

/**
 * Artikelstruktur (BOM) — hör till en tillverkad/fantom-artikel.
 */
export const bom = pgTable(
  "bom",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    parentPartId: uuid("parent_part_id").notNull(),
    revision: text("revision").notNull().default("A"),
    validFrom: timestamp("valid_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: bomStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    uniqueIndex("bom_org_parent_revision_uidx").on(
      t.organizationId,
      t.parentPartId,
      t.revision,
    ),
    index("bom_parent_idx").on(t.parentPartId),
  ],
);

/**
 * BOM-rad — komponent i en struktur.
 */
export const bomLine = pgTable(
  "bom_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    bomId: uuid("bom_id").notNull(),
    componentPartId: uuid("component_part_id").notNull(),
    quantityPer: numeric("quantity_per", { precision: 18, scale: 4 })
      .notNull()
      .default("1"),
    scrapPercent: numeric("scrap_percent", { precision: 8, scale: 4 })
      .notNull()
      .default("0"),
    position: integer("position").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("bom_line_bom_component_uidx").on(t.bomId, t.componentPartId),
    index("bom_line_component_idx").on(t.componentPartId),
  ],
);

export const demandSourceTypeEnum = pgEnum("demand_source_type", [
  "customer_order",
  "forecast",
  "dependent",
  "manual",
]);

export const supplySourceTypeEnum = pgEnum("supply_source_type", [
  "purchase_order",
  "manufacturing_order",
  "stock",
  "manual",
]);

export const planningLineStatusEnum = pgEnum("planning_line_status", [
  "open",
  "closed",
  "cancelled",
]);

/**
 * Generiskt tidsatt behov — så MRP fungerar innan Sälj-modulen finns.
 */
export const demandLine = pgTable(
  "demand_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    partId: uuid("part_id").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    sourceType: demandSourceTypeEnum("source_type").notNull().default("manual"),
    sourceId: text("source_id"),
    status: planningLineStatusEnum("status").notNull().default("open"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    index("demand_line_part_idx").on(t.partId),
    index("demand_line_due_idx").on(t.dueDate),
    index("demand_line_org_idx").on(t.organizationId),
  ],
);

/**
 * Generisk tidsatt tillgång — öppna IO/TO innan Inköp/Tillverkning finns.
 */
export const supplyLine = pgTable(
  "supply_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    partId: uuid("part_id").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    sourceType: supplySourceTypeEnum("source_type").notNull().default("manual"),
    sourceId: text("source_id"),
    status: planningLineStatusEnum("status").notNull().default("open"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    index("supply_line_part_idx").on(t.partId),
    index("supply_line_due_idx").on(t.dueDate),
    index("supply_line_org_idx").on(t.organizationId),
  ],
);

export const netRequirementRunStatusEnum = pgEnum("net_requirement_run_status", [
  "running",
  "completed",
  "failed",
]);

/**
 * En nettobehovskörning (NBK / MRP-run).
 */
export const netRequirementRun = pgTable(
  "net_requirement_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    asOfDate: timestamp("as_of_date", { withTimezone: true }).notNull(),
    status: netRequirementRunStatusEnum("status").notNull().default("running"),
    message: text("message"),
    suggestionCount: integer("suggestion_count").notNull().default(0),
    createdBy: text("created_by"),
  },
  (t) => [index("net_requirement_run_org_idx").on(t.organizationId)],
);

export const suggestionTypeEnum = pgEnum("suggestion_type", [
  "purchase",
  "manufacture",
]);

export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "open",
  "accepted",
  "rejected",
]);

/**
 * Planeringsförslag från en NBK, med pegging (varför).
 */
export const planningSuggestion = pgTable(
  "planning_suggestion",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    runId: uuid("run_id").notNull(),
    partId: uuid("part_id").notNull(),
    suggestionType: suggestionTypeEnum("suggestion_type").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    orderDate: timestamp("order_date", { withTimezone: true }).notNull(),
    isLate: boolean("is_late").notNull().default(false),
    status: suggestionStatusEnum("status").notNull().default("open"),
    pegging: jsonb("pegging")
      .notNull()
      .$type<
        Array<{
          demandSourceType: string;
          demandSourceId: string | null;
          demandQuantity: number;
          demandDueDate: string;
          explanation: string;
        }>
      >()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("planning_suggestion_run_idx").on(t.runId),
    index("planning_suggestion_part_idx").on(t.partId),
    index("planning_suggestion_org_idx").on(t.organizationId),
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

export const locationTypeEnum = pgEnum("location_type", [
  "picking",
  "bulk",
  "quarantine",
  "wip",
]);

export const stockTransactionTypeEnum = pgEnum("stock_transaction_type", [
  "receipt",
  "issue",
  "transfer",
  "adjustment",
  "count",
  "scrap",
]);

export const stockReferenceTypeEnum = pgEnum("stock_reference_type", [
  "purchase_order",
  "manufacturing_order",
  "customer_order",
  "manual",
  "count",
]);

/**
 * Lagerställe — fysisk lagerbyggnad/enhet.
 */
export const warehouse = pgTable(
  "warehouse",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    allowNegativeStock: boolean("allow_negative_stock").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    uniqueIndex("warehouse_org_code_uidx").on(t.organizationId, t.code),
  ],
);

/**
 * Lagerplats — hylla/plats inom ett lagerställe.
 */
export const stockLocation = pgTable(
  "stock_location",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    warehouseId: uuid("warehouse_id").notNull(),
    code: text("code").notNull(),
    name: text("name"),
    zone: text("zone"),
    pickSequence: integer("pick_sequence").notNull().default(0),
    type: locationTypeEnum("type").notNull().default("picking"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    uniqueIndex("stock_location_org_wh_code_uidx").on(
      t.organizationId,
      t.warehouseId,
      t.code,
    ),
    index("stock_location_warehouse_idx").on(t.warehouseId),
  ],
);

export const batchStatusEnum = pgEnum("batch_status", [
  "available",
  "quarantine",
  "blocked",
]);

export const serialUnitStatusEnum = pgEnum("serial_unit_status", [
  "available",
  "quarantine",
  "blocked",
  "consumed",
  "shipped",
]);

/**
 * Batch / charge — grupp av enheter med gemensamt ursprung.
 */
export const batch = pgTable(
  "batch",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    partId: uuid("part_id").notNull(),
    batchNumber: text("batch_number").notNull(),
    supplierBatchNumber: text("supplier_batch_number"),
    productionDate: timestamp("production_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    certificateRef: text("certificate_ref"),
    status: batchStatusEnum("status").notNull().default("available"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    uniqueIndex("batch_org_part_number_uidx").on(
      t.organizationId,
      t.partId,
      t.batchNumber,
    ),
    index("batch_part_idx").on(t.partId),
  ],
);

/**
 * Individ / serienummer — enskild spårad enhet.
 */
export const serialUnit = pgTable(
  "serial_unit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    partId: uuid("part_id").notNull(),
    serialNumber: text("serial_number").notNull(),
    batchId: uuid("batch_id"),
    status: serialUnitStatusEnum("status").notNull().default("available"),
    currentLocationId: uuid("current_location_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    uniqueIndex("serial_unit_org_part_number_uidx").on(
      t.organizationId,
      t.partId,
      t.serialNumber,
    ),
    index("serial_unit_part_idx").on(t.partId),
    index("serial_unit_batch_idx").on(t.batchId),
  ],
);

/**
 * Genealogikant — spårbarhetsgrafen (förbrukad → producerad).
 */
export const genealogyEdge = pgTable(
  "genealogy_edge",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    consumedBatchId: uuid("consumed_batch_id"),
    consumedSerialId: uuid("consumed_serial_id"),
    producedBatchId: uuid("produced_batch_id"),
    producedSerialId: uuid("produced_serial_id"),
    quantity: numeric("quantity", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    manufacturingOrderRef: text("manufacturing_order_ref"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    index("genealogy_edge_consumed_batch_idx").on(t.consumedBatchId),
    index("genealogy_edge_produced_batch_idx").on(t.producedBatchId),
    index("genealogy_edge_org_idx").on(t.organizationId),
  ],
);

/**
 * Lagersaldo — materialiserad; uppdateras enbart via postStockTransaction.
 * Unik per artikel + plats + batch (null-batch via coalesce).
 */
export const stockBalance = pgTable(
  "stock_balance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    partId: uuid("part_id").notNull(),
    locationId: uuid("location_id").notNull(),
    batchId: uuid("batch_id"),
    quantity: numeric("quantity", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    reservedQuantity: numeric("reserved_quantity", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    averageCost: numeric("average_cost", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("stock_balance_org_part_loc_batch_uidx").on(
      t.organizationId,
      t.partId,
      t.locationId,
      sql`coalesce(${t.batchId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
    ),
    index("stock_balance_part_idx").on(t.partId),
    index("stock_balance_location_idx").on(t.locationId),
    index("stock_balance_batch_idx").on(t.batchId),
  ],
);

/**
 * Lagertransaktion — oföränderlig huvudbok. Raderas/ändras aldrig.
 */
export const stockTransaction = pgTable(
  "stock_transaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    type: stockTransactionTypeEnum("type").notNull(),
    partId: uuid("part_id").notNull(),
    /** Tecken avgör riktning: + in, − ut. Flytt använder positiv qty + from/to. */
    quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(),
    fromLocationId: uuid("from_location_id"),
    toLocationId: uuid("to_location_id"),
    batchId: uuid("batch_id"),
    serialUnitId: uuid("serial_unit_id"),
    unitCost: numeric("unit_cost", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    referenceType: stockReferenceTypeEnum("reference_type")
      .notNull()
      .default("manual"),
    referenceId: text("reference_id"),
    postedAt: timestamp("posted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    postedBy: text("posted_by"),
    note: text("note"),
  },
  (t) => [
    index("stock_transaction_part_idx").on(t.partId),
    index("stock_transaction_posted_idx").on(t.postedAt),
    index("stock_transaction_org_idx").on(t.organizationId),
  ],
);

export const inventorySchema = {
  partGroup,
  part,
  savedPartView,
  warehouse,
  stockLocation,
  batch,
  serialUnit,
  genealogyEdge,
  stockBalance,
  stockTransaction,
  bom,
  bomLine,
  demandLine,
  supplyLine,
  netRequirementRun,
  planningSuggestion,
};
