import { z } from "zod";

export const locationTypeSchema = z.enum([
  "picking",
  "bulk",
  "quarantine",
  "wip",
]);

export const stockTransactionTypeSchema = z.enum([
  "receipt",
  "issue",
  "transfer",
  "adjustment",
  "count",
  "scrap",
]);

export const stockReferenceTypeSchema = z.enum([
  "purchase_order",
  "manufacturing_order",
  "customer_order",
  "manual",
  "count",
]);

export const createWarehouseSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(120),
  allowNegativeStock: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  id: z.string().uuid(),
});

export const createStockLocationSchema = z.object({
  warehouseId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().max(120).nullable().optional(),
  zone: z.string().trim().max(64).nullable().optional(),
  pickSequence: z.coerce.number().int().nonnegative().default(0),
  type: locationTypeSchema.default("picking"),
  isActive: z.boolean().default(true),
});

export const updateStockLocationSchema = createStockLocationSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  });

/** Manuell inleverans — positiv qty till plats. */
export const manualReceiptSchema = z.object({
  partId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.coerce.number().positive("Antal måste vara > 0"),
  unitCost: z.coerce.number().nonnegative().default(0),
  /** Befintlig batch, eller skapa via batchNumber. */
  batchId: z.string().uuid().nullable().optional(),
  batchNumber: z.string().trim().min(1).max(64).nullable().optional(),
  serialNumber: z.string().trim().min(1).max(64).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

/** Manuell utleverans / skrot — positiv qty från plats. */
export const manualIssueSchema = z.object({
  partId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  quantity: z.coerce.number().positive("Antal måste vara > 0"),
  type: z.enum(["issue", "scrap"]).default("issue"),
  batchId: z.string().uuid().nullable().optional(),
  serialUnitId: z.string().uuid().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

/** Manuell flytt mellan platser. */
export const manualTransferSchema = z.object({
  partId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.coerce.number().positive("Antal måste vara > 0"),
  batchId: z.string().uuid().nullable().optional(),
  serialUnitId: z.string().uuid().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const createBatchSchema = z.object({
  partId: z.string().uuid(),
  batchNumber: z.string().trim().min(1).max(64),
  supplierBatchNumber: z.string().trim().max(64).nullable().optional(),
  productionDate: z.coerce.date().nullable().optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  certificateRef: z.string().trim().max(120).nullable().optional(),
  status: z.enum(["available", "quarantine", "blocked"]).default("available"),
});

export const createSerialUnitSchema = z.object({
  partId: z.string().uuid(),
  serialNumber: z.string().trim().min(1).max(64),
  batchId: z.string().uuid().nullable().optional(),
  currentLocationId: z.string().uuid().nullable().optional(),
  status: z
    .enum(["available", "quarantine", "blocked", "consumed", "shipped"])
    .default("available"),
});

export const createGenealogyEdgeSchema = z.object({
  consumedBatchId: z.string().uuid().nullable().optional(),
  consumedSerialId: z.string().uuid().nullable().optional(),
  producedBatchId: z.string().uuid().nullable().optional(),
  producedSerialId: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().positive(),
  manufacturingOrderRef: z.string().trim().max(64).nullable().optional(),
});

export const stockBalanceFilterSchema = z.object({
  search: z.string().optional().default(""),
  warehouseId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  partId: z.string().uuid().nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
  view: z.enum(["part", "location"]).default("part"),
});

export const stockTransactionFilterSchema = z.object({
  partId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  type: stockTransactionTypeSchema.optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type CreateStockLocationInput = z.infer<typeof createStockLocationSchema>;
export type UpdateStockLocationInput = z.infer<typeof updateStockLocationSchema>;
export type ManualReceiptInput = z.infer<typeof manualReceiptSchema>;
export type ManualIssueInput = z.infer<typeof manualIssueSchema>;
export type ManualTransferInput = z.infer<typeof manualTransferSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type CreateSerialUnitInput = z.infer<typeof createSerialUnitSchema>;
export type CreateGenealogyEdgeInput = z.infer<typeof createGenealogyEdgeSchema>;
export type StockBalanceFilter = z.infer<typeof stockBalanceFilterSchema>;
export type StockTransactionFilter = z.infer<typeof stockTransactionFilterSchema>;
