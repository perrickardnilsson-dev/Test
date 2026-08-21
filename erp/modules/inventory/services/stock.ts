import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getTenantDb, type Db } from "@/core/db/tenant";
import {
  batch,
  part,
  serialUnit,
  stockBalance,
  stockLocation,
  stockTransaction,
  warehouse,
} from "../schema";
import {
  planStockPosting,
  StockPostingError,
  type StockBalanceState,
} from "../domain/stock-posting";
import {
  assertTraceabilityRequirement,
  TraceabilityError,
} from "../domain/genealogy";
import type {
  ManualIssueInput,
  ManualReceiptInput,
  ManualTransferInput,
  StockBalanceFilter,
  StockTransactionFilter,
} from "../domain/stock-schemas";

function toState(row: {
  quantity: string;
  reservedQuantity: string;
  averageCost: string;
} | null): StockBalanceState | null {
  if (!row) return null;
  return {
    quantity: Number(row.quantity),
    reservedQuantity: Number(row.reservedQuantity),
    averageCost: Number(row.averageCost),
  };
}

function num(n: number): string {
  return String(n);
}

async function loadBalance(
  tx: Db,
  organizationId: string,
  partId: string,
  locationId: string,
  batchId: string | null,
) {
  const conditions = [
    eq(stockBalance.organizationId, organizationId),
    eq(stockBalance.partId, partId),
    eq(stockBalance.locationId, locationId),
  ];
  if (batchId) {
    conditions.push(eq(stockBalance.batchId, batchId));
  } else {
    conditions.push(isNull(stockBalance.batchId));
  }
  const rows = await tx
    .select()
    .from(stockBalance)
    .where(and(...conditions))
    .limit(1);
  return rows[0] ?? null;
}

