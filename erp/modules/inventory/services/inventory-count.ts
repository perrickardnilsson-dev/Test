import { and, desc, eq, isNull } from "drizzle-orm";
import { getTenantDb, type Db } from "@/core/db/tenant";
import {
  inventoryCount,
  inventoryCountLine,
  part,
  stockBalance,
  stockLocation,
  stockTransaction,
  warehouse,
} from "../schema";
import {
  adjustmentQuantity,
  assertCountTransition,
  computeLineVariance,
  InventoryCountError,
  summarizeCount,
  type InventoryCountStatus,
} from "../domain/inventory-count";
import type {
  CreateInventoryCountInput,
  RecordCountByPartInput,
  RecordCountLineInput,
} from "../domain/inventory-count-schemas";
import {
  planStockPosting,
  StockPostingError,
  type StockBalanceState,
} from "../domain/stock-posting";

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

export async function listInventoryCounts(organizationId: string) {
  return getTenantDb(organizationId, async (tx) => {
    const rows = await tx
      .select({
        id: inventoryCount.id,
        name: inventoryCount.name,
        status: inventoryCount.status,
        warehouseId: inventoryCount.warehouseId,
        note: inventoryCount.note,
        countedAt: inventoryCount.countedAt,
        approvedAt: inventoryCount.approvedAt,
        postedAt: inventoryCount.postedAt,
        createdAt: inventoryCount.createdAt,
        createdBy: inventoryCount.createdBy,
      })
      .from(inventoryCount)
      .where(eq(inventoryCount.organizationId, organizationId))
      .orderBy(desc(inventoryCount.createdAt));
    return rows;
  });
}

export async function getInventoryCount(organizationId: string, id: string) {
  return getTenantDb(organizationId, async (tx) => {
    const headers = await tx
      .select()
      .from(inventoryCount)
      .where(
        and(
          eq(inventoryCount.organizationId, organizationId),
          eq(inventoryCount.id, id),
        ),
      )
      .limit(1);
    const header = headers[0];
    if (!header) {
      throw new InventoryCountError("Inventeringen hittades inte");
    }

    const lines = await tx
      .select({
        id: inventoryCountLine.id,
        partId: inventoryCountLine.partId,
        partNumber: part.partNumber,
        description: part.description,
        unit: part.unit,
        locationId: inventoryCountLine.locationId,
        locationCode: stockLocation.code,
        batchId: inventoryCountLine.batchId,
        expectedQuantity: inventoryCountLine.expectedQuantity,
        countedQuantity: inventoryCountLine.countedQuantity,
        unitCost: inventoryCountLine.unitCost,
        varianceValue: inventoryCountLine.varianceValue,
        countedBy: inventoryCountLine.countedBy,
        countedAt: inventoryCountLine.countedAt,
      })
      .from(inventoryCountLine)
      .innerJoin(part, eq(inventoryCountLine.partId, part.id))
      .innerJoin(
        stockLocation,
        eq(inventoryCountLine.locationId, stockLocation.id),
      )
      .where(
        and(
          eq(inventoryCountLine.organizationId, organizationId),
          eq(inventoryCountLine.inventoryCountId, id),
        ),
      );

    const lineInputs = lines.map((l) => ({
      expectedQuantity: Number(l.expectedQuantity),
      countedQuantity:
        l.countedQuantity == null ? null : Number(l.countedQuantity),
      unitCost: Number(l.unitCost),
    }));
    const summary = summarizeCount(lineInputs);

    return {
      ...header,
      lines: lines.map((l) => {
        const variance = computeLineVariance({
          expectedQuantity: Number(l.expectedQuantity),
          countedQuantity:
            l.countedQuantity == null ? null : Number(l.countedQuantity),
          unitCost: Number(l.unitCost),
        });
        return {
          ...l,
          expectedQuantity: Number(l.expectedQuantity),
          countedQuantity:
            l.countedQuantity == null ? null : Number(l.countedQuantity),
          unitCost: Number(l.unitCost),
          varianceQuantity: variance.varianceQuantity,
          varianceValue:
            l.varianceValue == null
              ? variance.varianceValue
              : Number(l.varianceValue),
          isCounted: variance.isCounted,
        };
      }),
      summary,
    };
  });
}

