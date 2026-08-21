/**
 * Inventeringsdomän — rena funktioner utan DB.
 *
 * Avvikelse = räknat − förväntat. Värde = avvikelse × enhetskostnad.
 * Justering bokförs först efter godkännande.
 */

export class InventoryCountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryCountError";
  }
}

export type InventoryCountStatus =
  | "draft"
  | "counting"
  | "pending_approval"
  | "posted"
  | "cancelled";

export type CountLineInput = {
  expectedQuantity: number;
  countedQuantity: number | null;
  unitCost: number;
};

export type CountLineVariance = {
  varianceQuantity: number | null;
  varianceValue: number | null;
  isCounted: boolean;
};

export function computeLineVariance(line: CountLineInput): CountLineVariance {
  if (line.countedQuantity == null) {
    return { varianceQuantity: null, varianceValue: null, isCounted: false };
  }
  const varianceQuantity =
    Math.round((line.countedQuantity - line.expectedQuantity) * 10000) / 10000;
  const varianceValue =
    Math.round(varianceQuantity * line.unitCost * 10000) / 10000;
  return { varianceQuantity, varianceValue, isCounted: true };
}

export type CountSummary = {
  lineCount: number;
  countedCount: number;
  uncountedCount: number;
  varianceQuantity: number;
  varianceValue: number;
  absoluteVarianceValue: number;
};

export function summarizeCount(lines: CountLineInput[]): CountSummary {
  let countedCount = 0;
  let varianceQuantity = 0;
  let varianceValue = 0;
  let absoluteVarianceValue = 0;

  for (const line of lines) {
    const v = computeLineVariance(line);
    if (!v.isCounted) continue;
    countedCount += 1;
    varianceQuantity += v.varianceQuantity!;
    varianceValue += v.varianceValue!;
    absoluteVarianceValue += Math.abs(v.varianceValue!);
  }

  return {
    lineCount: lines.length,
    countedCount,
    uncountedCount: lines.length - countedCount,
    varianceQuantity: Math.round(varianceQuantity * 10000) / 10000,
    varianceValue: Math.round(varianceValue * 10000) / 10000,
    absoluteVarianceValue: Math.round(absoluteVarianceValue * 10000) / 10000,
  };
}

/** Statusövergångar för inventeringsflödet. */
export function assertCountTransition(
  from: InventoryCountStatus,
  to: InventoryCountStatus,
): void {
  const allowed: Record<InventoryCountStatus, InventoryCountStatus[]> = {
    draft: ["counting", "cancelled"],
    counting: ["pending_approval", "cancelled"],
    pending_approval: ["posted", "counting", "cancelled"],
    posted: [],
    cancelled: [],
  };
  if (!allowed[from].includes(to)) {
    throw new InventoryCountError(
      `Ogiltig statusövergång: ${from} → ${to}`,
    );
  }
}

/**
 * Delta som ska bokföras (räknat − förväntat). Noll rader hoppas över.
 */
export function adjustmentQuantity(
  expectedQuantity: number,
  countedQuantity: number,
): number {
  return Math.round((countedQuantity - expectedQuantity) * 10000) / 10000;
}
