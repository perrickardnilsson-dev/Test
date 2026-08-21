import { and, asc, eq, ne } from "drizzle-orm";
import { getTenantDb, type Db } from "@/core/db/tenant";
import {
  bom,
  bomLine,
  part,
} from "../schema";
import {
  buildBomTree,
  calculateLowLevelCodes,
  detectCircularBom,
  type BomEdge,
  BomError,
} from "../domain/bom";
import type {
  CreateBomInput,
  UpdateBomInput,
  UpsertBomLineInput,
} from "../domain/planning-schemas";

function toNum(v: string | number): number {
  return typeof v === "number" ? v : Number(v);
}

async function loadActiveEdges(
  organizationId: string,
  tx: Db,
): Promise<BomEdge[]> {
  const rows = await tx
    .select({
      parentPartId: bom.parentPartId,
      componentPartId: bomLine.componentPartId,
      quantityPer: bomLine.quantityPer,
      scrapPercent: bomLine.scrapPercent,
      position: bomLine.position,
      status: bom.status,
    })
    .from(bomLine)
    .innerJoin(bom, eq(bomLine.bomId, bom.id))
    .where(
      and(
        eq(bom.organizationId, organizationId),
        eq(bom.status, "active"),
      ),
    );

  return rows.map((r) => ({
    parentPartId: r.parentPartId,
    componentPartId: r.componentPartId,
    quantityPer: toNum(r.quantityPer),
    scrapPercent: toNum(r.scrapPercent),
    position: r.position,
  }));
}

export async function recalculateLowLevelCodes(organizationId: string) {
  return getTenantDb(organizationId, async (tx) => {
    const parts = await tx
      .select({ id: part.id })
      .from(part)
      .where(eq(part.organizationId, organizationId));
    const edges = await loadActiveEdges(organizationId, tx);
    detectCircularBom(edges);
    const codes = calculateLowLevelCodes(
      parts.map((p) => p.id),
      edges,
    );
    for (const [partId, code] of Object.entries(codes)) {
      await tx
        .update(part)
        .set({ lowLevelCode: code, updatedAt: new Date() })
        .where(
          and(eq(part.organizationId, organizationId), eq(part.id, partId)),
        );
    }
    return codes;
  });
}

export async function listBoms(organizationId: string) {
  return getTenantDb(organizationId, async (tx) => {
    const rows = await tx
      .select({
        id: bom.id,
        parentPartId: bom.parentPartId,
        revision: bom.revision,
        status: bom.status,
        validFrom: bom.validFrom,
        partNumber: part.partNumber,
        description: part.description,
        updatedAt: bom.updatedAt,
      })
      .from(bom)
      .innerJoin(part, eq(bom.parentPartId, part.id))
      .where(eq(bom.organizationId, organizationId))
      .orderBy(asc(part.partNumber), asc(bom.revision));
    return rows;
  });
}

export async function getBomWithLines(organizationId: string, bomId: string) {
  return getTenantDb(organizationId, async (tx) => {
    const headers = await tx
      .select({
        id: bom.id,
        parentPartId: bom.parentPartId,
        revision: bom.revision,
        status: bom.status,
        validFrom: bom.validFrom,
        partNumber: part.partNumber,
        description: part.description,
        partType: part.type,
      })
      .from(bom)
      .innerJoin(part, eq(bom.parentPartId, part.id))
      .where(and(eq(bom.organizationId, organizationId), eq(bom.id, bomId)))
      .limit(1);
    const header = headers[0];
    if (!header) return null;

    const lines = await tx
      .select({
        id: bomLine.id,
        componentPartId: bomLine.componentPartId,
        quantityPer: bomLine.quantityPer,
        scrapPercent: bomLine.scrapPercent,
        position: bomLine.position,
        partNumber: part.partNumber,
        description: part.description,
        partType: part.type,
      })
      .from(bomLine)
      .innerJoin(part, eq(bomLine.componentPartId, part.id))
      .where(
        and(eq(bomLine.organizationId, organizationId), eq(bomLine.bomId, bomId)),
      )
      .orderBy(asc(bomLine.position), asc(part.partNumber));

    return { ...header, lines };
  });
}

export async function getBomTree(organizationId: string, parentPartId: string) {
  return getTenantDb(organizationId, async (tx) => {
    const edges = await loadActiveEdges(organizationId, tx);
    const parts = await tx
      .select({ id: part.id, type: part.type, partNumber: part.partNumber, description: part.description })
      .from(part)
      .where(eq(part.organizationId, organizationId));
    const partTypes: Record<string, "purchased" | "manufactured" | "phantom" | "service"> = {};
    const labels = new Map<string, { partNumber: string; description: string }>();
    for (const p of parts) {
      partTypes[p.id] = p.type;
      labels.set(p.id, { partNumber: p.partNumber, description: p.description });
    }
    const tree = buildBomTree(parentPartId, edges, partTypes);
    function annotate(
      node: ReturnType<typeof buildBomTree>,
    ): ReturnType<typeof buildBomTree> & {
      partNumber?: string;
      description?: string;
    } {
      const meta = labels.get(node.partId);
      return {
        ...node,
        partNumber: meta?.partNumber,
        description: meta?.description,
        children: node.children.map(annotate),
      };
    }
    return annotate(tree);
  });
}

