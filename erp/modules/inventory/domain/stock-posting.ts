/**
 * Lagerbokföring — rena domänfunktioner utan DB.
 *
 * Värderingsmetod: vägt genomsnittspris.
 * Vid inleverans: nyttSnitt = (gammaltVärde + inlevereratVärde) / nyttAntal
 * Uttag sker till aktuellt snittpris.
 * FIFO kan komma senare.
 */

export type StockBalanceState = {
  quantity: number;
  reservedQuantity: number;
  averageCost: number;
};

export type StockTransactionType =
  | "receipt"
  | "issue"
  | "transfer"
  | "adjustment"
  | "count"
  | "scrap";

export type PostingPlan = {
  type: StockTransactionType;
  /** Ledger-kvantitet: + in, − ut; transfer lagras som positiv qty. */
  quantity: number;
  unitCost: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromBalance: StockBalanceState | null;
  toBalance: StockBalanceState | null;
};

export class StockPostingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockPostingError";
  }
}

export function availableQuantity(balance: StockBalanceState): number {
  return balance.quantity - balance.reservedQuantity;
}

/**
 * Vägt genomsnittspris vid inleverans.
 * Om nytt antal ≤ 0 returneras 0 (tomt lager har inget snittvärde).
 */
export function weightedAverageCost(
  oldQuantity: number,
  oldAverageCost: number,
  receiptQuantity: number,
  receiptUnitCost: number,
): number {
  if (receiptQuantity <= 0) {
    throw new StockPostingError("Inleveranskvantitet måste vara positiv");
  }
  const newQty = oldQuantity + receiptQuantity;
  if (newQty <= 0) {
    return 0;
  }
  const oldValue = Math.max(oldQuantity, 0) * oldAverageCost;
  const receiptValue = receiptQuantity * receiptUnitCost;
  return (oldValue + receiptValue) / newQty;
}

function emptyBalance(): StockBalanceState {
  return { quantity: 0, reservedQuantity: 0, averageCost: 0 };
}

function assertNonNegative(
  current: StockBalanceState,
  next: StockBalanceState,
  allowNegative: boolean,
  context: string,
): void {
  if (!allowNegative && next.quantity < 0) {
    throw new StockPostingError(
      `Negativt saldo tillåts inte (${context}). Tillgängligt: ${availableQuantity(current)}`,
    );
  }
  if (!allowNegative && next.quantity < next.reservedQuantity) {
    throw new StockPostingError(
      `Kan inte gå under reserverat saldo (${context}). Reserverat: ${next.reservedQuantity}`,
    );
  }
}

/** Applicera uttag — behåll snittpris; nollställ snitt om qty blir 0. */
function applyIssue(
  current: StockBalanceState,
  qty: number,
  allowNegative: boolean,
  context: string,
): { next: StockBalanceState; unitCost: number } {
  if (qty <= 0) {
    throw new StockPostingError("Uttagskvantitet måste vara positiv");
  }
  const unitCost = current.averageCost;
  const next: StockBalanceState = {
    quantity: current.quantity - qty,
    reservedQuantity: current.reservedQuantity,
    averageCost: current.quantity - qty <= 0 ? 0 : current.averageCost,
  };
  assertNonNegative(current, next, allowNegative, context);
  return { next, unitCost };
}

/** Applicera inleverans med vägt snitt. */
function applyReceipt(
  current: StockBalanceState,
  qty: number,
  unitCost: number,
): StockBalanceState {
  if (qty <= 0) {
    throw new StockPostingError("Inleveranskvantitet måste vara positiv");
  }
  if (unitCost < 0) {
    throw new StockPostingError("Enhetskostnad får inte vara negativ");
  }
  const averageCost =
    current.quantity <= 0
      ? unitCost
      : weightedAverageCost(
          current.quantity,
          current.averageCost,
          qty,
          unitCost,
        );
  return {
    quantity: current.quantity + qty,
    reservedQuantity: current.reservedQuantity,
    averageCost,
  };
}

export type ReceiptInput = {
  type: "receipt";
  quantity: number;
  unitCost: number;
  toLocationId: string;
  currentTo: StockBalanceState | null;
  allowNegative: boolean;
};

export type IssueInput = {
  type: "issue" | "scrap";
  quantity: number;
  fromLocationId: string;
  currentFrom: StockBalanceState | null;
  allowNegative: boolean;
};

