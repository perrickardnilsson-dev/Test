import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getTenantDb } from "@/core/db/tenant";
import {
  bom,
  bomLine,
  demandLine,
  netRequirementRun,
  part,
  planningSuggestion,
  stockBalance,
  supplyLine,
} from "../schema";
import {
  runMrp,
  type PartPlanningProfile,
  type TimePhasedQty,
  MrpError,
} from "../domain/mrp";
import type { BomEdge } from "../domain/bom";
import { recalculateLowLevelCodes } from "./bom";
import type {
  CreateDemandLineInput,
  CreateSupplyLineInput,
} from "../domain/planning-schemas";

function toNum(v: string | number): number {
  return typeof v === "number" ? v : Number(v);
}

function toIsoDate(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export async function listDemandLines(organizationId: string) {
  return getTenantDb(organizationId, async (tx) => {
    return tx
      .select({
        id: demandLine.id,
        partId: demandLine.partId,
        quantity: demandLine.quantity,
        dueDate: demandLine.dueDate,
        sourceType: demandLine.sourceType,
        sourceId: demandLine.sourceId,
        status: demandLine.status,
        note: demandLine.note,
        partNumber: part.partNumber,
        description: part.description,
      })
      .from(demandLine)
      .innerJoin(part, eq(demandLine.partId, part.id))
      .where(
        and(
          eq(demandLine.organizationId, organizationId),
          eq(demandLine.status, "open"),
        ),
      )
      .orderBy(asc(demandLine.dueDate));
  });
}

export async function listSupplyLines(organizationId: string) {
  return getTenantDb(organizationId, async (tx) => {
    return tx
      .select({
        id: supplyLine.id,
        partId: supplyLine.partId,
        quantity: supplyLine.quantity,
        dueDate: supplyLine.dueDate,
        sourceType: supplyLine.sourceType,
        sourceId: supplyLine.sourceId,
        status: supplyLine.status,
        note: supplyLine.note,
        partNumber: part.partNumber,
        description: part.description,
      })
      .from(supplyLine)
      .innerJoin(part, eq(supplyLine.partId, part.id))
      .where(
        and(
          eq(supplyLine.organizationId, organizationId),
          eq(supplyLine.status, "open"),
        ),
      )
      .orderBy(asc(supplyLine.dueDate));
  });
}

export async function createDemandLine(
  organizationId: string,
  userId: string,
  input: CreateDemandLineInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const [created] = await tx
      .insert(demandLine)
      .values({
        organizationId,
        partId: input.partId,
        quantity: String(input.quantity),
        dueDate: new Date(input.dueDate),
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        note: input.note ?? null,
        createdBy: userId,
      })
      .returning();
    return created!;
  });
}

export async function createSupplyLine(
  organizationId: string,
  userId: string,
  input: CreateSupplyLineInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const [created] = await tx
      .insert(supplyLine)
      .values({
        organizationId,
        partId: input.partId,
        quantity: String(input.quantity),
        dueDate: new Date(input.dueDate),
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        note: input.note ?? null,
        createdBy: userId,
      })
      .returning();
    return created!;
  });
}

export async function listNetRequirementRuns(organizationId: string) {
  return getTenantDb(organizationId, async (tx) => {
    return tx
      .select()
      .from(netRequirementRun)
      .where(eq(netRequirementRun.organizationId, organizationId))
      .orderBy(desc(netRequirementRun.runAt))
      .limit(20);
  });
}