export async function createBom(
  organizationId: string,
  userId: string,
  input: CreateBomInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const parent = await tx
      .select({ id: part.id, type: part.type })
      .from(part)
      .where(
        and(eq(part.organizationId, organizationId), eq(part.id, input.parentPartId)),
      )
      .limit(1);
    if (!parent[0]) throw new BomError("Överordnad artikel saknas");
    if (parent[0].type === "purchased" || parent[0].type === "service") {
      throw new BomError(
        "Struktur kan bara skapas för tillverkade eller fantomartiklar",
      );
    }

    if (input.status === "active") {
      await tx
        .update(bom)
        .set({ status: "obsolete", updatedAt: new Date() })
        .where(
          and(
            eq(bom.organizationId, organizationId),
            eq(bom.parentPartId, input.parentPartId),
            eq(bom.status, "active"),
          ),
        );
    }

    const [created] = await tx
      .insert(bom)
      .values({
        organizationId,
        parentPartId: input.parentPartId,
        revision: input.revision,
        status: input.status,
        validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
        createdBy: userId,
      })
      .returning();
    return created!;
  });
}

export async function updateBom(
  organizationId: string,
  input: UpdateBomInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const existing = await tx
      .select()
      .from(bom)
      .where(and(eq(bom.organizationId, organizationId), eq(bom.id, input.id)))
      .limit(1);
    if (!existing[0]) throw new BomError("Strukturen hittades inte");

    if (input.status === "active") {
      await tx
        .update(bom)
        .set({ status: "obsolete", updatedAt: new Date() })
        .where(
          and(
            eq(bom.organizationId, organizationId),
            eq(bom.parentPartId, existing[0].parentPartId),
            eq(bom.status, "active"),
            ne(bom.id, input.id),
          ),
        );
    }

    const [updated] = await tx
      .update(bom)
      .set({
        revision: input.revision ?? existing[0].revision,
        status: input.status ?? existing[0].status,
        validFrom: input.validFrom
          ? new Date(input.validFrom)
          : existing[0].validFrom,
        updatedAt: new Date(),
      })
      .where(and(eq(bom.organizationId, organizationId), eq(bom.id, input.id)))
      .returning();
    return updated!;
  }).then(async (row) => {
    if (input.status === "active" || row.status === "active") {
      await recalculateLowLevelCodes(organizationId);
    }
    return row;
  });
}

export async function upsertBomLine(
  organizationId: string,
  input: UpsertBomLineInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const header = await tx
      .select()
      .from(bom)
      .where(and(eq(bom.organizationId, organizationId), eq(bom.id, input.bomId)))
      .limit(1);
    if (!header[0]) throw new BomError("Strukturen hittades inte");
    if (header[0].parentPartId === input.componentPartId) {
      throw new BomError("Artikel kan inte vara komponent i sig själv");
    }

    const component = await tx
      .select({ id: part.id })
      .from(part)
      .where(
        and(
          eq(part.organizationId, organizationId),
          eq(part.id, input.componentPartId),
        ),
      )
      .limit(1);
    if (!component[0]) throw new BomError("Komponentartikeln saknas");

    // Cirkelkoll med hypotetisk edge
    const edges = await loadActiveEdges(organizationId, tx);
    const trial: BomEdge[] = [
      ...edges.filter(
        (e) =>
          !(
            e.parentPartId === header[0]!.parentPartId &&
            e.componentPartId === input.componentPartId
          ),
      ),
      {
        parentPartId: header[0].parentPartId,
        componentPartId: input.componentPartId,
        quantityPer: input.quantityPer,
        scrapPercent: input.scrapPercent,
      },
    ];
    // Even draft BOMs should not create cycles once activated — check against
    // all edges of this bom's parent if active, else just structural self-check
    if (header[0].status === "active") {
      detectCircularBom(trial);
    }

    if (input.lineId) {
      const [updated] = await tx
        .update(bomLine)
        .set({
          componentPartId: input.componentPartId,
          quantityPer: String(input.quantityPer),
          scrapPercent: String(input.scrapPercent),
          position: input.position,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bomLine.organizationId, organizationId),
            eq(bomLine.id, input.lineId),
          ),
        )
        .returning();
      return updated!;
    }

    const [created] = await tx
      .insert(bomLine)
      .values({
        organizationId,
        bomId: input.bomId,
        componentPartId: input.componentPartId,
        quantityPer: String(input.quantityPer),
        scrapPercent: String(input.scrapPercent),
        position: input.position,
      })
      .returning();
    return created!;
  }).then(async (row) => {
    const header = await getBomWithLines(organizationId, input.bomId);
    if (header?.status === "active") {
      await recalculateLowLevelCodes(organizationId);
    }
    return row;
  });
}

export async function deleteBomLine(organizationId: string, lineId: string) {
  return getTenantDb(organizationId, async (tx) => {
    const rows = await tx
      .select({ id: bomLine.id, bomId: bomLine.bomId })
      .from(bomLine)
      .where(
        and(eq(bomLine.organizationId, organizationId), eq(bomLine.id, lineId)),
      )
      .limit(1);
    if (!rows[0]) throw new BomError("BOM-raden hittades inte");
    await tx
      .delete(bomLine)
      .where(
        and(eq(bomLine.organizationId, organizationId), eq(bomLine.id, lineId)),
      );
    return rows[0];
  }).then(async (row) => {
    const header = await getBomWithLines(organizationId, row.bomId);
    if (header?.status === "active") {
      await recalculateLowLevelCodes(organizationId);
    }
    return row;
  });
}
