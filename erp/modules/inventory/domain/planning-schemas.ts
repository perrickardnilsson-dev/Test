import { z } from "zod";

export const bomStatusSchema = z.enum(["draft", "active", "obsolete"]);

export const createBomSchema = z.object({
  parentPartId: z.string().uuid(),
  revision: z.string().min(1).max(20).default("A"),
  status: bomStatusSchema.default("draft"),
  validFrom: z.string().optional(),
});

export const updateBomSchema = z.object({
  id: z.string().uuid(),
  revision: z.string().min(1).max(20).optional(),
  status: bomStatusSchema.optional(),
  validFrom: z.string().optional(),
});

export const upsertBomLineSchema = z.object({
  bomId: z.string().uuid(),
  componentPartId: z.string().uuid(),
  quantityPer: z.number().positive(),
  scrapPercent: z.number().min(0).lt(100).default(0),
  position: z.number().int().min(0).default(10),
  lineId: z.string().uuid().optional(),
});

export const deleteBomLineSchema = z.object({
  lineId: z.string().uuid(),
});

export const createDemandLineSchema = z.object({
  partId: z.string().uuid(),
  quantity: z.number().positive(),
  dueDate: z.string().min(8),
  sourceType: z
    .enum(["customer_order", "forecast", "dependent", "manual"])
    .default("manual"),
  sourceId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const createSupplyLineSchema = z.object({
  partId: z.string().uuid(),
  quantity: z.number().positive(),
  dueDate: z.string().min(8),
  sourceType: z
    .enum(["purchase_order", "manufacturing_order", "stock", "manual"])
    .default("manual"),
  sourceId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const runMrpSchema = z.object({
  asOfDate: z.string().optional(),
});

export const updateSuggestionStatusSchema = z.object({
  suggestionIds: z.array(z.string().uuid()).min(1),
  status: z.enum(["accepted", "rejected", "open"]),
});

export type CreateBomInput = z.infer<typeof createBomSchema>;
export type UpdateBomInput = z.infer<typeof updateBomSchema>;
export type UpsertBomLineInput = z.infer<typeof upsertBomLineSchema>;
export type CreateDemandLineInput = z.infer<typeof createDemandLineSchema>;
export type CreateSupplyLineInput = z.infer<typeof createSupplyLineSchema>;
