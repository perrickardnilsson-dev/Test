import { and, eq, sql } from "drizzle-orm";
import { getTenantDb } from "@/core/db/tenant";
import { batch, genealogyEdge, part, serialUnit } from "../schema";
import {
  buildGenealogyTree,
  summarizeTraceImpact,
  type FlatGenealogyEdge,
  type GenealogyNodeRef,
} from "../domain/genealogy";
import type { CreateGenealogyEdgeInput } from "../domain/stock-schemas";

export async function createGenealogyEdge(
  organizationId: string,
  userId: string,
  input: CreateGenealogyEdgeInput,
) {
  if (!input.consumedBatchId && !input.consumedSerialId) {
    throw new Error("Förbrukad batch eller individ krävs");
  }
  if (!input.producedBatchId && !input.producedSerialId) {
    throw new Error("Producerad batch eller individ krävs");
  }

  return getTenantDb(organizationId, async (tx) => {
    const [created] = await tx
      .insert(genealogyEdge)
      .values({
        organizationId,
        consumedBatchId: input.consumedBatchId ?? null,
        consumedSerialId: input.consumedSerialId ?? null,
        producedBatchId: input.producedBatchId ?? null,
        producedSerialId: input.producedSerialId ?? null,
        quantity: String(input.quantity),
        manufacturingOrderRef: input.manufacturingOrderRef ?? null,
        createdBy: userId,
      })
      .returning();
    return created!;
  });
}

async function loadLabels(
  organizationId: string,
  batchIds: string[],
  serialIds: string[],
) {
  return getTenantDb(organizationId, async (tx) => {
    const map = new Map<string, GenealogyNodeRef>();

    if (batchIds.length > 0) {
      const rows = await tx
        .select({
          id: batch.id,
          batchNumber: batch.batchNumber,
          partNumber: part.partNumber,
          partDescription: part.description,
        })
        .from(batch)
        .innerJoin(part, eq(batch.partId, part.id))
        .where(eq(batch.organizationId, organizationId));
      for (const row of rows) {
        if (!batchIds.includes(row.id)) continue;
        map.set(`batch:${row.id}`, {
          kind: "batch",
          id: row.id,
          label: row.batchNumber,
          partNumber: row.partNumber,
          partDescription: row.partDescription,
        });
      }
    }

    if (serialIds.length > 0) {
      const rows = await tx
        .select({
          id: serialUnit.id,
          serialNumber: serialUnit.serialNumber,
          partNumber: part.partNumber,
          partDescription: part.description,
        })
        .from(serialUnit)
        .innerJoin(part, eq(serialUnit.partId, part.id))
        .where(eq(serialUnit.organizationId, organizationId));
      for (const row of rows) {
        if (!serialIds.includes(row.id)) continue;
        map.set(`serial:${row.id}`, {
          kind: "serial",
          id: row.id,
          label: row.serialNumber,
          partNumber: row.partNumber,
          partDescription: row.partDescription,
        });
      }
    }

    return map;
  });
}

type TraceQuery = {
  batchId?: string | null;
  serialUnitId?: string | null;
  direction: "forward" | "backward";
  maxDepth?: number;
};

function extractRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const withRows = result as { rows?: Record<string, unknown>[] };
  return withRows.rows ?? [];
}

/**
 * Spårar genealogi med WITH RECURSIVE åt båda håll.
 */
