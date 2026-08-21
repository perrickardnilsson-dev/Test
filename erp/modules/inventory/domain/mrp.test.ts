import { describe, expect, it } from "vitest";
import {
  BomError,
  buildBomTree,
  calculateLowLevelCodes,
  detectCircularBom,
  effectiveQuantityPer,
  explodeBomLevel,
  type BomEdge,
} from "./bom";
import {
  applyLotSizing,
  compareIsoDates,
  runMrp,
  subtractDays,
  type MrpRunInput,
  type PartPlanningProfile,
  type TimePhasedQty,
} from "./mrp";

function part(
  id: string,
  overrides: Partial<PartPlanningProfile> = {},
): PartPlanningProfile {
  return {
    id,
    type: "purchased",
    leadTimeDays: 0,
    safetyStock: 0,
    lotSizingRule: "lot_for_lot",
    lotSize: null,
    planningMethod: "mrp",
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<MrpRunInput> & Pick<MrpRunInput, "parts" | "demands">,
): MrpRunInput {
  return {
    asOfDate: "2026-08-01",
    bomEdges: [],
    supplies: [],
    onHandByPart: {},
    ...overrides,
  };
}

describe("BOM — low-level code & cirkel", () => {
  it("beräknar LLC för flernivå-BOM", () => {
    const edges: BomEdge[] = [
      { parentPartId: "FG", componentPartId: "SA", quantityPer: 1, scrapPercent: 0 },
      { parentPartId: "SA", componentPartId: "RAW", quantityPer: 2, scrapPercent: 0 },
    ];
    const codes = calculateLowLevelCodes(["FG", "SA", "RAW"], edges);
    expect(codes.FG).toBe(0);
    expect(codes.SA).toBe(1);
    expect(codes.RAW).toBe(2);
  });

  it("tar djupaste förekomsten när artikel används på flera nivåer", () => {
    const edges: BomEdge[] = [
      { parentPartId: "FG", componentPartId: "RAW", quantityPer: 1, scrapPercent: 0 },
      { parentPartId: "FG", componentPartId: "SA", quantityPer: 1, scrapPercent: 0 },
      { parentPartId: "SA", componentPartId: "RAW", quantityPer: 1, scrapPercent: 0 },
    ];
    const codes = calculateLowLevelCodes(["FG", "SA", "RAW"], edges);
    expect(codes.RAW).toBe(2);
  });

  it("upptäcker cirkulär BOM", () => {
    const edges: BomEdge[] = [
      { parentPartId: "A", componentPartId: "B", quantityPer: 1, scrapPercent: 0 },
      { parentPartId: "B", componentPartId: "A", quantityPer: 1, scrapPercent: 0 },
    ];
    expect(() => detectCircularBom(edges)).toThrow(BomError);
    expect(() => detectCircularBom(edges)).toThrow(/Cirkulär/);
  });

  it("räknar effektiv kvantitet med spill", () => {
    expect(effectiveQuantityPer(10, 0)).toBe(10);
    expect(effectiveQuantityPer(10, 10)).toBeCloseTo(11.1111, 3);
  });

  it("spränger fantom utan att inkludera fantomen", () => {
    const edges: BomEdge[] = [
      { parentPartId: "FG", componentPartId: "PH", quantityPer: 1, scrapPercent: 0 },
      { parentPartId: "PH", componentPartId: "RAW", quantityPer: 3, scrapPercent: 0 },
    ];
    const exploded = explodeBomLevel("FG", 2, edges, {
      FG: "manufactured",
      PH: "phantom",
      RAW: "purchased",
    });
    expect(exploded).toEqual([{ partId: "RAW", quantity: 6, isPhantom: false }]);
  });

  it("bygger träd med djup", () => {
    const edges: BomEdge[] = [
      {
        parentPartId: "FG",
        componentPartId: "C1",
        quantityPer: 2,
        scrapPercent: 0,
        position: 10,
      },
    ];
    const tree = buildBomTree("FG", edges, {
      FG: "manufactured",
      C1: "purchased",
    });
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]!.partId).toBe("C1");
    expect(tree.children[0]!.effectiveQuantity).toBe(2);
  });
});

