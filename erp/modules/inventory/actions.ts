"use server";

import { revalidatePath } from "next/cache";
import {
  createPartSchema,
  createPartGroupSchema,
  partListFilterSchema,
  savePartViewSchema,
  updatePartSchema,
} from "./domain/part-schemas";
import {
  createBatchSchema,
  createSerialUnitSchema,
  createStockLocationSchema,
  createWarehouseSchema,
  manualIssueSchema,
  manualReceiptSchema,
  manualTransferSchema,
  stockBalanceFilterSchema,
  stockTransactionFilterSchema,
  updateStockLocationSchema,
  updateWarehouseSchema,
} from "./domain/stock-schemas";
import { csvRowToCreateInput, parsePartsCsv } from "./domain/csv";
import {
  createPart,
  createPartGroup,
  createPartsBulk,
  deleteSavedPartView,
  getPart,
  listPartGroups,
  listParts,
  listSavedPartViews,
  savePartView,
  updatePart,
} from "./services/parts";
import {
  createStockLocation,
  createWarehouse,
  listStockLocations,
  listWarehouses,
  updateStockLocation,
  updateWarehouse,
} from "./services/warehouses";
import {
  listStockBalances,
  listStockTransactions,
  postStockTransaction,
} from "./services/stock";
import {
  createBatch,
  createSerialUnit,
  listBatches,
} from "./services/traceability";
import {
  findBatchByNumber,
  findSerialByNumber,
  traceGenealogy,
} from "./services/genealogy";
import { seedRecallDemo } from "./services/recall-demo";
import { requireOrgAccess } from "./lib/org-context";
import { StockPostingError } from "./domain/stock-posting";
import { BomError } from "./domain/bom";
import { MrpError } from "./domain/mrp";
import {
  createBomSchema,
  createDemandLineSchema,
  createSupplyLineSchema,
  deleteBomLineSchema,
  runMrpSchema,
  updateBomSchema,
  updateSuggestionStatusSchema,
  upsertBomLineSchema,
} from "./domain/planning-schemas";
import {
  createBom,
  deleteBomLine,
  getBomTree,
  getBomWithLines,
  listBoms,
  updateBom,
  upsertBomLine,
} from "./services/bom";
import {
  createDemandLine,
  createSupplyLine,
  executeNetRequirementRun,
  listDemandLines,
  listNetRequirementRuns,
  listPlanningSuggestions,
  listSupplyLines,
  seedMrpDemo,
  updateSuggestionStatuses,
} from "./services/mrp";
import {
  createInventoryCountSchema,
  inventoryCountIdSchema,
  recordCountByPartSchema,
  recordCountLineSchema,
} from "./domain/inventory-count-schemas";
import { InventoryCountError } from "./domain/inventory-count";
import {
  approveAndPostInventoryCount,
  cancelInventoryCount,
  createInventoryCount,
  getInventoryCount,
  listInventoryCounts,
  recordCountByPartNumber,
  recordCountLine,
  submitInventoryCount,
} from "./services/inventory-count";
import { seedPitchDemo } from "./services/pitch-seed";
import { getPitchDashboard } from "./services/dashboard";

function revalidatePlanning(orgSlug: string) {
  revalidatePath(`/${orgSlug}/strukturer`);
  revalidatePath(`/${orgSlug}/planering`);
}

export async function listPartsAction(orgSlug: string, filter: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const parsed = partListFilterSchema.parse(filter ?? {});
  return listParts(ctx.organizationId, parsed);
}

export async function getPartAction(orgSlug: string, partId: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return getPart(ctx.organizationId, partId);
}

export async function createPartAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createPartSchema.parse(raw);
  const created = await createPart(ctx.organizationId, ctx.userId, input);
  revalidatePath(`/${orgSlug}/artiklar`);
  return { id: created.id, partNumber: created.partNumber };
}

export async function updatePartAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = updatePartSchema.parse(raw);
  const updated = await updatePart(ctx.organizationId, input);
  revalidatePath(`/${orgSlug}/artiklar`);
  revalidatePath(`/${orgSlug}/artiklar/${updated.id}`);
  return { id: updated.id };
}

export async function listPartGroupsAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listPartGroups(ctx.organizationId);
}

export async function createPartGroupAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createPartGroupSchema.parse(raw);
  const created = await createPartGroup(ctx.organizationId, ctx.userId, input);
  revalidatePath(`/${orgSlug}/varugrupper`);
  revalidatePath(`/${orgSlug}/artiklar`);
  return { id: created.id };
}

export async function listSavedViewsAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listSavedPartViews(ctx.organizationId, ctx.userId);
}

