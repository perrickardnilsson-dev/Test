/**
 * Nettobehovskörning (MRP) — ren domänlogik utan DB.
 *
 * Nivåvis: LLC → netta → lotta → orderdatum → spräng BOM för tillverkade.
 */

import {
  calculateLowLevelCodes,
  detectCircularBom,
  explodeBomLevel,
  type BomEdge,
  BomError,
} from "./bom";

export type LotSizingRule =
  | "lot_for_lot"
  | "fixed_qty"
  | "min_qty"
  | "economic_order_qty";

export type PartPlanningProfile = {
  id: string;
  type: "purchased" | "manufactured" | "phantom" | "service";
  leadTimeDays: number;
  safetyStock: number;
  lotSizingRule: LotSizingRule;
  lotSize: number | null;
  planningMethod: "mrp" | "reorder_point" | "manual";
};

export type TimePhasedQty = {
  partId: string;
  quantity: number;
  /** ISO-datum YYYY-MM-DD */
  dueDate: string;
  sourceType: string;
  sourceId: string | null;
  label?: string;
};

export type PeggingCause = {
  demandSourceType: string;
  demandSourceId: string | null;
  demandQuantity: number;
  demandDueDate: string;
  explanation: string;
};

export type PlanningSuggestionResult = {
  partId: string;
  suggestionType: "purchase" | "manufacture";
  quantity: number;
  dueDate: string;
  orderDate: string;
  isLate: boolean;
  pegging: PeggingCause[];
};

export type MrpRunInput = {
  asOfDate: string;
  parts: PartPlanningProfile[];
  bomEdges: BomEdge[];
  demands: TimePhasedQty[];
  supplies: TimePhasedQty[];
  onHandByPart: Record<string, number>;
};

export type MrpRunResult = {
  lowLevelCodes: Record<string, number>;
  suggestions: PlanningSuggestionResult[];
  dependentDemands: TimePhasedQty[];
};

export class MrpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MrpError";
  }
}

/** Subtrahera kalenderdagar från ISO-datum. */
export function subtractDays(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setUTCDate(d.getUTCDate() - days);
  return toIsoDate(d);
}

