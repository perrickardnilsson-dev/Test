import { describe, expect, it } from "vitest";
import {
  adjustmentQuantity,
  assertCountTransition,
  computeLineVariance,
  InventoryCountError,
  summarizeCount,
} from "./inventory-count";

describe("computeLineVariance", () => {
  it("ger null när ej räknat", () => {
    expect(
      computeLineVariance({
        expectedQuantity: 10,
        countedQuantity: null,
        unitCost: 5,
      }),
    ).toEqual({
      varianceQuantity: null,
      varianceValue: null,
      isCounted: false,
    });
  });

  it("beräknar positiv avvikelse med värde", () => {
    expect(
      computeLineVariance({
        expectedQuantity: 10,
        countedQuantity: 12,
        unitCost: 25,
      }),
    ).toEqual({
      varianceQuantity: 2,
      varianceValue: 50,
      isCounted: true,
    });
  });

  it("beräknar negativ avvikelse med värde", () => {
    expect(
      computeLineVariance({
        expectedQuantity: 10,
        countedQuantity: 7,
        unitCost: 4,
      }),
    ).toEqual({
      varianceQuantity: -3,
      varianceValue: -12,
      isCounted: true,
    });
  });
});

describe("summarizeCount", () => {
  it("summerar räknade rader och hoppar över oräknade", () => {
    const summary = summarizeCount([
      { expectedQuantity: 10, countedQuantity: 12, unitCost: 5 },
      { expectedQuantity: 5, countedQuantity: null, unitCost: 2 },
      { expectedQuantity: 8, countedQuantity: 6, unitCost: 10 },
    ]);
    expect(summary.lineCount).toBe(3);
    expect(summary.countedCount).toBe(2);
    expect(summary.uncountedCount).toBe(1);
    expect(summary.varianceQuantity).toBe(0); // +2 + (-2)
    expect(summary.varianceValue).toBe(-10); // +10 + (-20)
    expect(summary.absoluteVarianceValue).toBe(30);
  });
});

describe("assertCountTransition", () => {
  it("tillåter draft → counting", () => {
    expect(() => assertCountTransition("draft", "counting")).not.toThrow();
  });

  it("blockerar draft → posted", () => {
    expect(() => assertCountTransition("draft", "posted")).toThrow(
      InventoryCountError,
    );
  });

  it("tillåter pending_approval → posted", () => {
    expect(() =>
      assertCountTransition("pending_approval", "posted"),
    ).not.toThrow();
  });
});

describe("adjustmentQuantity", () => {
  it("returnerar delta för bokföring", () => {
    expect(adjustmentQuantity(10, 13)).toBe(3);
    expect(adjustmentQuantity(10, 8)).toBe(-2);
    expect(adjustmentQuantity(5, 5)).toBe(0);
  });
});
