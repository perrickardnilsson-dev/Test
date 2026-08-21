import { and, asc, eq, ilike, or } from "drizzle-orm";
import { getTenantDb } from "@/core/db/tenant";
import { batch, part, serialUnit } from "../schema";
import type {
  CreateBatchInput,
  CreateSerialUnitInput,
} from "../domain/stock-schemas";

export async function listBatches(
  organizationId: string,
  opts?: { partId?: string | null; search?: string },
) {
  return getTenantDb(organizationId, async (tx) => {
    const conditions = [eq(batch.organizationId, organizationId)];
    if (opts?.partId) {
      conditions.push(eq(batch.partId, opts.partId));
    }
    if (opts?.search?.trim()) {
      const q = `%${opts.search.trim()}%`;
      conditions.push(
        or(
          ilike(batch.batchNumber, q),
          ilike(batch.supplierBatchNumber, q),
          ilike(part.partNumber, q),
        )!,
      );
    }

    return tx
      .select({
        id: batch.id,
        partId: batch.partId,
        partNumber: part.partNumber,
        partDescription: part.description,
        batchNumber: batch.batchNumber,
        supplierBatchNumber: batch.supplierBatchNumber,
        productionDate: batch.productionDate,
        expiryDate: batch.expiryDate,
        certificateRef: batch.certificateRef,
        status: batch.status,
        createdAt: batch.createdAt,
      })
      .from(batch)
      .innerJoin(part, eq(batch.partId, part.id))
      .where(and(...conditions))
      .orderBy(asc(batch.batchNumber));
  });
}

export async function getBatch(organizationId: string, batchId: string) {
  return getTenantDb(organizationId, async (tx) => {
    const rows = await tx
      .select({
        id: batch.id,
        partId: batch.partId,
        partNumber: part.partNumber,
        partDescription: part.description,
        batchNumber: batch.batchNumber,
        supplierBatchNumber: batch.supplierBatchNumber,
        productionDate: batch.productionDate,
        expiryDate: batch.expiryDate,
        certificateRef: batch.certificateRef,
        status: batch.status,
      })
      .from(batch)
      .innerJoin(part, eq(batch.partId, part.id))
      .where(
        and(eq(batch.organizationId, organizationId), eq(batch.id, batchId)),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function createBatch(
  organizationId: string,
  userId: string,
  input: CreateBatchInput,
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
      throw new Error("Artikel hittades inte");
    }
    if (partRows[0].traceabilityMode === "none") {
      throw new Error("Artikeln saknar batchspårning");
    }

    const existing = await tx
      .select({ id: batch.id })
      .from(batch)
      .where(
        and(
          eq(batch.organizationId, organizationId),
          eq(batch.partId, input.partId),
          eq(batch.batchNumber, input.batchNumber),
        ),
      )
      .limit(1);
    if (existing[0]) {
      throw new Error(`Batch ${input.batchNumber} finns redan`);
    }

    const [created] = await tx
      .insert(batch)
      .values({
        organizationId,
        partId: input.partId,
        batchNumber: input.batchNumber,
        supplierBatchNumber: input.supplierBatchNumber ?? null,
        productionDate: input.productionDate ?? null,
        expiryDate: input.expiryDate ?? null,
        certificateRef: input.certificateRef ?? null,
        status: input.status,
        createdBy: userId,
      })
      .returning();
    return created!;
  });
}

export async function listSerialUnits(
  organizationId: string,
  opts?: { partId?: string | null; batchId?: string | null; search?: string },
) {
  return getTenantDb(organizationId, async (tx) => {
    const conditions = [eq(serialUnit.organizationId, organizationId)];
    if (opts?.partId) {
      conditions.push(eq(serialUnit.partId, opts.partId));
    }
    if (opts?.batchId) {
      conditions.push(eq(serialUnit.batchId, opts.batchId));
    }
    if (opts?.search?.trim()) {
      const q = `%${opts.search.trim()}%`;
      conditions.push(
        or(ilike(serialUnit.serialNumber, q), ilike(part.partNumber, q))!,
      );
    }

    return tx
      .select({
        id: serialUnit.id,
        partId: serialUnit.partId,
        partNumber: part.partNumber,
        partDescription: part.description,
        serialNumber: serialUnit.serialNumber,
        batchId: serialUnit.batchId,
        status: serialUnit.status,
        currentLocationId: serialUnit.currentLocationId,
        createdAt: serialUnit.createdAt,
      })
      .from(serialUnit)
      .innerJoin(part, eq(serialUnit.partId, part.id))
      .where(and(...conditions))
      .orderBy(asc(serialUnit.serialNumber));
  });
}

export async function createSerialUnit(
  organizationId: string,
  userId: string,
  input: CreateSerialUnitInput,
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
      throw new Error("Artikel hittades inte");
    }
    if (partRows[0].traceabilityMode !== "serial") {
      throw new Error("Artikeln saknar seriespårning");
    }

    const existing = await tx
      .select({ id: serialUnit.id })
      .from(serialUnit)
      .where(
        and(
          eq(serialUnit.organizationId, organizationId),
          eq(serialUnit.partId, input.partId),
          eq(serialUnit.serialNumber, input.serialNumber),
        ),
      )
      .limit(1);
    if (existing[0]) {
      throw new Error(`Serienummer ${input.serialNumber} finns redan`);
    }

    const [created] = await tx
      .insert(serialUnit)
      .values({
        organizationId,
        partId: input.partId,
        serialNumber: input.serialNumber,
        batchId: input.batchId ?? null,
        currentLocationId: input.currentLocationId ?? null,
        status: input.status,
        createdBy: userId,
      })
      .returning();
    return created!;
  });
}