export async function listPlanningSuggestions(
  organizationId: string,
  runId?: string,
) {
  return getTenantDb(organizationId, async (tx) => {
    const conditions = [eq(planningSuggestion.organizationId, organizationId)];
    if (runId) {
      conditions.push(eq(planningSuggestion.runId, runId));
    } else {
      // Senaste körning
      const latest = await tx
        .select({ id: netRequirementRun.id })
        .from(netRequirementRun)
        .where(
          and(
            eq(netRequirementRun.organizationId, organizationId),
            eq(netRequirementRun.status, "completed"),
          ),
        )
        .orderBy(desc(netRequirementRun.runAt))
        .limit(1);
      if (!latest[0]) return [];
      conditions.push(eq(planningSuggestion.runId, latest[0].id));
    }

    return tx
      .select({
        id: planningSuggestion.id,
        runId: planningSuggestion.runId,
        partId: planningSuggestion.partId,
        suggestionType: planningSuggestion.suggestionType,
        quantity: planningSuggestion.quantity,
        dueDate: planningSuggestion.dueDate,
        orderDate: planningSuggestion.orderDate,
        isLate: planningSuggestion.isLate,
        status: planningSuggestion.status,
        pegging: planningSuggestion.pegging,
        partNumber: part.partNumber,
        description: part.description,
      })
      .from(planningSuggestion)
      .innerJoin(part, eq(planningSuggestion.partId, part.id))
      .where(and(...conditions))
      .orderBy(
        desc(planningSuggestion.isLate),
        asc(planningSuggestion.orderDate),
        asc(part.partNumber),
      );
  });
}

export async function updateSuggestionStatuses(
  organizationId: string,
  suggestionIds: string[],
  status: "open" | "accepted" | "rejected",
) {
  return getTenantDb(organizationId, async (tx) => {
    const updated = await tx
      .update(planningSuggestion)
      .set({ status })
      .where(
        and(
          eq(planningSuggestion.organizationId, organizationId),
          inArray(planningSuggestion.id, suggestionIds),
        ),
      )
      .returning({ id: planningSuggestion.id });
    return updated;
  });
}

/**
 * Kör NBK: läs artiklar, aktiva BOM:ar, behov, tillgång, saldo → runMrp → spara.
 */
