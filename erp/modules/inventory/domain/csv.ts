import type { CreatePartInput } from "./part-schemas";

export type CsvPartRow = {
  partNumber: string;
  description: string;
  unit?: string;
  type?: string;
  status?: string;
  standardCost?: string;
  salesPrice?: string;
  leadTimeDays?: string;
  safetyStock?: string;
  notes?: string;
};

export type CsvParseResult = {
  rows: CsvPartRow[];
  errors: string[];
};

/**
 * Enkel CSV-parser (komma-separerad, stödjer citationstecken).
 * Förväntad header: partNumber,description,unit,type,...
 */
export function parsePartsCsv(text: string): CsvParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: ["Filen är tom"] };
  }

  const header = splitCsvLine(lines[0] ?? "");
  const normalized = header.map((h) => h.trim().toLowerCase());
  const idx = (name: string) => normalized.indexOf(name.toLowerCase());

  const partNumberIdx = idx("partnumber") >= 0 ? idx("partnumber") : idx("artikelnummer");
  const descriptionIdx =
    idx("description") >= 0 ? idx("description") : idx("benamning");

  if (partNumberIdx < 0 || descriptionIdx < 0) {
    return {
      rows: [],
      errors: [
        "CSV måste ha kolumnerna partNumber (eller artikelnummer) och description (eller benamning)",
      ],
    };
  }

  const unitIdx = idx("unit") >= 0 ? idx("unit") : idx("enhet");
  const typeIdx = idx("type") >= 0 ? idx("type") : idx("typ");
  const statusIdx = idx("status");
  const costIdx = idx("standardcost");
  const priceIdx = idx("salesprice");
  const leadIdx = idx("leadtimedays");
  const safetyIdx = idx("safetystock");
  const notesIdx = idx("notes") >= 0 ? idx("notes") : idx("anteckningar");

  const rows: CsvPartRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i] ?? "");
    const partNumber = (cols[partNumberIdx] ?? "").trim();
    const description = (cols[descriptionIdx] ?? "").trim();
    if (!partNumber || !description) {
      errors.push(`Rad ${i + 1}: saknar artikelnummer eller benämning`);
      continue;
    }
    rows.push({
      partNumber,
      description,
      unit: unitIdx >= 0 ? cols[unitIdx]?.trim() : undefined,
      type: typeIdx >= 0 ? cols[typeIdx]?.trim() : undefined,
      status: statusIdx >= 0 ? cols[statusIdx]?.trim() : undefined,
      standardCost: costIdx >= 0 ? cols[costIdx]?.trim() : undefined,
      salesPrice: priceIdx >= 0 ? cols[priceIdx]?.trim() : undefined,
      leadTimeDays: leadIdx >= 0 ? cols[leadIdx]?.trim() : undefined,
      safetyStock: safetyIdx >= 0 ? cols[safetyIdx]?.trim() : undefined,
      notes: notesIdx >= 0 ? cols[notesIdx]?.trim() : undefined,
    });
  }

  return { rows, errors };
}

export function csvRowToCreateInput(row: CsvPartRow): CreatePartInput {
  return {
    partNumber: row.partNumber,
    description: row.description,
    unit: (row.unit as CreatePartInput["unit"]) || "st",
    type: (row.type as CreatePartInput["type"]) || "purchased",
    status: (row.status as CreatePartInput["status"]) || "active",
    standardCost: row.standardCost ? Number(row.standardCost) : 0,
    salesPrice: row.salesPrice ? Number(row.salesPrice) : 0,
    leadTimeDays: row.leadTimeDays ? Number(row.leadTimeDays) : 0,
    safetyStock: row.safetyStock ? Number(row.safetyStock) : 0,
    reorderPoint: 0,
    lotSizingRule: "lot_for_lot",
    planningMethod: "mrp",
    traceabilityMode: "none",
    notes: row.notes ?? null,
  };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}
