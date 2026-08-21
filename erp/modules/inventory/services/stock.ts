import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getTenantDb, type Db } from "@/core/db/tenant";
import {
  part,
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
) {
  const rows = await tx
    .select()
    .from(stockBalance)
    .where(
      and(
        eq(stockBalance.organizationId, organizationId),
        eq(stockBalance.partId, partId),
        eq(stockBalance.locationId, locationId),
      ),
    )
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
    quantity: num(next.quantity),
    reservedQuantity: num(next.reservedQuantity),
    averageCost: num(next.averageCost),
  });
}

type PostMeta = {
  organizationId: string;
  userId: string;
  partId: string;
  note?: string | null;
  referenceId?: string | null;
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
      .select({ id: part.id })
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
    };

    if ("toLocationId" in input && !("fromLocationId" in input)) {
      // receipt
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

  const existing = await loadBalance(
    tx,
    meta.organizationId,
    input.partId,
    input.toLocationId,
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

  const existing = await loadBalance(
    tx,
    meta.organizationId,
    input.partId,
    input.fromLocationId,
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
    existing?.id,
    plan.fromBalance!,
  );

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

  const existingFrom = await loadBalance(
    tx,
    meta.organizationId,
    input.partId,
    input.fromLocationId,
  );
  const existingTo = await loadBalance(
    tx,
    meta.organizationId,
    input.partId,
    input.toLocationId,
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
    existingFrom?.id,
    plan.fromBalance!,
  );
  await upsertBalance(
    tx,
    meta.organizationId,
    meta.partId,
    input.toLocationId,
    existingTo?.id,
    plan.toBalance!,
  );

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