export async function executeNetRequirementRun(
  organizationId: string,
  userId: string,
  asOfDateIso?: string,
) {
  const asOfDate = asOfDateIso ? new Date(asOfDateIso) : new Date();
  const asOfIso = toIsoDate(asOfDate);

  await recalculateLowLevelCodes(organizationId);

  const runRow = await getTenantDb(organizationId, async (tx) => {
    const [created] = await tx
      .insert(netRequirementRun)
      .values({
        organizationId,
        asOfDate,
        status: "running",
        createdBy: userId,
      })
      .returning();
    return created!;
  });

  try {
    const snapshot = await getTenantDb(organizationId, async (tx) => {
      const parts = await tx
        .select({
          id: part.id,
          type: part.type,
          leadTimeDays: part.leadTimeDays,
          safetyStock: part.safetyStock,
          lotSizingRule: part.lotSizingRule,
          lotSize: part.lotSize,
          planningMethod: part.planningMethod,
        })
        .from(part)
        .where(eq(part.organizationId, organizationId));

      const edges = await tx
        .select({
          parentPartId: bom.parentPartId,
          componentPartId: bomLine.componentPartId,
          quantityPer: bomLine.quantityPer,
          scrapPercent: bomLine.scrapPercent,
          position: bomLine.position,
        })
        .from(bomLine)
        .innerJoin(bom, eq(bomLine.bomId, bom.id))
        .where(
          and(eq(bom.organizationId, organizationId), eq(bom.status, "active")),
        );

      const demands = await tx
        .select()
        .from(demandLine)
        .where(
          and(
            eq(demandLine.organizationId, organizationId),
            eq(demandLine.status, "open"),
          ),
        );

      const supplies = await tx
        .select()
        .from(supplyLine)
        .where(
          and(
            eq(supplyLine.organizationId, organizationId),
            eq(supplyLine.status, "open"),
          ),
        );

      const balances = await tx
        .select({
          partId: stockBalance.partId,
          qty: sql<string>`sum(${stockBalance.quantity})`,
        })
        .from(stockBalance)
        .where(eq(stockBalance.organizationId, organizationId))
        .groupBy(stockBalance.partId);

      return { parts, edges, demands, supplies, balances };
    });

    const profiles: PartPlanningProfile[] = snapshot.parts.map((p) => ({
      id: p.id,
      type: p.type,
      leadTimeDays: p.leadTimeDays,
      safetyStock: toNum(p.safetyStock),
      lotSizingRule: p.lotSizingRule,
      lotSize: p.lotSize == null ? null : toNum(p.lotSize),
      planningMethod: p.planningMethod,
    }));

    const bomEdges: BomEdge[] = snapshot.edges.map((e) => ({
      parentPartId: e.parentPartId,
      componentPartId: e.componentPartId,
      quantityPer: toNum(e.quantityPer),
      scrapPercent: toNum(e.scrapPercent),
      position: e.position,
    }));

    const demands: TimePhasedQty[] = snapshot.demands.map((d) => ({
      partId: d.partId,
      quantity: toNum(d.quantity),
      dueDate: toIsoDate(d.dueDate),
      sourceType: d.sourceType,
      sourceId: d.sourceId,
    }));

    const supplies: TimePhasedQty[] = snapshot.supplies.map((s) => ({
      partId: s.partId,
      quantity: toNum(s.quantity),
      dueDate: toIsoDate(s.dueDate),
      sourceType: s.sourceType,
      sourceId: s.sourceId,
    }));

    const onHandByPart: Record<string, number> = {};
    for (const b of snapshot.balances) {
      onHandByPart[b.partId] = toNum(b.qty);
    }

    // Persist LLC from run
    const result = runMrp({
      asOfDate: asOfIso,
      parts: profiles,
      bomEdges,
      demands,
      supplies,
      onHandByPart,
    });

    await getTenantDb(organizationId, async (tx) => {
      for (const [partId, code] of Object.entries(result.lowLevelCodes)) {
        await tx
          .update(part)
          .set({ lowLevelCode: code, updatedAt: new Date() })
          .where(and(eq(part.organizationId, organizationId), eq(part.id, partId)));
      }

      if (result.suggestions.length > 0) {
        await tx.insert(planningSuggestion).values(
          result.suggestions.map((s) => ({
            organizationId,
            runId: runRow.id,
            partId: s.partId,
            suggestionType: s.suggestionType,
            quantity: String(s.quantity),
            dueDate: new Date(s.dueDate),
            orderDate: new Date(s.orderDate),
            isLate: s.isLate,
            pegging: s.pegging,
          })),
        );
      }

      await tx
        .update(netRequirementRun)
        .set({
          status: "completed",
          suggestionCount: result.suggestions.length,
          message: `${result.suggestions.length} förslag, ${result.dependentDemands.length} beroende behov`,
        })
        .where(
          and(
            eq(netRequirementRun.organizationId, organizationId),
            eq(netRequirementRun.id, runRow.id),
          ),
        );
    });

    return {
      runId: runRow.id,
      suggestionCount: result.suggestions.length,
      dependentDemandCount: result.dependentDemands.length,
    };
  } catch (err) {
    const message =
      err instanceof MrpError || err instanceof Error
        ? err.message
        : "NBK misslyckades";
    await getTenantDb(organizationId, async (tx) => {
      await tx
        .update(netRequirementRun)
        .set({ status: "failed", message })
        .where(
          and(
            eq(netRequirementRun.organizationId, organizationId),
            eq(netRequirementRun.id, runRow.id),
          ),
        );
    });
    throw err instanceof Error ? err : new MrpError(message);
  }
}

/**
 * Seed: flernivå-BOM + kundbehov så NBK går att demo:a direkt.
 */