export async function createInventoryCount(
  organizationId: string,
  userId: string,
  input: CreateInventoryCountInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    if (input.warehouseId) {
      const wh = await tx
        .select({ id: warehouse.id })
        .from(warehouse)
        .where(
          and(
            eq(warehouse.organizationId, organizationId),
            eq(warehouse.id, input.warehouseId),
          ),
        )
        .limit(1);
      if (!wh[0]) {
        throw new InventoryCountError("Lagerstället hittades inte");
      }
    }

    const [created] = await tx
      .insert(inventoryCount)
      .values({
        organizationId,
        name: input.name,
        warehouseId: input.warehouseId ?? null,
        note: input.note ?? null,
        status: "draft",
        createdBy: userId,
      })
      .returning();

    assertCountTransition("draft", "counting");
    await tx
      .update(inventoryCount)
      .set({ status: "counting", updatedAt: new Date() })
      .where(eq(inventoryCount.id, created!.id));

    if (input.snapshotBalances) {
      const balanceConditions = [
        eq(stockBalance.organizationId, organizationId),
      ];
      const balanceQuery = tx
        .select({
          partId: stockBalance.partId,
          locationId: stockBalance.locationId,
          batchId: stockBalance.batchId,
          quantity: stockBalance.quantity,
          averageCost: stockBalance.averageCost,
          warehouseId: stockLocation.warehouseId,
        })
        .from(stockBalance)
        .innerJoin(
          stockLocation,
          eq(stockBalance.locationId, stockLocation.id),
        );

      const balances = input.warehouseId
        ? await balanceQuery.where(
            and(
              ...balanceConditions,
              eq(stockLocation.warehouseId, input.warehouseId),
            ),
          )
        : await balanceQuery.where(and(...balanceConditions));

      for (const bal of balances) {
        const qty = Number(bal.quantity);
        if (qty === 0) continue;
        await tx.insert(inventoryCountLine).values({
          organizationId,
          inventoryCountId: created!.id,
          partId: bal.partId,
          locationId: bal.locationId,
          batchId: bal.batchId,
          expectedQuantity: num(qty),
          unitCost: num(Number(bal.averageCost)),
        });
      }
    }

    return { id: created!.id, status: "counting" as const };
  });
}

export async function recordCountLine(
  organizationId: string,
  userId: string,
  input: RecordCountLineInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const lines = await tx
      .select({
        line: inventoryCountLine,
        status: inventoryCount.status,
      })
      .from(inventoryCountLine)
      .innerJoin(
        inventoryCount,
        eq(inventoryCountLine.inventoryCountId, inventoryCount.id),
      )
      .where(
        and(
          eq(inventoryCountLine.organizationId, organizationId),
          eq(inventoryCountLine.id, input.lineId),
        ),
      )
      .limit(1);

    const row = lines[0];
    if (!row) {
      throw new InventoryCountError("Inventeringsraden hittades inte");
    }
    if (row.status !== "counting") {
      throw new InventoryCountError(
        "Räkning kan bara registreras när status är counting",
      );
    }

    const variance = computeLineVariance({
      expectedQuantity: Number(row.line.expectedQuantity),
      countedQuantity: input.countedQuantity,
      unitCost: Number(row.line.unitCost),
    });

    await tx
      .update(inventoryCountLine)
      .set({
        countedQuantity: num(input.countedQuantity),
        varianceValue:
          variance.varianceValue == null ? null : num(variance.varianceValue),
        countedBy: userId,
        countedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inventoryCountLine.id, input.lineId));

    return {
      lineId: input.lineId,
      varianceQuantity: variance.varianceQuantity,
      varianceValue: variance.varianceValue,
    };
  });
}