describe("Partiformning", () => {
  it("lot-for-lot ger exakt netto", () => {
    expect(applyLotSizing(17, "lot_for_lot", null)).toBe(17);
  });

  it("fixed_qty avrundar upp till multiplar", () => {
    expect(applyLotSizing(17, "fixed_qty", 10)).toBe(20);
    expect(applyLotSizing(10, "fixed_qty", 10)).toBe(10);
  });

  it("min_qty tar minst partistorlek", () => {
    expect(applyLotSizing(3, "min_qty", 10)).toBe(10);
    expect(applyLotSizing(12, "min_qty", 10)).toBe(12);
  });

  it("EOQ beter sig som fixed i prototypen", () => {
    expect(applyLotSizing(25, "economic_order_qty", 20)).toBe(40);
  });
});

describe("MRP-motor", () => {
  it("1. enkelt inköpsbehov utan saldo", () => {
    const result = runMrp(
      baseInput({
        parts: [part("RAW", { leadTimeDays: 5 })],
        demands: [
          {
            partId: "RAW",
            quantity: 10,
            dueDate: "2026-08-20",
            sourceType: "customer_order",
            sourceId: "KO-1",
          },
        ],
      }),
    );
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]!.quantity).toBe(10);
    expect(result.suggestions[0]!.orderDate).toBe("2026-08-15");
    expect(result.suggestions[0]!.suggestionType).toBe("purchase");
    expect(result.suggestions[0]!.isLate).toBe(false);
  });

  it("2. saldo täcker behov — inget förslag", () => {
    const result = runMrp(
      baseInput({
        parts: [part("RAW")],
        onHandByPart: { RAW: 10 },
        demands: [
          {
            partId: "RAW",
            quantity: 10,
            dueDate: "2026-08-10",
            sourceType: "manual",
            sourceId: null,
          },
        ],
      }),
    );
    expect(result.suggestions).toHaveLength(0);
  });

  it("3. säkerhetslager driver extra behov", () => {
    const result = runMrp(
      baseInput({
        parts: [part("RAW", { safetyStock: 5 })],
        onHandByPart: { RAW: 0 },
        demands: [
          {
            partId: "RAW",
            quantity: 10,
            dueDate: "2026-08-10",
            sourceType: "manual",
            sourceId: null,
          },
        ],
      }),
    );
    expect(result.suggestions[0]!.quantity).toBe(15);
  });

  it("4. schemalagd tillgång minskar netto", () => {
    const result = runMrp(
      baseInput({
        parts: [part("RAW")],
        supplies: [
          {
            partId: "RAW",
            quantity: 8,
            dueDate: "2026-08-05",
            sourceType: "purchase_order",
            sourceId: "IO-1",
          },
        ],
        demands: [
          {
            partId: "RAW",
            quantity: 10,
            dueDate: "2026-08-10",
            sourceType: "manual",
            sourceId: null,
          },
        ],
      }),
    );
    expect(result.suggestions[0]!.quantity).toBe(2);
  });

  it("5. flernivå-BOM skapar beroende behov", () => {
    const edges: BomEdge[] = [
      { parentPartId: "FG", componentPartId: "SA", quantityPer: 1, scrapPercent: 0 },
      { parentPartId: "SA", componentPartId: "RAW", quantityPer: 2, scrapPercent: 0 },
    ];
    const result = runMrp(
      baseInput({
        parts: [
          part("FG", { type: "manufactured", leadTimeDays: 3 }),
          part("SA", { type: "manufactured", leadTimeDays: 2 }),
          part("RAW", { leadTimeDays: 5 }),
        ],
        bomEdges: edges,
        demands: [
          {
            partId: "FG",
            quantity: 5,
            dueDate: "2026-08-30",
            sourceType: "customer_order",
            sourceId: "KO-9",
          },
        ],
      }),
    );

    const fg = result.suggestions.find((s) => s.partId === "FG");
    const sa = result.suggestions.find((s) => s.partId === "SA");
    const raw = result.suggestions.find((s) => s.partId === "RAW");
    expect(fg?.quantity).toBe(5);
    expect(fg?.suggestionType).toBe("manufacture");
    expect(sa?.quantity).toBe(5);
    expect(raw?.quantity).toBe(10);
    expect(result.dependentDemands.length).toBeGreaterThan(0);
    expect(result.lowLevelCodes.RAW).toBe(2);
  });

  it("6. fantom sprängs igenom utan eget förslag", () => {
    const edges: BomEdge[] = [
      { parentPartId: "FG", componentPartId: "PH", quantityPer: 1, scrapPercent: 0 },
      { parentPartId: "PH", componentPartId: "RAW", quantityPer: 4, scrapPercent: 0 },
    ];
    const result = runMrp(
      baseInput({
        parts: [
          part("FG", { type: "manufactured", leadTimeDays: 2 }),
          part("PH", { type: "phantom" }),
          part("RAW"),
        ],
        bomEdges: edges,
        demands: [
          {
            partId: "FG",
            quantity: 3,
            dueDate: "2026-08-20",
            sourceType: "customer_order",
            sourceId: "KO-1",
          },
        ],
      }),
    );
    expect(result.suggestions.find((s) => s.partId === "PH")).toBeUndefined();
    expect(result.suggestions.find((s) => s.partId === "RAW")?.quantity).toBe(12);
  });

  it("7. försenat orderdatum flaggas", () => {
    const result = runMrp(
      baseInput({
        asOfDate: "2026-08-10",
        parts: [part("RAW", { leadTimeDays: 14 })],
        demands: [
          {
            partId: "RAW",
            quantity: 1,
            dueDate: "2026-08-15",
            sourceType: "customer_order",
            sourceId: "KO-late",
          },
        ],
      }),
    );
    expect(result.suggestions[0]!.isLate).toBe(true);
    expect(result.suggestions[0]!.orderDate).toBe("2026-08-01");
    expect(result.suggestions[0]!.pegging[0]!.explanation).toMatch(/Försenat/);
  });

  it("8. fixed_qty partiformning", () => {
    const result = runMrp(
      baseInput({
        parts: [part("RAW", { lotSizingRule: "fixed_qty", lotSize: 25 })],
        demands: [
          {
            partId: "RAW",
            quantity: 30,
            dueDate: "2026-08-20",
            sourceType: "forecast",
            sourceId: null,
          },
        ],
      }),
    );
    expect(result.suggestions[0]!.quantity).toBe(50);
  });

  it("9. min_qty partiformning", () => {
    const result = runMrp(
      baseInput({
        parts: [part("RAW", { lotSizingRule: "min_qty", lotSize: 100 })],
        demands: [
          {
            partId: "RAW",
            quantity: 12,
            dueDate: "2026-08-20",
            sourceType: "manual",
            sourceId: null,
          },
        ],
      }),
    );
    expect(result.suggestions[0]!.quantity).toBe(100);
  });

  it("10. spill ökar komponentbehov", () => {
    const edges: BomEdge[] = [
      {
        parentPartId: "FG",
        componentPartId: "RAW",
        quantityPer: 10,
        scrapPercent: 10,
      },
    ];
    const result = runMrp(
      baseInput({
        parts: [
          part("FG", { type: "manufactured", leadTimeDays: 1 }),
          part("RAW"),
        ],
        bomEdges: edges,
        demands: [
          {
            partId: "FG",
            quantity: 1,
            dueDate: "2026-08-20",
            sourceType: "customer_order",
            sourceId: "KO-1",
          },
        ],
      }),
    );
    expect(result.suggestions.find((s) => s.partId === "RAW")!.quantity).toBeCloseTo(
      11.1111,
      3,
    );
  });

  it("11. manuell planeringsmetod ger inga förslag", () => {
    const result = runMrp(
      baseInput({
        parts: [part("RAW", { planningMethod: "manual" })],
        demands: [
          {
            partId: "RAW",
            quantity: 5,
            dueDate: "2026-08-20",
            sourceType: "manual",
            sourceId: null,
          },
        ],
      }),
    );
    expect(result.suggestions).toHaveLength(0);
  });

  it("12. cirkulär BOM avbryter körning", () => {
    expect(() =>
      runMrp(
        baseInput({
          parts: [part("A", { type: "manufactured" }), part("B", { type: "manufactured" })],
          bomEdges: [
            { parentPartId: "A", componentPartId: "B", quantityPer: 1, scrapPercent: 0 },
            { parentPartId: "B", componentPartId: "A", quantityPer: 1, scrapPercent: 0 },
          ],
          demands: [
            {
              partId: "A",
              quantity: 1,
              dueDate: "2026-08-20",
              sourceType: "manual",
              sourceId: null,
            },
          ],
        }),
      ),
    ).toThrow(/Cirkulär/);
  });

  it("13. pegging förklarar kundorder", () => {
    const result = runMrp(
      baseInput({
        parts: [part("RAW")],
        demands: [
          {
            partId: "RAW",
            quantity: 7,
            dueDate: "2026-08-20",
            sourceType: "customer_order",
            sourceId: "KO-42",
          },
        ],
      }),
    );
    expect(result.suggestions[0]!.pegging[0]!.demandSourceId).toBe("KO-42");
    expect(result.suggestions[0]!.pegging[0]!.explanation).toMatch(/kundorder/);
  });

  it("14. flera behov samma dag aggregeras i ett förslag", () => {
    const demands: TimePhasedQty[] = [
      {
        partId: "RAW",
        quantity: 4,
        dueDate: "2026-08-20",
        sourceType: "customer_order",
        sourceId: "A",
      },
      {
        partId: "RAW",
        quantity: 6,
        dueDate: "2026-08-20",
        sourceType: "customer_order",
        sourceId: "B",
      },
    ];
    const result = runMrp(
      baseInput({
        parts: [part("RAW")],
        demands,
      }),
    );
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]!.quantity).toBe(10);
    expect(result.suggestions[0]!.pegging).toHaveLength(2);
  });

  it("15. försenat beroende behov på komponent", () => {
    const edges: BomEdge[] = [
      { parentPartId: "FG", componentPartId: "RAW", quantityPer: 1, scrapPercent: 0 },
    ];
    const result = runMrp(
      baseInput({
        asOfDate: "2026-08-10",
        parts: [
          part("FG", { type: "manufactured", leadTimeDays: 5 }),
          part("RAW", { leadTimeDays: 10 }),
        ],
        bomEdges: edges,
        demands: [
          {
            partId: "FG",
            quantity: 1,
            dueDate: "2026-08-12",
            sourceType: "customer_order",
            sourceId: "KO-urgent",
          },
        ],
      }),
    );
    const raw = result.suggestions.find((s) => s.partId === "RAW");
    expect(raw).toBeDefined();
    expect(raw!.isLate).toBe(true);
  });

  it("16. subtractDays och datumordning", () => {
    expect(subtractDays("2026-08-10", 3)).toBe("2026-08-07");
    expect(compareIsoDates("2026-08-01", "2026-08-02")).toBe(-1);
  });

  it("17. endast säkerhetslager utan externt behov", () => {
    const result = runMrp(
      baseInput({
        parts: [part("RAW", { safetyStock: 20 })],
        onHandByPart: { RAW: 5 },
        demands: [],
      }),
    );
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]!.quantity).toBe(15);
    expect(result.suggestions[0]!.pegging[0]!.demandSourceType).toBe(
      "safety_stock",
    );
  });
});
