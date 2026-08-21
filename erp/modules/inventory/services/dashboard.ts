import { and, eq, gte, sql } from "drizzle-orm";
import { getTenantDb } from "@/core/db/tenant";
import {
  demandLine,
  part,
  stockBalance,
  stockTransaction,
} from "../schema";

export type PitchShortage = {
  partId: string;
  partNumber: string;
  description: string;
  available: number;
  safetyStock: number;
  openDemand: number;
  reason: "below_safety" | "unmet_demand";
};

export type PitchUpcomingDemand = {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  dueDate: string;
  sourceType: string;
};

export type PitchDeadStock = {
  partId: string;
  partNumber: string;
  description: string;
  quantity: number;
  stockValue: number;
};

export type PitchDashboard = {
  shortageList: PitchShortage[];
  upcomingDemand: PitchUpcomingDemand[];
  stockValue: number;
  deadStock: PitchDeadStock[];
  partCount: number;
  openDemandCount: number;
};

export async function getPitchDashboard(
  organizationId: string,
): Promise<PitchDashboard> {
  return getTenantDb(organizationId, async (tx) => {
    const now = new Date();
    const in14 = new Date(now);
    in14.setUTCDate(in14.getUTCDate() + 14);

    const balances = await tx
      .select({
        partId: stockBalance.partId,
        quantity: stockBalance.quantity,
        reservedQuantity: stockBalance.reservedQuantity,
        averageCost: stockBalance.averageCost,
        partNumber: part.partNumber,
        description: part.description,
        safetyStock: part.safetyStock,
      })
      .from(stockBalance)
      .innerJoin(part, eq(stockBalance.partId, part.id))
      .where(eq(stockBalance.organizationId, organizationId));

    const byPart = new Map<
      string,
      {
        partNumber: string;
        description: string;
        safetyStock: number;
        qty: number;
        reserved: number;
        value: number;
      }
    >();

    let stockValue = 0;
    for (const row of balances) {
      const qty = Number(row.quantity);
      const reserved = Number(row.reservedQuantity);
      const avg = Number(row.averageCost);
      const value = qty * avg;
      stockValue += value;
      const existing = byPart.get(row.partId);
      if (existing) {
        existing.qty += qty;
        existing.reserved += reserved;
        existing.value += value;
      } else {
        byPart.set(row.partId, {
          partNumber: row.partNumber,
          description: row.description,
          safetyStock: Number(row.safetyStock),
          qty,
          reserved,
          value,
        });
      }
    }

    const openDemands = await tx
      .select({
        id: demandLine.id,
        partId: demandLine.partId,
        quantity: demandLine.quantity,
        dueDate: demandLine.dueDate,
        sourceType: demandLine.sourceType,
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
      );

    const demandByPart = new Map<string, number>();
    for (const d of openDemands) {
      demandByPart.set(
        d.partId,
        (demandByPart.get(d.partId) ?? 0) + Number(d.quantity),
      );
    }

    // Also include parts with safety stock but no balance row
    const safetyParts = await tx
      .select({
        id: part.id,
        partNumber: part.partNumber,
        description: part.description,
        safetyStock: part.safetyStock,
      })
      .from(part)
      .where(
        and(
          eq(part.organizationId, organizationId),
          eq(part.status, "active"),
          sql`${part.safetyStock}::numeric > 0`,
        ),
      );

    for (const p of safetyParts) {
      if (!byPart.has(p.id)) {
        byPart.set(p.id, {
          partNumber: p.partNumber,
          description: p.description,
          safetyStock: Number(p.safetyStock),
          qty: 0,
          reserved: 0,
          value: 0,
        });
      }
    }

    const shortageList: PitchShortage[] = [];
    for (const [partId, info] of byPart) {
      const available = info.qty - info.reserved;
      const openDemand = demandByPart.get(partId) ?? 0;
      if (available < info.safetyStock) {
        shortageList.push({
          partId,
          partNumber: info.partNumber,
          description: info.description,
          available,
          safetyStock: info.safetyStock,
          openDemand,
          reason: "below_safety",
        });
      } else if (openDemand > available) {
        shortageList.push({
          partId,
          partNumber: info.partNumber,
          description: info.description,
          available,
          safetyStock: info.safetyStock,
          openDemand,
          reason: "unmet_demand",
        });
      }
    }
    shortageList.sort((a, b) => a.partNumber.localeCompare(b.partNumber, "sv"));

    const upcomingDemand: PitchUpcomingDemand[] = openDemands
      .filter((d) => {
        const due = d.dueDate instanceof Date ? d.dueDate : new Date(d.dueDate);
        return due >= now && due <= in14;
      })
      .map((d) => ({
        id: d.id,
        partNumber: d.partNumber,
        description: d.description,
        quantity: Number(d.quantity),
        dueDate: (d.dueDate instanceof Date
          ? d.dueDate
          : new Date(d.dueDate)
        )
          .toISOString()
          .slice(0, 10),
        sourceType: d.sourceType,
      }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // Dead stock: qty > 0 and no open demand (simple proxy when recent-tx is heavy)
    const recentCutoff = new Date(now);
    recentCutoff.setUTCDate(recentCutoff.getUTCDate() - 90);

    const recentRows = await tx
      .select({ partId: stockTransaction.partId })
      .from(stockTransaction)
      .where(
        and(
          eq(stockTransaction.organizationId, organizationId),
          gte(stockTransaction.postedAt, recentCutoff),
        ),
      );
    const recentPartIds = new Set(recentRows.map((r) => r.partId));

    const deadStock: PitchDeadStock[] = [];
    for (const [partId, info] of byPart) {
      if (info.qty <= 0) continue;
      const hasDemand = (demandByPart.get(partId) ?? 0) > 0;
      const hasRecent = recentPartIds.has(partId);
      if (!hasDemand && !hasRecent) {
        deadStock.push({
          partId,
          partNumber: info.partNumber,
          description: info.description,
          quantity: info.qty,
          stockValue: Math.round(info.value * 100) / 100,
        });
      }
    }
    deadStock.sort((a, b) => b.stockValue - a.stockValue);

    const partCountRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(part)
      .where(eq(part.organizationId, organizationId));

    return {
      shortageList: shortageList.slice(0, 50),
      upcomingDemand: upcomingDemand.slice(0, 40),
      stockValue: Math.round(stockValue * 100) / 100,
      deadStock: deadStock.slice(0, 30),
      partCount: partCountRows[0]?.count ?? 0,
      openDemandCount: openDemands.length,
    };
  });
}
