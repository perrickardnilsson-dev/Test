import { and, eq } from "drizzle-orm";
import { getTenantDb } from "@/core/db/tenant";
import {
  batch,
  genealogyEdge,
  part,
  serialUnit,
  stockBalance,
  stockLocation,
  warehouse,
} from "../schema";

/**
 * Seedar en realistisk återkallningsdemo:
 * Råmaterialbatch B-RAW-4471 → FG-batch B-FG-220 → serier SN-FG-001..003
 * Spårning framåt från B-RAW-4471 visar färdigvaror och individer.
 */
export async function seedRecallDemo(
  organizationId: string,
  userId: string,
): Promise<{
  rawBatchNumber: string;
  finishedBatchNumber: string;
  serialNumbers: string[];
  message: string;
}> {
  return getTenantDb(organizationId, async (tx) => {
    // Warehouse + location
    let wh = (
      await tx
        .select()
        .from(warehouse)
        .where(eq(warehouse.organizationId, organizationId))
        .limit(1)
    )[0];
    if (!wh) {
      const [created] = await tx
        .insert(warehouse)
        .values({
          organizationId,
          code: "HUVUD",
          name: "Huvudlager",
          createdBy: userId,
        })
        .returning();
      wh = created!;
    }

    let loc = (
      await tx
        .select()
        .from(stockLocation)
        .where(
          and(
            eq(stockLocation.organizationId, organizationId),
            eq(stockLocation.warehouseId, wh.id),
          ),
        )
        .limit(1)
    )[0];
    if (!loc) {
      const [created] = await tx
        .insert(stockLocation)
        .values({
          organizationId,
          warehouseId: wh.id,
          code: "A-01-01",
          name: "Plock A",
          type: "picking",
          createdBy: userId,
        })
        .returning();
      loc = created!;
    }

    async function upsertPart(
      partNumber: string,
      description: string,
      mode: "batch" | "serial",
      type: "purchased" | "manufactured",
    ) {
      const existing = await tx
        .select()
        .from(part)
        .where(
          and(
            eq(part.organizationId, organizationId),
            eq(part.partNumber, partNumber),
          ),
        )
        .limit(1);
      if (existing[0]) {
        await tx
          .update(part)
          .set({ traceabilityMode: mode, updatedAt: new Date() })
          .where(eq(part.id, existing[0].id));
        return existing[0];
      }
      const [created] = await tx
        .insert(part)
        .values({
          organizationId,
          partNumber,
          description,
          type,
          unit: "st",
          traceabilityMode: mode,
          createdBy: userId,
        })
        .returning();
      return created!;
    }

    const rawPart = await upsertPart(
      "RAW-SS316",
      "Rostfri stång Ø12",
      "batch",
      "purchased",
    );
    const fgPart = await upsertPart(
      "FG-AXEL-12",
      "Axel komplett 12mm",
      "serial",
      "manufactured",
    );

    async function upsertBatch(
      partId: string,
      batchNumber: string,
      supplierBatchNumber?: string,
    ) {
      const existing = await tx
        .select()
        .from(batch)
        .where(
          and(
            eq(batch.organizationId, organizationId),
            eq(batch.partId, partId),
            eq(batch.batchNumber, batchNumber),
          ),
        )
        .limit(1);
      if (existing[0]) return existing[0];
      const [created] = await tx
        .insert(batch)
        .values({
          organizationId,
          partId,
          batchNumber,
          supplierBatchNumber: supplierBatchNumber ?? null,
          certificateRef: supplierBatchNumber
            ? `CERT-${supplierBatchNumber}`
            : null,
          createdBy: userId,
        })
        .returning();
      return created!;
    }

    const rawBatch = await upsertBatch(rawPart.id, "B-RAW-4471", "LEV-4471");
    const fgBatch = await upsertBatch(fgPart.id, "B-FG-220");

    // Saldo för råbatch
    const rawBal = await tx
      .select()
      .from(stockBalance)
      .where(
        and(
          eq(stockBalance.organizationId, organizationId),
          eq(stockBalance.partId, rawPart.id),
          eq(stockBalance.locationId, loc.id),
          eq(stockBalance.batchId, rawBatch.id),
        ),
      )
      .limit(1);
    if (!rawBal[0]) {
      await tx.insert(stockBalance).values({
        organizationId,
        partId: rawPart.id,
        locationId: loc.id,
        batchId: rawBatch.id,
        quantity: "100",
        averageCost: "45.50",
      });
    }

    const serialNumbers = ["SN-FG-001", "SN-FG-002", "SN-FG-003"];
    const serialIds: string[] = [];
    for (const sn of serialNumbers) {
      const existing = await tx
        .select()
        .from(serialUnit)
        .where(
          and(
            eq(serialUnit.organizationId, organizationId),
            eq(serialUnit.partId, fgPart.id),
            eq(serialUnit.serialNumber, sn),
          ),
        )
        .limit(1);
      if (existing[0]) {
        serialIds.push(existing[0].id);
        continue;
      }
      const [created] = await tx
        .insert(serialUnit)
        .values({
          organizationId,
          partId: fgPart.id,
          serialNumber: sn,
          batchId: fgBatch.id,
          currentLocationId: loc.id,
          status: "available",
          createdBy: userId,
        })
        .returning();
      serialIds.push(created!.id);

      await tx.insert(stockBalance).values({
        organizationId,
        partId: fgPart.id,
        locationId: loc.id,
        batchId: fgBatch.id,
        quantity: "1",
        averageCost: "220",
      }).onConflictDoNothing?.();
    }

    // Genealogi: raw → fg batch, fg batch → each serial
    const existingEdges = await tx
      .select({ id: genealogyEdge.id })
      .from(genealogyEdge)
      .where(eq(genealogyEdge.organizationId, organizationId))
      .limit(1);

    if (!existingEdges[0]) {
      await tx.insert(genealogyEdge).values({
        organizationId,
        consumedBatchId: rawBatch.id,
        producedBatchId: fgBatch.id,
        quantity: "30",
        manufacturingOrderRef: "TO-2201",
        createdBy: userId,
      });
      for (const sid of serialIds) {
        await tx.insert(genealogyEdge).values({
          organizationId,
          consumedBatchId: fgBatch.id,
          producedSerialId: sid,
          quantity: "1",
          manufacturingOrderRef: "TO-2201",
          createdBy: userId,
        });
      }
    }

    return {
      rawBatchNumber: "B-RAW-4471",
      finishedBatchNumber: "B-FG-220",
      serialNumbers,
      message:
        "Demo laddad. Sök batch B-RAW-4471 och spåra framåt för återkallningspåverkan.",
    };
  });
}
