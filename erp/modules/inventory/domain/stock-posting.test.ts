import { describe, expect, it } from "vitest";
import {
  applyReservation,
  availableQuantity,
  planStockPosting,
  StockPostingError,
  weightedAverageCost,
  type StockBalanceState,
} from "./stock-posting";

const bal = (
  quantity: number,
  averageCost = 0,
  reservedQuantity = 0,
): StockBalanceState => ({ quantity, averageCost, reservedQuantity });

describe("weightedAverageCost", () => {
  it("beräknar vägt snitt vid inleverans", () => {
    // 10 @ 100 + 10 @ 200 = 20 @ 150
    expect(weightedAverageCost(10, 100, 10, 200)).toBe(150);
  });

  it("hanterar tomt lager som bara ny kostnad", () => {
    expect(weightedAverageCost(0, 0, 5, 40)).toBe(40);
  });

  it("avvisar icke-positiv inleverans", () => {
    expect(() => weightedAverageCost(10, 100, 0, 50)).toThrow(StockPostingError);
  });
});

describe("planStockPosting — receipt", () => {
  it("ökar saldo och uppdaterar snitt", () => {
    const plan = planStockPosting({
      type: "receipt",
      quantity: 10,
      unitCost: 200,
      toLocationId: "loc-a",
      currentTo: bal(10, 100),
      allowNegative: false,
    });
    expect(plan.quantity).toBe(10);
    expect(plan.toBalance?.quantity).toBe(20);
    expect(plan.toBalance?.averageCost).toBe(150);
    expect(plan.fromBalance).toBeNull();
  });
});

describe("planStockPosting — issue", () => {
  it("minskar saldo till aktuellt snitt", () => {
    const plan = planStockPosting({
      type: "issue",
      quantity: 4,
      fromLocationId: "loc-a",
      currentFrom: bal(10, 50),
      allowNegative: false,
    });
    expect(plan.quantity).toBe(-4);
    expect(plan.unitCost).toBe(50);
    expect(plan.fromBalance?.quantity).toBe(6);
    expect(plan.fromBalance?.averageCost).toBe(50);
  });

  it("blockerar negativt saldo som standard", () => {
    expect(() =>
      planStockPosting({
        type: "issue",
        quantity: 11,
        fromLocationId: "loc-a",
        currentFrom: bal(10, 50),
        allowNegative: false,
      }),
    ).toThrow(/Negativt saldo/);
  });

  it("tillåter negativt när lagerställe tillåter", () => {
    const plan = planStockPosting({
      type: "issue",
      quantity: 11,
      fromLocationId: "loc-a",
      currentFrom: bal(10, 50),
      allowNegative: true,
    });
    expect(plan.fromBalance?.quantity).toBe(-1);
  });

  it("blockerar uttag under reservation", () => {
    expect(() =>
      planStockPosting({
        type: "issue",
        quantity: 6,
        fromLocationId: "loc-a",
        currentFrom: bal(10, 50, 5),
        allowNegative: false,
      }),
    ).toThrow(/reserverat/);
  });
});

describe("planStockPosting — transfer", () => {
  it("flyttar qty och värde till mottagare", () => {
    const plan = planStockPosting({
      type: "transfer",
      quantity: 5,
      fromLocationId: "loc-a",
      toLocationId: "loc-b",
      currentFrom: bal(20, 80),
      currentTo: bal(0, 0),
      allowNegativeFrom: false,
    });
    expect(plan.quantity).toBe(5);
    expect(plan.unitCost).toBe(80);
    expect(plan.fromBalance?.quantity).toBe(15);
    expect(plan.toBalance?.quantity).toBe(5);
    expect(plan.toBalance?.averageCost).toBe(80);
  });

  it("väger in befintligt saldo på mottagare", () => {
    const plan = planStockPosting({
      type: "transfer",
      quantity: 10,
      fromLocationId: "loc-a",
      toLocationId: "loc-b",
      currentFrom: bal(10, 100),
      currentTo: bal(10, 200),
      allowNegativeFrom: false,
    });
    expect(plan.toBalance?.quantity).toBe(20);
    expect(plan.toBalance?.averageCost).toBe(150);
  });

  it("avvisar flytt till samma plats", () => {
    expect(() =>
      planStockPosting({
        type: "transfer",
        quantity: 1,
        fromLocationId: "loc-a",
        toLocationId: "loc-a",
        currentFrom: bal(5, 10),
        currentTo: bal(5, 10),
        allowNegativeFrom: false,
      }),
    ).toThrow(/två olika/);
  });
});

describe("planStockPosting — adjustment", () => {
  it("positiv justering blandar kostnad", () => {
    const plan = planStockPosting({
      type: "adjustment",
      quantity: 5,
      locationId: "loc-a",
      current: bal(5, 100),
      unitCost: 200,
      allowNegative: false,
    });
    expect(plan.toBalance?.quantity).toBe(10);
    expect(plan.toBalance?.averageCost).toBe(150);
  });

  it("negativ justering tar ut till snitt", () => {
    const plan = planStockPosting({
      type: "adjustment",
      quantity: -3,
      locationId: "loc-a",
      current: bal(10, 40),
      allowNegative: false,
    });
    expect(plan.quantity).toBe(-3);
    expect(plan.unitCost).toBe(40);
    expect(plan.fromBalance?.quantity).toBe(7);
  });
});

describe("reservation", () => {
  it("minskar tillgängligt utan att ändra quantity", () => {
    const next = applyReservation(bal(10, 5, 0), 3);
    expect(next.quantity).toBe(10);
    expect(next.reservedQuantity).toBe(3);
    expect(availableQuantity(next)).toBe(7);
  });

  it("blockerar reservation över tillgängligt", () => {
    expect(() => applyReservation(bal(10, 5, 8), 3)).toThrow(/Otillräckligt/);
  });
});