async function loadLocationWithWarehouse(
  tx: Db,
  organizationId: string,
  locationId: string,
) {
  const rows = await tx
    .select({
      locationId: stockLocation.id,
      warehouseId: warehouse.id,
      allowNegativeStock: warehouse.allowNegativeStock,
      isActive: stockLocation.isActive,
      warehouseActive: warehouse.isActive,
    })
    .from(stockLocation)
    .innerJoin(warehouse, eq(stockLocation.warehouseId, warehouse.id))
    .where(
      and(
        eq(stockLocation.organizationId, organizationId),
        eq(stockLocation.id, locationId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function upsertBalance(
  tx: Db,
  organizationId: string,
  partId: string,
  locationId: string,
  batchId: string | null,
  existingId: string | undefined,
  next: StockBalanceState,
) {
  if (existingId) {
    await tx
      .update(stockBalance)
      .set({
        quantity: num(next.quantity),
        reservedQuantity: num(next.reservedQuantity),
        averageCost: num(next.averageCost),
        updatedAt: new Date(),
      })
      .where(eq(stockBalance.id, existingId));
    return;
  }
  await tx.insert(stockBalance).values({
    organizationId,
    partId,
    locationId,
    batchId,
    quantity: num(next.quantity),
    reservedQuantity: num(next.reservedQuantity),
    averageCost: num(next.averageCost),
  });
}

async function resolveReceiptTrace(
  tx: Db,
  organizationId: string,
  userId: string,
  partId: string,
  mode: "none" | "batch" | "serial",
  input: ManualReceiptInput,
): Promise<{ batchId: string | null; serialUnitId: string | null }> {
  let batchId = input.batchId ?? null;
  let serialUnitId: string | null = null;

  if (mode === "batch" || mode === "serial") {
    if (!batchId && input.batchNumber) {
      const existing = await tx
        .select({ id: batch.id })
        .from(batch)
        .where(
          and(
            eq(batch.organizationId, organizationId),
            eq(batch.partId, partId),
            eq(batch.batchNumber, input.batchNumber),
          ),
        )
        .limit(1);
      if (existing[0]) {
        batchId = existing[0].id;
      } else {
        const [created] = await tx
          .insert(batch)
          .values({
            organizationId,
            partId,
            batchNumber: input.batchNumber,
            createdBy: userId,
          })
          .returning({ id: batch.id });
        batchId = created!.id;
      }
    }
  }

  if (mode === "serial") {
    if (!input.serialNumber) {
      throw new TraceabilityError("Serienummer krävs för denna artikel");
    }
    if (input.quantity !== 1) {
      throw new TraceabilityError(
        "Serieartikel måste bokföras med antal 1 per serienummer",
      );
    }
    const existingSerial = await tx
      .select({ id: serialUnit.id })
      .from(serialUnit)
      .where(
        and(
          eq(serialUnit.organizationId, organizationId),
          eq(serialUnit.partId, partId),
          eq(serialUnit.serialNumber, input.serialNumber),
        ),
      )
      .limit(1);
    if (existingSerial[0]) {
      throw new TraceabilityError(
        `Serienummer ${input.serialNumber} finns redan`,
      );
    }
    const [created] = await tx
      .insert(serialUnit)
      .values({
        organizationId,
        partId,
        serialNumber: input.serialNumber,
        batchId,
        currentLocationId: input.toLocationId,
        createdBy: userId,
      })
      .returning({ id: serialUnit.id });
    serialUnitId = created!.id;
  }

  try {
    assertTraceabilityRequirement(mode, {
      batchId,
      serialUnitId,
      quantity: input.quantity,
    });
  } catch (err) {
    if (err instanceof TraceabilityError) {
      throw new StockPostingError(err.message);
    }
    throw err;
  }

  return { batchId, serialUnitId };
}

type PostMeta = {
  organizationId: string;
  userId: string;
  partId: string;
  note?: string | null;
  referenceId?: string | null;
  traceabilityMode: "none" | "batch" | "serial";
};

/**
 * All saldoförändring går här — skriver oföränderlig händelse + uppdaterar saldo.
 */
export async function postStockTransaction(
  organizationId: string,
  userId: string,
  input: ManualReceiptInput | ManualIssueInput | ManualTransferInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const partRows = await tx
      .select({ id: part.id, traceabilityMode: part.traceabilityMode })
      .from(part)
      .where(
        and(eq(part.organizationId, organizationId), eq(part.id, input.partId)),
      )
      .limit(1);
    if (!partRows[0]) {
      throw new StockPostingError("Artikel hittades inte");
    }

    const meta: PostMeta = {
      organizationId,
      userId,
      partId: input.partId,
      note: input.note ?? null,
      traceabilityMode: partRows[0].traceabilityMode,
    };

    if ("toLocationId" in input && !("fromLocationId" in input)) {
      return postReceipt(tx, meta, input as ManualReceiptInput);
    }
    if ("fromLocationId" in input && "toLocationId" in input) {
      return postTransfer(tx, meta, input as ManualTransferInput);
    }
    return postIssue(tx, meta, input as ManualIssueInput);
  });
}

async function postReceipt(
  tx: Db,
  meta: PostMeta,
  input: ManualReceiptInput,
) {
  const loc = await loadLocationWithWarehouse(
    tx,
    meta.organizationId,
    input.toLocationId,
  );
  if (!loc || !loc.isActive || !loc.warehouseActive) {
    throw new StockPostingError("Lagerplatsen är ogiltig eller inaktiv");
  }

  const { batchId, serialUnitId } = await resolveReceiptTrace(
    tx,
    meta.organizationId,
    meta.userId,
    meta.partId,
    meta.traceabilityMode,
    input,
  );

  const existing = await loadBalance(
    tx,
    meta.organizationId,
    input.partId,
    input.toLocationId,
    batchId,
  );
  const plan = planStockPosting({
    type: "receipt",
    quantity: input.quantity,
    unitCost: input.unitCost,
    toLocationId: input.toLocationId,
    currentTo: toState(existing),
    allowNegative: loc.allowNegativeStock,
  });

  const [txRow] = await tx
    .insert(stockTransaction)
    .values({
      organizationId: meta.organizationId,
      type: plan.type,
      partId: meta.partId,
      quantity: num(plan.quantity),
      fromLocationId: null,
      toLocationId: plan.toLocationId,
      batchId,
      serialUnitId,
      unitCost: num(plan.unitCost),
      referenceType: "manual",
      postedBy: meta.userId,
      note: meta.note ?? null,
    })
    .returning({ id: stockTransaction.id });

  await upsertBalance(
    tx,
    meta.organizationId,
    meta.partId,
    input.toLocationId,
    batchId,
    existing?.id,
    plan.toBalance!,
  );

  return { transactionId: txRow!.id };
}

async function postIssue(tx: Db, meta: PostMeta, input: ManualIssueInput) {
  const loc = await loadLocationWithWarehouse(
    tx,
    meta.organizationId,
    input.fromLocationId,
  );
  if (!loc || !loc.isActive || !loc.warehouseActive) {
    throw new StockPostingError("Lagerplatsen är ogiltig eller inaktiv");
  }

  const batchId = input.batchId ?? null;
  const serialUnitId = input.serialUnitId ?? null;
  try {
    assertTraceabilityRequirement(meta.traceabilityMode, {
      batchId,
      serialUnitId,
      quantity: input.quantity,
    });
  } catch (err) {
    if (err instanceof TraceabilityError) {
      throw new StockPostingError(err.message);
    }
    throw err;
  }

  const existing = await loadBalance(
    tx,
    meta.organizationId,
    input.partId,
    input.fromLocationId,
    batchId,
  );
  const plan = planStockPosting({
    type: input.type,
    quantity: input.quantity,
    fromLocationId: input.fromLocationId,
    currentFrom: toState(existing),
    allowNegative: loc.allowNegativeStock,
  });

  const [txRow] = await tx
    .insert(stockTransaction)
    .values({
      organizationId: meta.organizationId,
      type: plan.type,
      partId: meta.partId,
      quantity: num(plan.quantity),
      fromLocationId: plan.fromLocationId,
      toLocationId: null,
      batchId,
      serialUnitId,
      unitCost: num(plan.unitCost),
      referenceType: "manual",
      postedBy: meta.userId,
      note: meta.note ?? null,
    })
    .returning({ id: stockTransaction.id });

  await upsertBalance(
    tx,
    meta.organizationId,
    meta.partId,
    input.fromLocationId,
    batchId,
    existing?.id,
    plan.fromBalance!,
  );

  if (serialUnitId) {
    await tx
      .update(serialUnit)
      .set({
        status: input.type === "scrap" ? "consumed" : "shipped",
        currentLocationId: null,
        updatedAt: new Date(),
      })
      .where(eq(serialUnit.id, serialUnitId));
  }

  return { transactionId: txRow!.id };
}

async function postTransfer(
  tx: Db,
  meta: PostMeta,
  input: ManualTransferInput,
) {
  const fromLoc = await loadLocationWithWarehouse(
    tx,
    meta.organizationId,
    input.fromLocationId,
  );
  const toLoc = await loadLocationWithWarehouse(
    tx,
    meta.organizationId,
    input.toLocationId,
  );
  if (!fromLoc || !fromLoc.isActive || !fromLoc.warehouseActive) {
    throw new StockPostingError("Från-platsen är ogiltig eller inaktiv");
  }
  if (!toLoc || !toLoc.isActive || !toLoc.warehouseActive) {
    throw new StockPostingError("Till-platsen är ogiltig eller inaktiv");
  }

  const batchId = input.batchId ?? null;
  const serialUnitId = input.serialUnitId ?? null;
  try {
    assertTraceabilityRequirement(meta.traceabilityMode, {
      batchId,
      serialUnitId,
      quantity: input.quantity,
    });
  } catch (err) {
    if (err instanceof TraceabilityError) {
      throw new StockPostingError(err.message);
    }
    throw err;
  }

  const existingFrom = await loadBalance(
    tx,
    meta.organizationId,
    input.partId,
    input.fromLocationId,
    batchId,
  );
  const existingTo = await loadBalance(
    tx,
    meta.organizationId,
    input.partId,
    input.toLocationId,
    batchId,
  );

  const plan = planStockPosting({
    type: "transfer",
    quantity: input.quantity,
    fromLocationId: input.fromLocationId,
    toLocationId: input.toLocationId,
    currentFrom: toState(existingFrom),
    currentTo: toState(existingTo),
    allowNegativeFrom: fromLoc.allowNegativeStock,
  });

  const [txRow] = await tx
    .insert(stockTransaction)
    .values({
      organizationId: meta.organizationId,
      type: plan.type,
      partId: meta.partId,
      quantity: num(plan.quantity),
      fromLocationId: plan.fromLocationId,
      toLocationId: plan.toLocationId,
      batchId,
      serialUnitId,
      unitCost: num(plan.unitCost),
      referenceType: "manual",
      postedBy: meta.userId,
      note: meta.note ?? null,
    })
    .returning({ id: stockTransaction.id });

  await upsertBalance(
    tx,
    meta.organizationId,
    meta.partId,
    input.fromLocationId,
    batchId,
    existingFrom?.id,
    plan.fromBalance!,
  );
  await upsertBalance(
    tx,
    meta.organizationId,
    meta.partId,
    input.toLocationId,
    batchId,
    existingTo?.id,
    plan.toBalance!,
  );

  if (serialUnitId) {
    await tx
      .update(serialUnit)
      .set({
        currentLocationId: input.toLocationId,
        updatedAt: new Date(),
      })
      .where(eq(serialUnit.id, serialUnitId));
  }

  return { transactionId: txRow!.id };
}

export async function listStockBalances(
  organizationId: string,
  filter: StockBalanceFilter,
) {
  return getTenantDb(organizationId, async (tx) => {
    const conditions = [eq(stockBalance.organizationId, organizationId)];

    if (filter.partId) {
      conditions.push(eq(stockBalance.partId, filter.partId));
    }
    if (filter.locationId) {
      conditions.push(eq(stockBalance.locationId, filter.locationId));
    }
    if (filter.warehouseId) {
      conditions.push(eq(warehouse.id, filter.warehouseId));
    }
    if (filter.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          ilike(part.partNumber, q),
          ilike(part.description, q),
          ilike(stockLocation.code, q),
        )!,
      );
    }

    // Dölj nollsaldon utan reservation
    conditions.push(
      sql`(${stockBalance.quantity} <> 0 OR ${stockBalance.reservedQuantity} <> 0)`,
    );

    const rows = await tx
      .select({
        id: stockBalance.id,
        partId: stockBalance.partId,
        partNumber: part.partNumber,
        partDescription: part.description,
        unit: part.unit,
        locationId: stockBalance.locationId,
        locationCode: stockLocation.code,
        warehouseId: warehouse.id,
        warehouseCode: warehouse.code,
        quantity: stockBalance.quantity,
        reservedQuantity: stockBalance.reservedQuantity,
        averageCost: stockBalance.averageCost,
        updatedAt: stockBalance.updatedAt,
      })
      .from(stockBalance)
      .innerJoin(part, eq(stockBalance.partId, part.id))
      .innerJoin(stockLocation, eq(stockBalance.locationId, stockLocation.id))
      .innerJoin(warehouse, eq(stockLocation.warehouseId, warehouse.id))
      .where(and(...conditions));

    rows.sort((a, b) => {
      if (filter.view === "location") {
        return (
          a.warehouseCode.localeCompare(b.warehouseCode, "sv") ||
          a.locationCode.localeCompare(b.locationCode, "sv") ||
          a.partNumber.localeCompare(b.partNumber, "sv")
        );
      }
      return (
        a.partNumber.localeCompare(b.partNumber, "sv") ||
        a.warehouseCode.localeCompare(b.warehouseCode, "sv") ||
        a.locationCode.localeCompare(b.locationCode, "sv")
      );
    });
    return rows;
  });
}

