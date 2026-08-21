import { describe, expect, it } from "vitest";
import {
  assertTraceabilityRequirement,
  buildGenealogyTree,
  summarizeTraceImpact,
  TraceabilityError,
  type FlatGenealogyEdge,
  type GenealogyNodeRef,
} from "./genealogy";

describe("assertTraceabilityRequirement", () => {
  it("kräver batch när läge är batch", () => {
    expect(() =>
      assertTraceabilityRequirement("batch", {
        batchId: null,
        quantity: 5,
      }),
    ).toThrow(TraceabilityError);
  });

  it("kräver serie och qty 1 när läge är serial", () => {
    expect(() =>
      assertTraceabilityRequirement("serial", {
        serialUnitId: "s1",
        quantity: 2,
      }),
    ).toThrow(/antal 1/);
    expect(() =>
      assertTraceabilityRequirement("serial", {
        quantity: 1,
      }),
    ).toThrow(/Serienummer/);
  });

  it("godkänner none utan id:n", () => {
    expect(() =>
      assertTraceabilityRequirement("none", { quantity: 10 }),
    ).not.toThrow();
  });
});

describe("buildGenealogyTree + summarizeTraceImpact", () => {
  const labels = new Map<string, GenealogyNodeRef>([
    ["batch:raw", { kind: "batch", id: "raw", label: "B-RAW-1", partNumber: "RAW-01" }],
    [
      "batch:fg",
      { kind: "batch", id: "fg", label: "B-FG-9", partNumber: "FG-01" },
    ],
    [
      "serial:s1",
      { kind: "serial", id: "s1", label: "SN-001", partNumber: "FG-01" },
    ],
  ]);

  const edges: FlatGenealogyEdge[] = [
    {
      consumedBatchId: "raw",
      consumedSerialId: null,
      producedBatchId: "fg",
      producedSerialId: null,
      quantity: 10,
      manufacturingOrderRef: "TO-100",
      depth: 1,
    },
    {
      consumedBatchId: "fg",
      consumedSerialId: null,
      producedBatchId: null,
      producedSerialId: "s1",
      quantity: 1,
      manufacturingOrderRef: "TO-100",
      depth: 2,
    },
  ];

  it("bygger framåtträd från råbatch", () => {
    const tree = buildGenealogyTree(
      labels.get("batch:raw")!,
      edges,
      "forward",
      labels,
    );
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]?.label).toBe("B-FG-9");
    expect(tree.children[0]?.children[0]?.label).toBe("SN-001");
  });

  it("sammanfattar återkallningspåverkan", () => {
    const summary = summarizeTraceImpact(
      "B-RAW-1",
      "forward",
      edges,
      labels,
    );
    expect(summary.batchCount).toBe(2);
    expect(summary.serialCount).toBe(1);
    expect(summary.manufacturingOrderRefs).toEqual(["TO-100"]);
    expect(summary.headline).toMatch(/B-RAW-1/);
    expect(summary.headline).toMatch(/tillverkningsorder/);
  });
});