export async function recordCountByPartNumber(
  organizationId: string,
  userId: string,
  input: RecordCountByPartInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const headers = await tx
      .select()
      .from(inventoryCount)
      .where(
        and(
          eq(inventoryCount.organizationId, organizationId),
          eq(inventoryCount.id, input.inventoryCountId),
        ),
      )
      .limit(1);
    const header = headers[0];
    if (!header) {
      throw new InventoryCountError("Inventeringen hittades inte");
    }
    if (header.status !== "counting") {
      throw new InventoryCountError(
        "Räkning kan bara registreras när status är counting",
      );
    }

    const partRows = await tx
      .select({ id: part.id })
      .from(part)
      .where(
        and(
          eq(part.organizationId, organizationId),
          eq(part.partNumber, input.partNumber.trim()),
        ),
      )
      .limit(1);
    if (!partRows[0]) {
      throw new InventoryCountError(
        `Artikel ${input.partNumber} hittades inte`,
      );
    }

    const lineConditions = [
      eq(inventoryCountLine.organizationId, organizationId),
      eq(inventoryCountLine.inventoryCountId, input.inventoryCountId),
      eq(inventoryCountLine.partId, partRows[0].id),
      isNull(inventoryCountLine.countedQuantity),
    ];
    if (input.locationId) {
      lineConditions.push(eq(inventoryCountLine.locationId, input.locationId));
    }

    const openLines = await tx
      .select()
      .from(inventoryCountLine)
      .where(and(...lineConditions))
      .limit(2);

    if (openLines.length === 0) {
      // Fallback: already counted or no open line — try any matching line
      const anyConditions = [
        eq(inventoryCountLine.organizationId, organizationId),
        eq(inventoryCountLine.inventoryCountId, input.inventoryCountId),
        eq(inventoryCountLine.partId, partRows[0].id),
      ];
      if (input.locationId) {
        anyConditions.push(
          eq(inventoryCountLine.locationId, input.locationId),
        );
      }
      const anyLines = await tx
        .select()
        .from(inventoryCountLine)
        .where(and(...anyConditions))
        .limit(2);
      if (anyLines.length === 0) {
        throw new InventoryCountError(
          `Ingen inventeringsrad för ${input.partNumber}`,
        );
      }
      if (anyLines.length > 1 && !input.locationId) {
        throw new InventoryCountError(
          `Flera rader för ${input.partNumber} — ange lagerplats`,
        );
      }
      return recordCountLineInTx(tx, userId, {
        lineId: anyLines[0]!.id,
        countedQuantity: input.countedQuantity,
        expectedQuantity: Number(anyLines[0]!.expectedQuantity),
        unitCost: Number(anyLines[0]!.unitCost),
      });
    }

    if (openLines.length > 1 && !input.locationId) {
      throw new InventoryCountError(
        `Flera oräknade rader för ${input.partNumber} — ange lagerplats`,
      );
    }

    return recordCountLineInTx(tx, userId, {
      lineId: openLines[0]!.id,
      countedQuantity: input.countedQuantity,
      expectedQuantity: Number(openLines[0]!.expectedQuantity),
      unitCost: Number(openLines[0]!.unitCost),
    });
  });
}

