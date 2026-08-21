import { z } from "zod";

export const partUnitSchema = z.enum(["st", "kg", "m", "liter", "timme"]);
export const partTypeSchema = z.enum([
  "purchased",
  "manufactured",
  "phantom",
  "service",
]);
export const partStatusSchema = z.enum(["active", "blocked", "phased_out"]);
export const lotSizingRuleSchema = z.enum([
  "lot_for_lot",
  "fixed_qty",
  "min_qty",
  "economic_order_qty",
]);
export const planningMethodSchema = z.enum([
  "mrp",
  "reorder_point",
  "manual",
]);
export const traceabilityModeSchema = z.enum(["none", "batch", "serial"]);

/** Fyra fält synliga vid skapande — progressiv avslöjning. */
export const createPartBasicSchema = z.object({
  partNumber: z
    .string()
    .trim()
    .min(1, "Artikelnummer krävs")
    .max(64, "Max 64 tecken"),
  description: z
    .string()
    .trim()
    .min(1, "Benämning krävs")
    .max(200, "Max 200 tecken"),
  unit: partUnitSchema.default("st"),
  type: partTypeSchema.default("purchased"),
});

export const partSettingsSchema = z.object({
  partGroupId: z.string().uuid().nullable().optional(),
  status: partStatusSchema.default("active"),
  standardCost: z.coerce.number().nonnegative().default(0),
  salesPrice: z.coerce.number().nonnegative().default(0),
  leadTimeDays: z.coerce.number().int().nonnegative().default(0),
  safetyStock: z.coerce.number().nonnegative().default(0),
  reorderPoint: z.coerce.number().nonnegative().default(0),
  lotSizingRule: lotSizingRuleSchema.default("lot_for_lot"),
  lotSize: z.coerce.number().positive().nullable().optional(),
  planningMethod: planningMethodSchema.default("mrp"),
  traceabilityMode: traceabilityModeSchema.default("none"),
  weightKg: z.coerce.number().nonnegative().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const createPartSchema = createPartBasicSchema.merge(partSettingsSchema);
export const updatePartSchema = createPartSchema.partial().extend({
  id: z.string().uuid(),
});

export const createPartGroupSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(120),
  parentId: z.string().uuid().nullable().optional(),
});

export const updatePartGroupSchema = createPartGroupSchema.partial().extend({
  id: z.string().uuid(),
});

export const partListFilterSchema = z.object({
  search: z.string().optional().default(""),
  status: z.array(partStatusSchema).optional(),
  type: z.array(partTypeSchema).optional(),
  partGroupId: z.string().uuid().nullable().optional(),
});

export const savedViewConfigSchema = z.object({
  search: z.string().optional(),
  status: z.array(partStatusSchema).optional(),
  type: z.array(partTypeSchema).optional(),
  partGroupId: z.string().uuid().nullable().optional(),
  columns: z.array(z.string()).optional(),
});

export const savePartViewSchema = z.object({
  name: z.string().trim().min(1).max(80),
  config: savedViewConfigSchema,
});

export type CreatePartInput = z.infer<typeof createPartSchema>;
export type UpdatePartInput = z.infer<typeof updatePartSchema>;
export type PartListFilter = z.infer<typeof partListFilterSchema>;
export type CreatePartGroupInput = z.infer<typeof createPartGroupSchema>;

export const PART_TYPE_LABELS: Record<z.infer<typeof partTypeSchema>, string> = {
  purchased: "Köpt",
  manufactured: "Tillverkad",
  phantom: "Fantom",
  service: "Tjänst",
};

export const PART_STATUS_LABELS: Record<
  z.infer<typeof partStatusSchema>,
  string
> = {
  active: "Aktiv",
  blocked: "Spärrad",
  phased_out: "Utgående",
};

export const PART_UNIT_LABELS: Record<z.infer<typeof partUnitSchema>, string> = {
  st: "st",
  kg: "kg",
  m: "m",
  liter: "liter",
  timme: "timme",
};