export async function savePartViewAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = savePartViewSchema.parse(raw);
  const created = await savePartView(
    ctx.organizationId,
    ctx.userId,
    input.name,
    input.config,
  );
  revalidatePath(`/${orgSlug}/artiklar`);
  return { id: created.id };
}

export async function deleteSavedViewAction(orgSlug: string, viewId: string) {
  const ctx = await requireOrgAccess(orgSlug);
  await deleteSavedPartView(ctx.organizationId, ctx.userId, viewId);
  revalidatePath(`/${orgSlug}/artiklar`);
}

export async function importPartsCsvAction(orgSlug: string, csvText: string) {
  const ctx = await requireOrgAccess(orgSlug);
  const parsed = parsePartsCsv(csvText);
  if (parsed.rows.length === 0) {
    return { created: [] as string[], errors: parsed.errors };
  }
  const inputs = parsed.rows.map(csvRowToCreateInput);
  const result = await createPartsBulk(
    ctx.organizationId,
    ctx.userId,
    inputs,
  );
  revalidatePath(`/${orgSlug}/artiklar`);
  return {
    created: result.created,
    errors: [...parsed.errors, ...result.errors],
  };
}

function revalidateStock(orgSlug: string) {
  revalidatePath(`/${orgSlug}/lager`);
  revalidatePath(`/${orgSlug}/lager/historik`);
  revalidatePath(`/${orgSlug}/lager/rorelse`);
  revalidatePath(`/${orgSlug}/lagerstallen`);
  revalidatePath(`/${orgSlug}/lagerplatser`);
}

export async function listWarehousesAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listWarehouses(ctx.organizationId);
}

export async function createWarehouseAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createWarehouseSchema.parse(raw);
  const created = await createWarehouse(ctx.organizationId, ctx.userId, input);
  revalidateStock(orgSlug);
  return { id: created.id };
}

export async function updateWarehouseAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = updateWarehouseSchema.parse(raw);
  const updated = await updateWarehouse(ctx.organizationId, input);
  revalidateStock(orgSlug);
  return { id: updated.id };
}

export async function listStockLocationsAction(
  orgSlug: string,
  warehouseId?: string | null,
) {
  const ctx = await requireOrgAccess(orgSlug);
  return listStockLocations(ctx.organizationId, warehouseId);
}

export async function createStockLocationAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createStockLocationSchema.parse(raw);
  const created = await createStockLocation(
    ctx.organizationId,
    ctx.userId,
    input,
  );
  revalidateStock(orgSlug);
  return { id: created.id };
}

export async function updateStockLocationAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = updateStockLocationSchema.parse(raw);
  const updated = await updateStockLocation(ctx.organizationId, input);
  revalidateStock(orgSlug);
  return { id: updated.id };
}

export async function listStockBalancesAction(orgSlug: string, filter: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const parsed = stockBalanceFilterSchema.parse(filter ?? {});
  return listStockBalances(ctx.organizationId, parsed);
}

export async function listStockTransactionsAction(
  orgSlug: string,
  filter: unknown,
) {
  const ctx = await requireOrgAccess(orgSlug);
  const parsed = stockTransactionFilterSchema.parse(filter ?? {});
  return listStockTransactions(ctx.organizationId, parsed);
}

export async function postManualReceiptAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = manualReceiptSchema.parse(raw);
    const result = await postStockTransaction(
      ctx.organizationId,
      ctx.userId,
      input,
    );
    revalidateStock(orgSlug);
    return result;
  } catch (err) {
    if (err instanceof StockPostingError) {
      throw new Error(err.message);
    }
    throw err;
  }
}

export async function postManualIssueAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = manualIssueSchema.parse(raw);
    const result = await postStockTransaction(
      ctx.organizationId,
      ctx.userId,
      input,
    );
    revalidateStock(orgSlug);
    return result;
  } catch (err) {
    if (err instanceof StockPostingError) {
      throw new Error(err.message);
    }
    throw err;
  }
}

export async function postManualTransferAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = manualTransferSchema.parse(raw);
    const result = await postStockTransaction(
      ctx.organizationId,
      ctx.userId,
      input,
    );
    revalidateStock(orgSlug);
    return result;
  } catch (err) {
    if (err instanceof StockPostingError) {
      throw new Error(err.message);
    }
    throw err;
  }
}

function revalidateTraceability(orgSlug: string) {
  revalidatePath(`/${orgSlug}/batcher`);
  revalidatePath(`/${orgSlug}/individer`);
  revalidatePath(`/${orgSlug}/sparbarhet`);
  revalidateStock(orgSlug);
}

export async function listBatchesAction(
  orgSlug: string,
  opts?: { partId?: string | null; search?: string },
) {
  const ctx = await requireOrgAccess(orgSlug);
  return listBatches(ctx.organizationId, opts);
}