export function parseIsoDate(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) {
    throw new MrpError(`Ogiltigt datum: ${isoDate}`);
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function compareIsoDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Partiformning enligt artikelns regel.
 */
export function applyLotSizing(
  netRequirement: number,
  rule: LotSizingRule,
  lotSize: number | null,
): number {
  if (netRequirement <= 0) return 0;
  const size = lotSize && lotSize > 0 ? lotSize : null;

  switch (rule) {
    case "lot_for_lot":
      return netRequirement;
    case "fixed_qty":
    case "economic_order_qty": {
      if (!size) return netRequirement;
      return Math.ceil(netRequirement / size) * size;
    }
    case "min_qty": {
      if (!size) return netRequirement;
      return Math.max(netRequirement, size);
    }
    default:
      return netRequirement;
  }
}

function roundQty(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Kör nivåvis MRP. Kastar vid cirkulär BOM.
 */
export function runMrp(input: MrpRunInput): MrpRunResult {
  try {
    detectCircularBom(input.bomEdges);
  } catch (err) {
    if (err instanceof BomError) {
      throw new MrpError(err.message);
    }
    throw err;
  }

  const partMap = new Map(input.parts.map((p) => [p.id, p]));
  const partIds = input.parts.map((p) => p.id);
  const partTypes: Record<
    string,
    "purchased" | "manufactured" | "phantom" | "service"
  > = {};
  for (const p of input.parts) {
    partTypes[p.id] = p.type;
  }

  const lowLevelCodes = calculateLowLevelCodes(partIds, input.bomEdges);

  // Kopiera behov — dependent läggs till under körning
  const allDemands: TimePhasedQty[] = input.demands.map((d) => ({ ...d }));
  const suggestions: PlanningSuggestionResult[] = [];
  const dependentDemands: TimePhasedQty[] = [];

  const maxLlc = Math.max(0, ...Object.values(lowLevelCodes));

  for (let llc = 0; llc <= maxLlc; llc++) {
    const partsAtLevel = partIds.filter((id) => (lowLevelCodes[id] ?? 0) === llc);

    for (const partId of partsAtLevel) {
      const profile = partMap.get(partId);
      if (!profile) continue;
      if (profile.type === "phantom" || profile.type === "service") continue;
      if (profile.planningMethod === "manual") continue;

      const partDemands = allDemands
        .filter((d) => d.partId === partId && d.quantity > 0)
        .sort((a, b) => compareIsoDates(a.dueDate, b.dueDate));

      const partSupplies = input.supplies
        .filter((s) => s.partId === partId && s.quantity > 0)
        .sort((a, b) => compareIsoDates(a.dueDate, b.dueDate));

      let available = input.onHandByPart[partId] ?? 0;
      const safety = profile.safetyStock;

      // Tidpunkter att utvärdera
      const dates = new Set<string>();
      for (const d of partDemands) dates.add(d.dueDate);
      for (const s of partSupplies) dates.add(s.dueDate);
      // Om bara säkerhetslager saknas utan behov — utvärdera asOf
      if (dates.size === 0 && available < safety && profile.planningMethod === "mrp") {
        dates.add(input.asOfDate);
      }

      const sortedDates = [...dates].sort(compareIsoDates);
      let supplyIdx = 0;

      for (const date of sortedDates) {
        while (
          supplyIdx < partSupplies.length &&
          compareIsoDates(partSupplies[supplyIdx]!.dueDate, date) <= 0
        ) {
          available = roundQty(available + partSupplies[supplyIdx]!.quantity);
          supplyIdx += 1;
        }

        const demandsToday = partDemands.filter((d) => d.dueDate === date);
        const grossToday = roundQty(
          demandsToday.reduce((sum, d) => sum + d.quantity, 0),
        );
        available = roundQty(available - grossToday);

        if (available >= safety) continue;
        if (profile.planningMethod === "reorder_point") {
          // Endast om under ROP — behandlas som safety för prototypen via safetyStock
        }

        const net = roundQty(safety - available);
        const lotQty = applyLotSizing(
          net,
          profile.lotSizingRule,
          profile.lotSize,
        );
        if (lotQty <= 0) continue;

        available = roundQty(available + lotQty);

        const orderDate = subtractDays(date, profile.leadTimeDays);
        const isLate = compareIsoDates(orderDate, input.asOfDate) < 0;
        const suggestionType: "purchase" | "manufacture" =
          profile.type === "manufactured" ? "manufacture" : "purchase";

        const pegging: PeggingCause[] =
          demandsToday.length > 0
            ? demandsToday.map((d) => ({
                demandSourceType: d.sourceType,
                demandSourceId: d.sourceId,
                demandQuantity: d.quantity,
                demandDueDate: d.dueDate,
                explanation: peggingExplanation({
                  partId,
                  suggestionType,
                  lotQty,
                  dueDate: date,
                  demand: d,
                  isLate,
                  safetyStock: safety,
                }),
              }))
            : [
                {
                  demandSourceType: "safety_stock",
                  demandSourceId: null,
                  demandQuantity: net,
                  demandDueDate: date,
                  explanation: `Säkerhetslager ${safety} kräver påfyllnad av ${lotQty} (saldo skulle annars bli under gränsen).`,
                },
              ];

        suggestions.push({
          partId,
          suggestionType,
          quantity: lotQty,
          dueDate: date,
          orderDate,
          isLate,
          pegging,
        });

        // Spräng BOM för tillverkade → dependent demand
        if (profile.type === "manufactured") {
          const components = explodeBomLevel(
            partId,
            lotQty,
            input.bomEdges,
            partTypes,
          );
          for (const c of components) {
            const dep: TimePhasedQty = {
              partId: c.partId,
              quantity: roundQty(c.quantity),
              dueDate: orderDate, // komponenter behövs vid orderstart
              sourceType: "dependent",
              sourceId: partId,
              label: `Behov från tillverkning av ${partId}`,
            };
            allDemands.push(dep);
            dependentDemands.push(dep);
          }
        }
      }
    }
  }

  return { lowLevelCodes, suggestions, dependentDemands };
}

function peggingExplanation(args: {
  partId: string;
  suggestionType: "purchase" | "manufacture";
  lotQty: number;
  dueDate: string;
  demand: TimePhasedQty;
  isLate: boolean;
  safetyStock: number;
}): string {
  const verb =
    args.suggestionType === "manufacture" ? "tillverka" : "köpa in";
  const source =
    args.demand.sourceType === "dependent"
      ? `beroende behov från ${args.demand.sourceId ?? "överordnad"}`
      : args.demand.sourceType === "customer_order"
        ? "kundorder"
        : args.demand.sourceType === "forecast"
          ? "prognos"
          : "manuellt behov";
  const late = args.isLate ? " Försenat — beställ omgående." : "";
  return `Föreslår att ${verb} ${args.lotQty} till ${args.dueDate} p.g.a. ${source} (${args.demand.quantity} st)${args.safetyStock > 0 ? `, med hänsyn till säkerhetslager ${args.safetyStock}` : ""}.${late}`;
}