export async function traceGenealogy(
  organizationId: string,
  query: TraceQuery,
) {
  const maxDepth = query.maxDepth ?? 10;
  const startBatch = query.batchId ?? null;
  const startSerial = query.serialUnitId ?? null;
  if (!startBatch && !startSerial) {
    throw new Error("Ange batch eller individ att spåra");
  }

  const { edges, batchIds, serialIds } = await getTenantDb(
    organizationId,
    async (tx) => {
      const recursiveSql =
        query.direction === "forward"
          ? sql`
            WITH RECURSIVE walk AS (
              SELECT
                g.consumed_batch_id,
                g.consumed_serial_id,
                g.produced_batch_id,
                g.produced_serial_id,
                g.quantity,
                g.manufacturing_order_ref,
                1 AS depth
              FROM genealogy_edge g
              WHERE g.organization_id = ${organizationId}
                AND (
                  (${startBatch}::uuid IS NOT NULL AND g.consumed_batch_id = ${startBatch}::uuid)
                  OR (${startSerial}::uuid IS NOT NULL AND g.consumed_serial_id = ${startSerial}::uuid)
                )
              UNION ALL
              SELECT
                g.consumed_batch_id,
                g.consumed_serial_id,
                g.produced_batch_id,
                g.produced_serial_id,
                g.quantity,
                g.manufacturing_order_ref,
                walk.depth + 1
              FROM genealogy_edge g
              INNER JOIN walk ON (
                (walk.produced_batch_id IS NOT NULL AND g.consumed_batch_id = walk.produced_batch_id)
                OR (walk.produced_serial_id IS NOT NULL AND g.consumed_serial_id = walk.produced_serial_id)
              )
              WHERE g.organization_id = ${organizationId}
                AND walk.depth < ${maxDepth}
            )
            SELECT * FROM walk
          `
          : sql`
            WITH RECURSIVE walk AS (
              SELECT
                g.consumed_batch_id,
                g.consumed_serial_id,
                g.produced_batch_id,
                g.produced_serial_id,
                g.quantity,
                g.manufacturing_order_ref,
                1 AS depth
              FROM genealogy_edge g
              WHERE g.organization_id = ${organizationId}
                AND (
                  (${startBatch}::uuid IS NOT NULL AND g.produced_batch_id = ${startBatch}::uuid)
                  OR (${startSerial}::uuid IS NOT NULL AND g.produced_serial_id = ${startSerial}::uuid)
                )
              UNION ALL
              SELECT
                g.consumed_batch_id,
                g.consumed_serial_id,
                g.produced_batch_id,
                g.produced_serial_id,
                g.quantity,
                g.manufacturing_order_ref,
                walk.depth + 1
              FROM genealogy_edge g
              INNER JOIN walk ON (
                (walk.consumed_batch_id IS NOT NULL AND g.produced_batch_id = walk.consumed_batch_id)
                OR (walk.consumed_serial_id IS NOT NULL AND g.produced_serial_id = walk.consumed_serial_id)
              )
              WHERE g.organization_id = ${organizationId}
                AND walk.depth < ${maxDepth}
            )
            SELECT * FROM walk
          `;

      const result = await tx.execute(recursiveSql);
      const rows = extractRows(result);

      const edges: FlatGenealogyEdge[] = rows.map((r) => ({
        consumedBatchId: (r.consumed_batch_id as string | null) ?? null,
        consumedSerialId: (r.consumed_serial_id as string | null) ?? null,
        producedBatchId: (r.produced_batch_id as string | null) ?? null,
        producedSerialId: (r.produced_serial_id as string | null) ?? null,
        quantity: Number(r.quantity ?? 0),
        manufacturingOrderRef:
          (r.manufacturing_order_ref as string | null) ?? null,
        depth: Number(r.depth ?? 1),
      }));

      const batchIdSet = new Set<string>();
      const serialIdSet = new Set<string>();
      if (startBatch) batchIdSet.add(startBatch);
      if (startSerial) serialIdSet.add(startSerial);
      for (const e of edges) {
        if (e.consumedBatchId) batchIdSet.add(e.consumedBatchId);
        if (e.producedBatchId) batchIdSet.add(e.producedBatchId);
        if (e.consumedSerialId) serialIdSet.add(e.consumedSerialId);
        if (e.producedSerialId) serialIdSet.add(e.producedSerialId);
      }

      return {
        edges,
        batchIds: [...batchIdSet],
        serialIds: [...serialIdSet],
      };
    },
  );

  const labels = await loadLabels(organizationId, batchIds, serialIds);
  const rootKey = startBatch ? `batch:${startBatch}` : `serial:${startSerial}`;
  const root: GenealogyNodeRef = labels.get(rootKey) ?? {
    kind: startBatch ? "batch" : "serial",
    id: (startBatch ?? startSerial)!,
    label: startBatch ?? startSerial ?? "?",
  };

  const tree = buildGenealogyTree(root, edges, query.direction, labels);
  const summary = summarizeTraceImpact(
    root.label,
    query.direction,
    edges,
    labels,
  );

  return { tree, summary, edgeCount: edges.length };
}

export async function findBatchByNumber(
  organizationId: string,
  batchNumber: string,
) {
  return getTenantDb(organizationId, async (tx) => {
    const rows = await tx
      .select({
        id: batch.id,
        batchNumber: batch.batchNumber,
        partId: batch.partId,
        partNumber: part.partNumber,
        status: batch.status,
      })
      .from(batch)
      .innerJoin(part, eq(batch.partId, part.id))
      .where(
        and(
          eq(batch.organizationId, organizationId),
          eq(batch.batchNumber, batchNumber),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function findSerialByNumber(
  organizationId: string,
  serialNumber: string,
) {
  return getTenantDb(organizationId, async (tx) => {
    const rows = await tx
      .select({
        id: serialUnit.id,
        serialNumber: serialUnit.serialNumber,
        partId: serialUnit.partId,
        partNumber: part.partNumber,
        batchId: serialUnit.batchId,
        status: serialUnit.status,
      })
      .from(serialUnit)
      .innerJoin(part, eq(serialUnit.partId, part.id))
      .where(
        and(
          eq(serialUnit.organizationId, organizationId),
          eq(serialUnit.serialNumber, serialNumber),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}