export async function createBatchAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createBatchSchema.parse(raw);
  const created = await createBatch(ctx.organizationId, ctx.userId, input);
  revalidateTraceability(orgSlug);
  return { id: created.id, batchNumber: created.batchNumber };
}

export async function createSerialUnitAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createSerialUnitSchema.parse(raw);
  const created = await createSerialUnit(
    ctx.organizationId,
    ctx.userId,
    input,
  );
  revalidateTraceability(orgSlug);
  return { id: created.id, serialNumber: created.serialNumber };
}

export async function traceGenealogyAction(
  orgSlug: string,
  raw: {
    batchNumber?: string;
    serialNumber?: string;
    direction: "backward" | "forward";
  },
) {
  const ctx = await requireOrgAccess(orgSlug);
  const batchNumber = raw.batchNumber?.trim() || undefined;
  const serialNumber = raw.serialNumber?.trim() || undefined;

  let batchId: string | null = null;
  let serialUnitId: string | null = null;

  if (batchNumber) {
    const found = await findBatchByNumber(ctx.organizationId, batchNumber);
    if (!found) {
      throw new Error(`Batch ${batchNumber} hittades inte`);
    }
    batchId = found.id;
  } else if (serialNumber) {
    const found = await findSerialByNumber(ctx.organizationId, serialNumber);
    if (!found) {
      throw new Error(`Serienummer ${serialNumber} hittades inte`);
    }
    serialUnitId = found.id;
  } else {
    throw new Error("Ange batchnummer eller serienummer");
  }

  return traceGenealogy(ctx.organizationId, {
    batchId,
    serialUnitId,
    direction: raw.direction,
  });
}

export async function seedRecallDemoAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  const result = await seedRecallDemo(ctx.organizationId, ctx.userId);
  revalidateTraceability(orgSlug);
  return result;
}

export async function listBomsAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listBoms(ctx.organizationId);
}

export async function getBomAction(orgSlug: string, bomId: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return getBomWithLines(ctx.organizationId, bomId);
}

export async function getBomTreeAction(orgSlug: string, parentPartId: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return getBomTree(ctx.organizationId, parentPartId);
}

export async function createBomAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = createBomSchema.parse(raw);
    const created = await createBom(ctx.organizationId, ctx.userId, input);
    revalidatePlanning(orgSlug);
    return { id: created.id };
  } catch (err) {
    if (err instanceof BomError) throw new Error(err.message);
    throw err;
  }
}

export async function updateBomAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = updateBomSchema.parse(raw);
    const updated = await updateBom(ctx.organizationId, input);
    revalidatePlanning(orgSlug);
    return { id: updated.id, status: updated.status };
  } catch (err) {
    if (err instanceof BomError) throw new Error(err.message);
    throw err;
  }
}

export async function upsertBomLineAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = upsertBomLineSchema.parse(raw);
    const row = await upsertBomLine(ctx.organizationId, input);
    revalidatePlanning(orgSlug);
    return { id: row.id };
  } catch (err) {
    if (err instanceof BomError) throw new Error(err.message);
    throw err;
  }
}

export async function deleteBomLineAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = deleteBomLineSchema.parse(raw);
    await deleteBomLine(ctx.organizationId, input.lineId);
    revalidatePlanning(orgSlug);
    return { ok: true };
  } catch (err) {
    if (err instanceof BomError) throw new Error(err.message);
    throw err;
  }
}

export async function listDemandLinesAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listDemandLines(ctx.organizationId);
}

export async function listSupplyLinesAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listSupplyLines(ctx.organizationId);
}

export async function createDemandLineAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createDemandLineSchema.parse(raw);
  const created = await createDemandLine(
    ctx.organizationId,
    ctx.userId,
    input,
  );
  revalidatePlanning(orgSlug);
  return { id: created.id };
}

export async function createSupplyLineAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createSupplyLineSchema.parse(raw);
  const created = await createSupplyLine(
    ctx.organizationId,
    ctx.userId,
    input,
  );
  revalidatePlanning(orgSlug);
  return { id: created.id };
}

export async function runNetRequirementAction(orgSlug: string, raw?: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = runMrpSchema.parse(raw ?? {});
    const result = await executeNetRequirementRun(
      ctx.organizationId,
      ctx.userId,
      input.asOfDate,
    );
    revalidatePlanning(orgSlug);
    return result;
  } catch (err) {
    if (err instanceof MrpError || err instanceof BomError) {
      throw new Error(err.message);
    }
    throw err;
  }
}

export async function listNetRequirementRunsAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listNetRequirementRuns(ctx.organizationId);
}

export async function listPlanningSuggestionsAction(
  orgSlug: string,
  runId?: string,
) {
  const ctx = await requireOrgAccess(orgSlug);
  return listPlanningSuggestions(ctx.organizationId, runId);
}