async function recordCountLineInTx(
  tx: Db,
  userId: string,
  args: {
    lineId: string;
    countedQuantity: number;
    expectedQuantity: number;
    unitCost: number;
  },
) {
  const variance = computeLineVariance({
    expectedQuantity: args.expectedQuantity,
    countedQuantity: args.countedQuantity,
    unitCost: args.unitCost,
  });
  await tx
    .update(inventoryCountLine)
    .set({
      countedQuantity: num(args.countedQuantity),
      varianceValue:
        variance.varianceValue == null ? null : num(variance.varianceValue),
      countedBy: userId,
      countedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(inventoryCountLine.id, args.lineId));
  return {
    lineId: args.lineId,
    varianceQuantity: variance.varianceQuantity,
    varianceValue: variance.varianceValue,
  };
}

export async function submitInventoryCount(
  organizationId: string,
  userId: string,
  id: string,
) {
  return getTenantDb(organizationId, async (tx) => {
    const headers = await tx
      .select()
      .from(inventoryCount)
      .where(
        and(
          eq(inventoryCount.organizationId, organizationId),
          eq(inventoryCount.id, id),
        ),
      )
      .limit(1);
    const header = headers[0];
    if (!header) {
      throw new InventoryCountError("Inventeringen hittades inte");
    }

    assertCountTransition(
      header.status as InventoryCountStatus,
      "pending_approval",
    );

    const lines = await tx
      .select()
      .from(inventoryCountLine)
      .where(
        and(
          eq(inventoryCountLine.organizationId, organizationId),
          eq(inventoryCountLine.inventoryCountId, id),
        ),
      );

    if (lines.length === 0) {
      throw new InventoryCountError("Inventeringen har inga rader");
    }
    const uncounted = lines.filter((l) => l.countedQuantity == null);
    if (uncounted.length > 0) {
      throw new InventoryCountError(
        `${uncounted.length} rader saknar räknat antal`,
      );
    }

    await tx
      .update(inventoryCount)
      .set({
        status: "pending_approval",
        countedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inventoryCount.id, id));

    return { id, status: "pending_approval" as const };
  });
}

export async function approveAndPostInventoryCount(
  organizationId: string,
  userId: string,
  id: string,
) {
  return getTenantDb(organizationId, async (tx) => {
    const headers = await tx
      .select()
      .from(inventoryCount)
      .where(
        and(
          eq(inventoryCount.organizationId, organizationId),
          eq(inventoryCount.id, id),
        ),
      )
      .limit(1);
    const header = headers[0];
    if (!header) {
      throw new InventoryCountError("Inventeringen hittades inte");
    }

    assertCountTransition(header.status as InventoryCountStatus, "posted");

    const lines = await tx
      .select()
      .from(inventoryCountLine)
      .where(
        and(
          eq(inventoryCountLine.organizationId, organizationId),
          eq(inventoryCountLine.inventoryCountId, id),
        ),
      );

    let postedTx = 0;
    for (const line of lines) {
      if (line.countedQuantity == null) {
        throw new InventoryCountError("Alla rader måste vara räknade");
      }
      const delta = adjustmentQuantity(
        Number(line.expectedQuantity),
        Number(line.countedQuantity),
      );
      if (delta === 0) continue;

      const loc = await loadLocationWithWarehouse(
        tx,
        organizationId,
        line.locationId,
      );
      if (!loc || !loc.isActive || !loc.warehouseActive) {
        throw new InventoryCountError(
          "Lagerplatsen är ogiltig eller inaktiv för bokföring",
        );
      }

      const existing = await loadBalance(
        tx,
        organizationId,
        line.partId,
        line.locationId,
        line.batchId,
      );

      let plan;
      try {
        plan = planStockPosting({
          type: "count",
          quantity: delta,
          locationId: line.locationId,
          current: toState(existing),
          unitCost: Number(line.unitCost),
          allowNegative: loc.allowNegativeStock,
        });
      } catch (err) {
        if (err instanceof StockPostingError) {
          throw new InventoryCountError(err.message);
        }
        throw err;
      }

      await tx.insert(stockTransaction).values({
        organizationId,
        type: plan.type,
        partId: line.partId,
        quantity: num(plan.quantity),
        fromLocationId: plan.fromLocationId,
        toLocationId: plan.toLocationId,
        batchId: line.batchId,
        serialUnitId: null,
        unitCost: num(plan.unitCost),
        referenceType: "count",
        referenceId: id,
        postedBy: userId,
        note: `Inventering ${header.name}`,
      });

      const nextBalance = plan.toBalance ?? plan.fromBalance;
      if (!nextBalance) {
        throw new InventoryCountError("Saknar saldoutfall efter inventering");
      }
      await upsertBalance(
        tx,
        organizationId,
        line.partId,
        line.locationId,
        line.batchId,
        existing?.id,
        nextBalance,
      );
      postedTx += 1;
    }

    const now = new Date();
    await tx
      .update(inventoryCount)
      .set({
        status: "posted",
        approvedAt: now,
        approvedBy: userId,
        postedAt: now,
        postedBy: userId,
        updatedAt: now,
      })
      .where(eq(inventoryCount.id, id));

    return { id, status: "posted" as const, postedTransactions: postedTx };
  });
}

export async function cancelInventoryCount(
  organizationId: string,
  userId: string,
  id: string,
) {
  return getTenantDb(organizationId, async (tx) => {
    const headers = await tx
      .select()
      .from(inventoryCount)
      .where(
        and(
          eq(inventoryCount.organizationId, organizationId),
          eq(inventoryCount.id, id),
        ),
      )
      .limit(1);
    const header = headers[0];
    if (!header) {
      throw new InventoryCountError("Inventeringen hittades inte");
    }

    assertCountTransition(header.status as InventoryCountStatus, "cancelled");

    await tx
      .update(inventoryCount)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
        note: header.note
          ? `${header.note} [avbruten av ${userId}]`
          : `Avbruten av ${userId}`,
      })
      .where(eq(inventoryCount.id, id));

    return { id, status: "cancelled" as const };
  });
}