export async function listStockTransactions(
  organizationId: string,
  filter: StockTransactionFilter,
) {
  return getTenantDb(organizationId, async (tx) => {
    const conditions = [eq(stockTransaction.organizationId, organizationId)];
    if (filter.partId) {
      conditions.push(eq(stockTransaction.partId, filter.partId));
    }
    if (filter.type) {
      conditions.push(eq(stockTransaction.type, filter.type));
    }
    if (filter.locationId) {
      conditions.push(
        or(
          eq(stockTransaction.fromLocationId, filter.locationId),
          eq(stockTransaction.toLocationId, filter.locationId),
        )!,
      );
    }

    const rows = await tx
      .select({
        id: stockTransaction.id,
        type: stockTransaction.type,
        partId: stockTransaction.partId,
        partNumber: part.partNumber,
        partDescription: part.description,
        quantity: stockTransaction.quantity,
        unitCost: stockTransaction.unitCost,
        fromLocationId: stockTransaction.fromLocationId,
        toLocationId: stockTransaction.toLocationId,
        referenceType: stockTransaction.referenceType,
        note: stockTransaction.note,
        postedAt: stockTransaction.postedAt,
        postedBy: stockTransaction.postedBy,
      })
      .from(stockTransaction)
      .innerJoin(part, eq(stockTransaction.partId, part.id))
      .where(and(...conditions))
      .orderBy(desc(stockTransaction.postedAt))
      .limit(filter.limit);

    const locationIds = [
      ...new Set(
        rows.flatMap((r) =>
          [r.fromLocationId, r.toLocationId].filter(Boolean) as string[],
        ),
      ),
    ];
    const locMap = new Map<string, string>();
    if (locationIds.length > 0) {
      const locs = await tx
        .select({ id: stockLocation.id, code: stockLocation.code })
        .from(stockLocation)
        .where(eq(stockLocation.organizationId, organizationId));
      for (const loc of locs) {
        locMap.set(loc.id, loc.code);
      }
    }

    return rows.map((r) => ({
      ...r,
      fromLocationCode: r.fromLocationId
        ? (locMap.get(r.fromLocationId) ?? null)
        : null,
      toLocationCode: r.toLocationId
        ? (locMap.get(r.toLocationId) ?? null)
        : null,
    }));
  });
}