export async function updateSuggestionsAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = updateSuggestionStatusSchema.parse(raw);
  const updated = await updateSuggestionStatuses(
    ctx.organizationId,
    input.suggestionIds,
    input.status,
  );
  revalidatePlanning(orgSlug);
  return { count: updated.length };
}

export async function seedMrpDemoAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  const result = await seedMrpDemo(ctx.organizationId, ctx.userId);
  revalidatePlanning(orgSlug);
  revalidatePath(`/${orgSlug}/artiklar`);
  return result;
}

// --- Fas 6–8: inventering, mobilt, pitch ---

function revalidateInventering(orgSlug: string, countId?: string) {
  revalidatePath(`/${orgSlug}/inventering`);
  revalidatePath(`/${orgSlug}/mobilt`);
  revalidatePath(`/${orgSlug}`);
  if (countId) {
    revalidatePath(`/${orgSlug}/inventering/${countId}`);
    revalidatePath(`/${orgSlug}/inventering/${countId}/mobil`);
  }
}

export async function listInventoryCountsAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listInventoryCounts(ctx.organizationId);
}

export async function getInventoryCountAction(
  orgSlug: string,
  countId: string,
) {
  const ctx = await requireOrgAccess(orgSlug);
  return getInventoryCount(ctx.organizationId, countId);
}

export async function createInventoryCountAction(
  orgSlug: string,
  raw: unknown,
) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = createInventoryCountSchema.parse(raw);
    const created = await createInventoryCount(
      ctx.organizationId,
      ctx.userId,
      input,
    );
    revalidateInventering(orgSlug, created.id);
    return created;
  } catch (err) {
    if (err instanceof InventoryCountError) throw new Error(err.message);
    throw err;
  }
}

export async function recordCountLineAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = recordCountLineSchema.parse(raw);
    const result = await recordCountLine(
      ctx.organizationId,
      ctx.userId,
      input,
    );
    revalidateInventering(orgSlug);
    return result;
  } catch (err) {
    if (err instanceof InventoryCountError) throw new Error(err.message);
    throw err;
  }
}

export async function recordCountByPartAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const input = recordCountByPartSchema.parse(raw);
    const result = await recordCountByPartNumber(
      ctx.organizationId,
      ctx.userId,
      input,
    );
    revalidateInventering(orgSlug, input.inventoryCountId);
    return result;
  } catch (err) {
    if (err instanceof InventoryCountError) throw new Error(err.message);
    throw err;
  }
}

export async function submitInventoryCountAction(
  orgSlug: string,
  raw: unknown,
) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const { inventoryCountId } = inventoryCountIdSchema.parse(raw);
    const result = await submitInventoryCount(
      ctx.organizationId,
      ctx.userId,
      inventoryCountId,
    );
    revalidateInventering(orgSlug, inventoryCountId);
    return result;
  } catch (err) {
    if (err instanceof InventoryCountError) throw new Error(err.message);
    throw err;
  }
}

export async function approveAndPostInventoryCountAction(
  orgSlug: string,
  raw: unknown,
) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const { inventoryCountId } = inventoryCountIdSchema.parse(raw);
    const result = await approveAndPostInventoryCount(
      ctx.organizationId,
      ctx.userId,
      inventoryCountId,
    );
    revalidateInventering(orgSlug, inventoryCountId);
    revalidatePath(`/${orgSlug}/lager`);
    revalidatePath(`/${orgSlug}/lager/historik`);
    return result;
  } catch (err) {
    if (err instanceof InventoryCountError) throw new Error(err.message);
    throw err;
  }
}

export async function cancelInventoryCountAction(
  orgSlug: string,
  raw: unknown,
) {
  const ctx = await requireOrgAccess(orgSlug);
  try {
    const { inventoryCountId } = inventoryCountIdSchema.parse(raw);
    const result = await cancelInventoryCount(
      ctx.organizationId,
      ctx.userId,
      inventoryCountId,
    );
    revalidateInventering(orgSlug, inventoryCountId);
    return result;
  } catch (err) {
    if (err instanceof InventoryCountError) throw new Error(err.message);
    throw err;
  }
}

export async function seedPitchDemoAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  const result = await seedPitchDemo(ctx.organizationId, ctx.userId);
  revalidateInventering(orgSlug);
  revalidatePlanning(orgSlug);
  revalidatePath(`/${orgSlug}/artiklar`);
  revalidatePath(`/${orgSlug}/lager`);
  revalidatePath(`/${orgSlug}/strukturer`);
  return result;
}

export async function getPitchDashboardAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return getPitchDashboard(ctx.organizationId);
}
