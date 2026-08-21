import { describe, expect, it } from "vitest";
import { csvRowToCreateInput, parsePartsCsv } from "./csv";
import { createPartBasicSchema } from "./part-schemas";

describe("CSV-import av artiklar", () => {
  it("parsár giltig CSV", () => {
    const csv = `partNumber,description,unit,type
A-100,Bricka M8,st,purchased
B-200,Axel 12mm,m,manufactured`;
    const result = parsePartsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.partNumber).toBe("A-100");
  });

  it("kräver artikelnummer och benämning i headern", () => {
    const result = parsePartsCsv("foo,bar\n1,2");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toMatch(/partNumber|artikelnummer/i);
  });

  it("mappar rad till create-input med defaults", () => {
    const input = csvRowToCreateInput({
      partNumber: "X-1",
      description: "Test",
    });
    expect(input.unit).toBe("st");
    expect(input.type).toBe("purchased");
    expect(input.status).toBe("active");
    expect(input.planningMethod).toBe("mrp");
  });
});

describe("progressiv skapande-validering", () => {
  it("godkänner fyra basfält", () => {
    const parsed = createPartBasicSchema.parse({
      partNumber: "1001",
      description: "Bricka",
      unit: "st",
      type: "purchased",
    });
    expect(parsed.partNumber).toBe("1001");
  });

  it("kräver artikelnummer", () => {
    expect(() =>
      createPartBasicSchema.parse({
        partNumber: "",
        description: "Bricka",
      }),
    ).toThrow();
  });
});
