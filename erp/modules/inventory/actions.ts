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
