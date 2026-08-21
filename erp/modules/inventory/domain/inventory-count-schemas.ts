import { z } from "zod";

export const createInventoryCountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  warehouseId: z.string().uuid().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  /** Om true: skapa rader från aktuella saldon (evt. filtrerat på lagerställe). */
  snapshotBalances: z.boolean().default(true),
});

export const recordCountLineSchema = z.object({
  lineId: z.string().uuid(),
  countedQuantity: z.number(),
});

export const recordCountByPartSchema = z.object({
  inventoryCountId: z.string().uuid(),
  partNumber: z.string().trim().min(1),
  locationId: z.string().uuid().optional(),
  countedQuantity: z.number(),
});

export const inventoryCountIdSchema = z.object({
  inventoryCountId: z.string().uuid(),
});

export type CreateInventoryCountInput = z.infer<
  typeof createInventoryCountSchema
>;
export type RecordCountLineInput = z.infer<typeof recordCountLineSchema>;
export type RecordCountByPartInput = z.infer<typeof recordCountByPartSchema>;