export type TransferInput = {
  type: "transfer";
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  currentFrom: StockBalanceState | null;
  currentTo: StockBalanceState | null;
  allowNegativeFrom: boolean;
};

export type AdjustmentInput = {
  type: "adjustment" | "count";
  /** Signed: + ökar, − minskar. */
  quantity: number;
  locationId: string;
  current: StockBalanceState | null;
  /** Vid positiv justering: kostnad som ska blandas in. Annars ignoreras. */
  unitCost?: number;
  allowNegative: boolean;
};

export type PlanInput =
  | ReceiptInput
  | IssueInput
  | TransferInput
  | AdjustmentInput;

/**
 * Planerar saldoändringar för en lagertransaktion.
 * Returnerar ledger-fält + nya balansstates (null = ingen ändring på den sidan).
 */
export function planStockPosting(input: PlanInput): PostingPlan {
  switch (input.type) {
    case "receipt": {
      const current = input.currentTo ?? emptyBalance();
      const next = applyReceipt(current, input.quantity, input.unitCost);
      return {
        type: "receipt",
        quantity: input.quantity,
        unitCost: input.unitCost,
        fromLocationId: null,
        toLocationId: input.toLocationId,
        fromBalance: null,
        toBalance: next,
      };
    }
    case "issue":
    case "scrap": {
      const current = input.currentFrom ?? emptyBalance();
      const { next, unitCost } = applyIssue(
        current,
        input.quantity,
        input.allowNegative,
        input.type === "scrap" ? "skrot" : "utleverans",
      );
      return {
        type: input.type,
        quantity: -input.quantity,
        unitCost,
        fromLocationId: input.fromLocationId,
        toLocationId: null,
        fromBalance: next,
        toBalance: null,
      };
    }
    case "transfer": {
      if (input.fromLocationId === input.toLocationId) {
        throw new StockPostingError("Flytt kräver två olika lagerplatser");
      }
      const from = input.currentFrom ?? emptyBalance();
      const to = input.currentTo ?? emptyBalance();
      const { next: nextFrom, unitCost } = applyIssue(
        from,
        input.quantity,
        input.allowNegativeFrom,
        "flytt från",
      );
      // Flytt behåller värdet — mottagare tar emot till avsändarens snitt
      const nextTo = applyReceipt(to, input.quantity, unitCost);
      return {
        type: "transfer",
        quantity: input.quantity,
        unitCost,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        fromBalance: nextFrom,
        toBalance: nextTo,
      };
    }
    case "adjustment":
    case "count": {
      const current = input.current ?? emptyBalance();
      if (input.quantity === 0) {
        throw new StockPostingError("Justering får inte vara noll");
      }
      if (input.quantity > 0) {
        const cost = input.unitCost ?? current.averageCost;
        const next = applyReceipt(current, input.quantity, cost);
        return {
          type: input.type,
          quantity: input.quantity,
          unitCost: cost,
          fromLocationId: null,
          toLocationId: input.locationId,
          fromBalance: null,
          toBalance: next,
        };
      }
      const { next, unitCost } = applyIssue(
        current,
        -input.quantity,
        input.allowNegative,
        input.type === "count" ? "inventering" : "justering",
      );
      return {
        type: input.type,
        quantity: input.quantity,
        unitCost,
        fromLocationId: input.locationId,
        toLocationId: null,
        fromBalance: next,
        toBalance: null,
      };
    }
    default: {
      const _exhaustive: never = input;
      throw new StockPostingError(`Okänd transaktionstyp: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Reservation minskar tillgängligt utan fysisk flytt.
 */
export function applyReservation(
  current: StockBalanceState,
  delta: number,
  allowNegativeAvailable = false,
): StockBalanceState {
  const nextReserved = current.reservedQuantity + delta;
  if (nextReserved < 0) {
    throw new StockPostingError("Reservation kan inte bli negativ");
  }
  const next = {
    ...current,
    reservedQuantity: nextReserved,
  };
  if (!allowNegativeAvailable && availableQuantity(next) < 0) {
    throw new StockPostingError(
      `Otillräckligt tillgängligt saldo för reservation (tillgängligt: ${availableQuantity(current)})`,
    );
  }
  return next;
}