export async function seedMrpDemo(organizationId: string, userId: string) {
  return getTenantDb(organizationId, async (tx) => {
    async function ensurePart(
      partNumber: string,
      description: string,
      type: "purchased" | "manufactured" | "phantom",
      extras: {
        leadTimeDays?: number;
        safetyStock?: string;
        lotSizingRule?: "lot_for_lot" | "fixed_qty" | "min_qty";
        lotSize?: string;
      } = {},
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
      if (existing[0]) return existing[0];
      const [created] = await tx
        .insert(part)
        .values({
          organizationId,
          partNumber,
          description,
          type,
          unit: "st",
          leadTimeDays: extras.leadTimeDays ?? 5,
          safetyStock: extras.safetyStock ?? "0",
          lotSizingRule: extras.lotSizingRule ?? "lot_for_lot",
          lotSize: extras.lotSize ?? null,
          planningMethod: "mrp",
          createdBy: userId,
        })
        .returning();
      return created!;
    }

    const fg = await ensurePart("FG-PUMP-01", "Hydraulpump komplett", "manufactured", {
      leadTimeDays: 7,
    });
    const sa = await ensurePart("SA-HUS-01", "Pumphus-enhet", "manufactured", {
      leadTimeDays: 4,
    });
    const ph = await ensurePart("PH-KIT-01", "Monteringskit (fantom)", "phantom", {
      leadTimeDays: 0,
    });
    const raw1 = await ensurePart("RAW-GJL-01", "Gjutgods hus", "purchased", {
      leadTimeDays: 14,
      safetyStock: "10",
      lotSizingRule: "fixed_qty",
      lotSize: "50",
    });
    const raw2 = await ensurePart("RAW-AXEL-01", "Axel stål", "purchased", {
      leadTimeDays: 10,
      lotSizingRule: "min_qty",
      lotSize: "20",
    });
    const raw3 = await ensurePart("RAW-PACK-01", "Packningssats", "purchased", {
      leadTimeDays: 5,
    });

    async function ensureBom(
      parentId: string,
      revision: string,
      lines: Array<{
        componentId: string;
        qty: number;
        scrap?: number;
        position: number;
      }>,
    ) {
      const existing = await tx
        .select()
        .from(bom)
        .where(
          and(
            eq(bom.organizationId, organizationId),
            eq(bom.parentPartId, parentId),
            eq(bom.revision, revision),
          ),
        )
        .limit(1);
      let bomId = existing[0]?.id;
      if (!bomId) {
        await tx
          .update(bom)
          .set({ status: "obsolete", updatedAt: new Date() })
          .where(
            and(
              eq(bom.organizationId, organizationId),
              eq(bom.parentPartId, parentId),
              eq(bom.status, "active"),
            ),
          );
        const [created] = await tx
          .insert(bom)
          .values({
            organizationId,
            parentPartId: parentId,
            revision,
            status: "active",
            createdBy: userId,
          })
          .returning();
        bomId = created!.id;
      } else if (existing[0]!.status !== "active") {
        await tx
          .update(bom)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(bom.id, bomId));
      }

      for (const line of lines) {
        const found = await tx
          .select({ id: bomLine.id })
          .from(bomLine)
          .where(
            and(
              eq(bomLine.bomId, bomId),
              eq(bomLine.componentPartId, line.componentId),
            ),
          )
          .limit(1);
        if (found[0]) continue;
        await tx.insert(bomLine).values({
          organizationId,
          bomId,
          componentPartId: line.componentId,
          quantityPer: String(line.qty),
          scrapPercent: String(line.scrap ?? 0),
          position: line.position,
        });
      }
      return bomId;
    }

    await ensureBom(fg.id, "A", [
      { componentId: sa.id, qty: 1, position: 10 },
      { componentId: ph.id, qty: 1, position: 20 },
    ]);
    await ensureBom(sa.id, "A", [
      { componentId: raw1.id, qty: 1, scrap: 5, position: 10 },
      { componentId: raw2.id, qty: 1, position: 20 },
    ]);
    await ensureBom(ph.id, "A", [
      { componentId: raw3.id, qty: 2, position: 10 },
    ]);

    // Kundbehov om 30 dagar
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 30);
    await tx.insert(demandLine).values({
      organizationId,
      partId: fg.id,
      quantity: "20",
      dueDate: due,
      sourceType: "customer_order",
      sourceId: "KO-DEMO-1001",
      note: "Pitch-demo: 20 pumpar",
      createdBy: userId,
    });

    return {
      parentPartNumber: fg.partNumber,
      demandQuantity: 20,
      dueDate: toIsoDate(due),
    };
  }).then(async (result) => {
    await recalculateLowLevelCodes(organizationId);
    return result;
  });
}
