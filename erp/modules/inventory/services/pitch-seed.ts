import { and, eq } from "drizzle-orm";
import { getTenantDb } from "@/core/db/tenant";
import {
  bom,
  bomLine,
  demandLine,
  inventoryCount,
  inventoryCountLine,
  part,
  stockBalance,
  stockLocation,
  supplyLine,
  warehouse,
} from "../schema";
import { postStockTransaction } from "./stock";

/**
 * Pitch-seed för demo — kompakt dataset (~100 artiklar, ~20 BOM, 6 mån behov).
 * Prototypen använder medvetet mindre volym än full produktion för snabb seed.
 */

const PURCHASED_NAMES: Array<[string, string]> = [
  ["RAW-STAL-01", "Stångstål Ø20"],
  ["RAW-STAL-02", "Plåt 3mm"],
  ["RAW-ALU-01", "Aluminiumprofil"],
  ["RAW-GJL-01", "Gjutgods hus"],
  ["RAW-GJL-02", "Gjutgods lock"],
  ["RAW-AXEL-01", "Axel stål"],
  ["RAW-AXEL-02", "Axel rostfri"],
  ["RAW-PACK-01", "Packningssats"],
  ["RAW-PACK-02", "O-ringsats"],
  ["RAW-SKRUV-01", "Skruv M8×20"],
  ["RAW-SKRUV-02", "Mutter M8"],
  ["RAW-LAGER-01", "Kullager 6204"],
  ["RAW-LAGER-02", "Kullager 6205"],
  ["RAW-EL-01", "Kabel 1,5 mm²"],
  ["RAW-EL-02", "Kontaktor 24V"],
  ["RAW-EL-03", "Sensor induktiv"],
  ["RAW-HYD-01", "Hydraulslang"],
  ["RAW-HYD-02", "Ventilblock"],
  ["RAW-HYD-03", "Pumpkit"],
  ["RAW-FARG-01", "Lack blå RAL5010"],
  ["RAW-FARG-02", "Primer grå"],
  ["RAW-PLAST-01", "Kapsling ABS"],
  ["RAW-PLAST-02", "Kabelkanal"],
  ["RAW-FILTER-01", "Olje filter"],
  ["RAW-FILTER-02", "Luftfilter"],
  ["RAW-MOTOR-01", "Elmotor 0,75 kW"],
  ["RAW-MOTOR-02", "Elmotor 1,5 kW"],
  ["RAW-REM-01", "Kuggrem"],
  ["RAW-REM-02", "Kilrem"],
  ["RAW-TAT-01", "Tätningsring"],
  ["RAW-TAT-02", "V-ring"],
  ["RAW-FJADR-01", "Tryckfjäder"],
  ["RAW-BRICK-01", "Bricka M8"],
  ["RAW-MUTTER-01", "Låsmutter M10"],
  ["RAW-ROR-01", "Rör Ø12"],
  ["RAW-ROR-02", "Rör Ø18"],
  ["RAW-KOPPL-01", "Koppling snabb"],
  ["RAW-KOPPL-02", "Nippel 1/4"],
  ["RAW-OLJA-01", "Hydraulikolja 32"],
  ["RAW-FETT-01", "Lagerfett"],
  ["RAW-TEJP-01", "Isoleringstejp"],
  ["RAW-KLEMM-01", "Kabelklämma"],
  ["RAW-BRICK-02", "Fjäderbricka"],
  ["RAW-PINN-01", "Sprint Ø4"],
  ["RAW-NYCKEL-01", "Nyckelkit service"],
  ["RAW-ETIKETT-01", "Typskylt"],
  ["RAW-KARTONG-01", "Förpackning M"],
  ["RAW-KARTONG-02", "Förpackning L"],
  ["RAW-FOAM-01", "Skyddsskum"],
  ["RAW-MANUAL-01", "Bruksanvisning SE"],
  ["RAW-PCB-01", "Styrkort bas"],
  ["RAW-PCB-02", "I/O-kort"],
  ["RAW-DISP-01", "Display 2,4\""],
  ["RAW-KNAPP-01", "Tryckknapp grön"],
  ["RAW-KNAPP-02", "Nödstopp"],
  ["RAW-FLANS-01", "Fläns DN50"],
  ["RAW-FLANS-02", "Fläns DN80"],
  ["RAW-GUMMI-01", "Gummibuffert"],
  ["RAW-GLAS-01", "Skyddsglas"],
  ["RAW-NET-01", "Nätfilter EMC"],
  ["RAW-TRAFO-01", "Transformator 24V"],
  ["RAW-RELA-01", "Relä 24V"],
  ["RAW-SAKR-01", "Säkring 10A"],
  ["RAW-TERM-01", "Termostat"],
  ["RAW-FLAKT-01", "Kylfläkt"],
  ["RAW-KYL-01", "Kylfläns"],
];

const MFG_NAMES: Array<[string, string]> = [
  ["SA-HUS-01", "Pumphus-enhet"],
  ["SA-HUS-02", "Pumphus kompakt"],
  ["SA-LOCK-01", "Lockenhet"],
  ["SA-DRIV-01", "Drivpaket"],
  ["SA-DRIV-02", "Drivpaket HD"],
  ["SA-EL-01", "Elskåpsenhet"],
  ["SA-EL-02", "Styrenhet"],
  ["SA-HYD-01", "Hydraulikblock"],
  ["SA-MOTOR-01", "Motormontering"],
  ["SA-AXEL-01", "Axelenhet"],
  ["SA-FILTER-01", "Filtermodul"],
  ["SA-PANEL-01", "Operatörspanel"],
  ["FG-PUMP-01", "Hydraulpump komplett"],
  ["FG-PUMP-02", "Hydraulpump kompakt"],
  ["FG-PUMP-03", "Hydraulpump HD"],
  ["FG-AGG-01", "Hydraulikaggregat"],
  ["FG-AGG-02", "Hydraulikaggregat XL"],
  ["FG-STYR-01", "Styrskåp komplett"],
  ["FG-STYR-02", "Styrskåp kompakt"],
  ["FG-STATION-01", "Pumpstation"],
  ["FG-STATION-02", "Pumpstation mobil"],
  ["PH-KIT-01", "Monteringskit (fantom)"],
  ["PH-KIT-02", "Elkit (fantom)"],
  ["PH-KIT-03", "Hydraulikkit (fantom)"],
  ["PH-PACK-01", "Förpackningskit (fantom)"],
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export async function seedPitchDemo(
  organizationId: string,
  userId: string,
): Promise<{
  parts: number;
  boms: number;
  demandLines: number;
  supplyLines: number;
  locations: string[];
  inventoryCountId: string | null;
  message: string;
}> {
  // Ensure warehouse + locations first (inside tenant tx)
  const setup = await getTenantDb(organizationId, async (tx) => {
    let wh = (
      await tx
        .select()
        .from(warehouse)
        .where(
          and(
            eq(warehouse.organizationId, organizationId),
            eq(warehouse.code, "MAIN"),
          ),
        )
        .limit(1)
    )[0];
    if (!wh) {
      const [created] = await tx
        .insert(warehouse)
        .values({
          organizationId,
          code: "MAIN",
          name: "Huvudlager",
          allowNegativeStock: false,
          createdBy: userId,
        })
        .returning();
      wh = created!;
    }

    const locCodes = ["A-01", "A-02", "B-01"] as const;
    const locations: Record<string, string> = {};
    for (const code of locCodes) {
      const existing = (
        await tx
          .select()
          .from(stockLocation)
          .where(
            and(
              eq(stockLocation.organizationId, organizationId),
              eq(stockLocation.warehouseId, wh.id),
              eq(stockLocation.code, code),
            ),
          )
          .limit(1)
      )[0];
      if (existing) {
        locations[code] = existing.id;
      } else {
        const [created] = await tx
          .insert(stockLocation)
          .values({
            organizationId,
            warehouseId: wh.id,
            code,
            name: `Plats ${code}`,
            type: code.startsWith("A") ? "picking" : "bulk",
            createdBy: userId,
          })
          .returning();
        locations[code] = created!.id;
      }
    }

    const partIds = new Map<string, string>();

    async function ensurePart(
      partNumber: string,
      description: string,
      type: "purchased" | "manufactured" | "phantom",
      extras: {
        standardCost?: string;
        safetyStock?: string;
        leadTimeDays?: number;
        lotSizingRule?: "lot_for_lot" | "fixed_qty" | "min_qty";
        lotSize?: string;
      } = {},
    ) {
      const existing = (
        await tx
          .select()
          .from(part)
          .where(
            and(
              eq(part.organizationId, organizationId),
              eq(part.partNumber, partNumber),
            ),
          )
          .limit(1)
      )[0];
      if (existing) {
        partIds.set(partNumber, existing.id);
        return existing;
      }
      const cost =
        extras.standardCost ??
        String(Math.round((10 + Math.random() * 490) * 100) / 100);
      const [created] = await tx
        .insert(part)
        .values({
          organizationId,
          partNumber,
          description,
          type,
          unit: "st",
          status: "active",
          standardCost: cost,
          safetyStock: extras.safetyStock ?? (type === "purchased" ? "5" : "2"),
          leadTimeDays:
            extras.leadTimeDays ??
            (type === "purchased" ? 10 : type === "phantom" ? 0 : 5),
          lotSizingRule: extras.lotSizingRule ?? "lot_for_lot",
          lotSize: extras.lotSize ?? null,
          planningMethod: "mrp",
          createdBy: userId,
        })
        .returning();
      partIds.set(partNumber, created!.id);
      return created!;
    }

    // Compact seed: ~90 purchased + ~25 mfg/phantom (impressive but fast)
    for (const [pn, desc] of PURCHASED_NAMES) {
      await ensurePart(pn, desc, "purchased");
    }
    for (const [pn, desc] of MFG_NAMES) {
      const type = pn.startsWith("PH-")
        ? ("phantom" as const)
        : ("manufactured" as const);
      await ensurePart(pn, desc, type, {
        leadTimeDays: type === "phantom" ? 0 : 7,
      });
    }

    async function ensureBom(
      parentPn: string,
      revision: string,
      lines: Array<{ componentPn: string; qty: number; position: number }>,
    ) {
      const parentId = partIds.get(parentPn);
      if (!parentId) return null;
      const existing = (
        await tx
          .select()
          .from(bom)
          .where(
            and(
              eq(bom.organizationId, organizationId),
              eq(bom.parentPartId, parentId),
              eq(bom.revision, revision),
            ),
          )
          .limit(1)
      )[0];
      let bomId = existing?.id;
      if (!bomId) {
        await tx
          .update(bom)
          .set({ status: "obsolete", updatedAt: new Date() })
          .where(
            and(
              eq(bom.organizationId, organizationId),
              eq(bom.parentPartId, parentId),
              eq(bom.status, "active"),
            ),
          );
        const [created] = await tx
          .insert(bom)
          .values({
            organizationId,
            parentPartId: parentId,
            revision,
            status: "active",
            createdBy: userId,
          })
          .returning();
        bomId = created!.id;
      }

      for (const line of lines) {
        const componentId = partIds.get(line.componentPn);
        if (!componentId) continue;
        const found = (
          await tx
            .select({ id: bomLine.id })
            .from(bomLine)
            .where(
              and(
                eq(bomLine.bomId, bomId),
                eq(bomLine.componentPartId, componentId),
              ),
            )
            .limit(1)
        )[0];
        if (found) continue;
        await tx.insert(bomLine).values({
          organizationId,
          bomId,
          componentPartId: componentId,
          quantityPer: String(line.qty),
          scrapPercent: "0",
          position: line.position,
        });
      }
      return bomId;
    }

    // ~20 multi-level BOMs with phantoms
    const bomDefs: Array<{
      parent: string;
      lines: Array<{ componentPn: string; qty: number; position: number }>;
    }> = [
      {
        parent: "FG-PUMP-01",
        lines: [
          { componentPn: "SA-HUS-01", qty: 1, position: 10 },
          { componentPn: "SA-DRIV-01", qty: 1, position: 20 },
          { componentPn: "PH-KIT-01", qty: 1, position: 30 },
        ],
      },
      {
        parent: "FG-PUMP-02",
        lines: [
          { componentPn: "SA-HUS-02", qty: 1, position: 10 },
          { componentPn: "SA-DRIV-01", qty: 1, position: 20 },
          { componentPn: "PH-KIT-01", qty: 1, position: 30 },
        ],
      },
      {
        parent: "FG-PUMP-03",
        lines: [
          { componentPn: "SA-HUS-01", qty: 1, position: 10 },
          { componentPn: "SA-DRIV-02", qty: 1, position: 20 },
          { componentPn: "PH-KIT-03", qty: 1, position: 30 },
        ],
      },
      {
        parent: "FG-AGG-01",
        lines: [
          { componentPn: "FG-PUMP-01", qty: 1, position: 10 },
          { componentPn: "SA-HYD-01", qty: 1, position: 20 },
          { componentPn: "SA-MOTOR-01", qty: 1, position: 30 },
          { componentPn: "PH-PACK-01", qty: 1, position: 40 },
        ],
      },
      {
        parent: "FG-AGG-02",
        lines: [
          { componentPn: "FG-PUMP-03", qty: 2, position: 10 },
          { componentPn: "SA-HYD-01", qty: 1, position: 20 },
          { componentPn: "SA-EL-01", qty: 1, position: 30 },
        ],
      },
      {
        parent: "FG-STYR-01",
        lines: [
          { componentPn: "SA-EL-01", qty: 1, position: 10 },
          { componentPn: "SA-PANEL-01", qty: 1, position: 20 },
          { componentPn: "PH-KIT-02", qty: 1, position: 30 },
        ],
      },
      {
        parent: "FG-STYR-02",
        lines: [
          { componentPn: "SA-EL-02", qty: 1, position: 10 },
          { componentPn: "SA-PANEL-01", qty: 1, position: 20 },
        ],
      },
      {
        parent: "FG-STATION-01",
        lines: [
          { componentPn: "FG-AGG-01", qty: 1, position: 10 },
          { componentPn: "FG-STYR-01", qty: 1, position: 20 },
          { componentPn: "SA-FILTER-01", qty: 1, position: 30 },
        ],
      },
      {
        parent: "FG-STATION-02",
        lines: [
          { componentPn: "FG-AGG-02", qty: 1, position: 10 },
          { componentPn: "FG-STYR-02", qty: 1, position: 20 },
        ],
      },
      {
        parent: "SA-HUS-01",
        lines: [
          { componentPn: "RAW-GJL-01", qty: 1, position: 10 },
          { componentPn: "RAW-PACK-01", qty: 2, position: 20 },
          { componentPn: "RAW-SKRUV-01", qty: 8, position: 30 },
        ],
      },
      {
        parent: "SA-HUS-02",
        lines: [
          { componentPn: "RAW-GJL-02", qty: 1, position: 10 },
          { componentPn: "RAW-PACK-02", qty: 1, position: 20 },
        ],
      },
      {
        parent: "SA-DRIV-01",
        lines: [
          { componentPn: "SA-AXEL-01", qty: 1, position: 10 },
          { componentPn: "RAW-LAGER-01", qty: 2, position: 20 },
          { componentPn: "RAW-REM-01", qty: 1, position: 30 },
        ],
      },
      {
        parent: "SA-DRIV-02",
        lines: [
          { componentPn: "SA-AXEL-01", qty: 1, position: 10 },
          { componentPn: "RAW-LAGER-02", qty: 2, position: 20 },
          { componentPn: "RAW-REM-02", qty: 1, position: 30 },
        ],
      },
      {
        parent: "SA-AXEL-01",
        lines: [
          { componentPn: "RAW-AXEL-01", qty: 1, position: 10 },
          { componentPn: "RAW-TAT-01", qty: 2, position: 20 },
        ],
      },
      {
        parent: "SA-HYD-01",
        lines: [
          { componentPn: "RAW-HYD-01", qty: 2, position: 10 },
          { componentPn: "RAW-HYD-02", qty: 1, position: 20 },
          { componentPn: "RAW-KOPPL-01", qty: 4, position: 30 },
        ],
      },
      {
        parent: "SA-MOTOR-01",
        lines: [
          { componentPn: "RAW-MOTOR-01", qty: 1, position: 10 },
          { componentPn: "RAW-FLANS-01", qty: 1, position: 20 },
          { componentPn: "RAW-SKRUV-02", qty: 6, position: 30 },
        ],
      },
      {
        parent: "SA-EL-01",
        lines: [
          { componentPn: "RAW-PCB-01", qty: 1, position: 10 },
          { componentPn: "RAW-EL-02", qty: 2, position: 20 },
          { componentPn: "RAW-TRAFO-01", qty: 1, position: 30 },
          { componentPn: "RAW-PLAST-01", qty: 1, position: 40 },
        ],
      },
      {
        parent: "SA-EL-02",
        lines: [
          { componentPn: "RAW-PCB-02", qty: 1, position: 10 },
          { componentPn: "RAW-RELA-01", qty: 4, position: 20 },
        ],
      },
      {
        parent: "SA-PANEL-01",
        lines: [
          { componentPn: "RAW-DISP-01", qty: 1, position: 10 },
          { componentPn: "RAW-KNAPP-01", qty: 3, position: 20 },
          { componentPn: "RAW-KNAPP-02", qty: 1, position: 30 },
        ],
      },
      {
        parent: "SA-FILTER-01",
        lines: [
          { componentPn: "RAW-FILTER-01", qty: 1, position: 10 },
          { componentPn: "RAW-FILTER-02", qty: 1, position: 20 },
          { componentPn: "RAW-ROR-01", qty: 2, position: 30 },
        ],
      },
      {
        parent: "SA-LOCK-01",
        lines: [
          { componentPn: "RAW-GJL-02", qty: 1, position: 10 },
          { componentPn: "RAW-PACK-02", qty: 1, position: 20 },
        ],
      },
      {
        parent: "PH-KIT-01",
        lines: [
          { componentPn: "RAW-SKRUV-01", qty: 12, position: 10 },
          { componentPn: "RAW-BRICK-01", qty: 12, position: 20 },
          { componentPn: "RAW-MUTTER-01", qty: 8, position: 30 },
        ],
      },
      {
        parent: "PH-KIT-02",
        lines: [
          { componentPn: "RAW-EL-01", qty: 5, position: 10 },
          { componentPn: "RAW-KLEMM-01", qty: 10, position: 20 },
          { componentPn: "RAW-SAKR-01", qty: 2, position: 30 },
        ],
      },
      {
        parent: "PH-KIT-03",
        lines: [
          { componentPn: "RAW-HYD-03", qty: 1, position: 10 },
          { componentPn: "RAW-OLJA-01", qty: 2, position: 20 },
          { componentPn: "RAW-KOPPL-02", qty: 4, position: 30 },
        ],
      },
      {
        parent: "PH-PACK-01",
        lines: [
          { componentPn: "RAW-KARTONG-02", qty: 1, position: 10 },
          { componentPn: "RAW-FOAM-01", qty: 1, position: 20 },
          { componentPn: "RAW-MANUAL-01", qty: 1, position: 30 },
          { componentPn: "RAW-ETIKETT-01", qty: 1, position: 40 },
        ],
      },
    ];

    let bomCount = 0;
    for (const def of bomDefs) {
      const id = await ensureBom(def.parent, "A", def.lines);
      if (id) bomCount += 1;
    }

    // Demand + supply over ~6 months
    let demandCount = 0;
    let supplyCount = 0;
    const fgParts = [
      "FG-PUMP-01",
      "FG-PUMP-02",
      "FG-PUMP-03",
      "FG-AGG-01",
      "FG-STYR-01",
      "FG-STATION-01",
    ];
    const rawParts = [
      "RAW-GJL-01",
      "RAW-AXEL-01",
      "RAW-SKRUV-01",
      "RAW-LAGER-01",
      "RAW-MOTOR-01",
      "RAW-HYD-02",
      "RAW-PCB-01",
    ];

    for (let month = 0; month < 6; month++) {
      for (const pn of fgParts) {
        const partId = partIds.get(pn);
        if (!partId) continue;
        const due = daysFromNow(month * 30 + 7 + (month % 3) * 5);
        await tx.insert(demandLine).values({
          organizationId,
          partId,
          quantity: String(2 + (month % 4)),
          dueDate: due,
          sourceType: month % 2 === 0 ? "customer_order" : "forecast",
          sourceId: `PITCH-CO-${month}-${pn}`,
          status: "open",
          createdBy: userId,
        });
        demandCount += 1;
      }
      for (const pn of rawParts) {
        const partId = partIds.get(pn);
        if (!partId) continue;
        const due = daysFromNow(month * 30 + 3);
        await tx.insert(supplyLine).values({
          organizationId,
          partId,
          quantity: String(20 + month * 5),
          dueDate: due,
          sourceType: "purchase_order",
          sourceId: `PITCH-PO-${month}-${pn}`,
          status: "open",
          createdBy: userId,
        });
        supplyCount += 1;
      }
    }

    // Some near-term demand (next 14 days) for dashboard
    for (const pn of ["FG-PUMP-01", "FG-AGG-01", "RAW-SKRUV-01"]) {
      const partId = partIds.get(pn);
      if (!partId) continue;
      await tx.insert(demandLine).values({
        organizationId,
        partId,
        quantity: "5",
        dueDate: daysFromNow(5),
        sourceType: "customer_order",
        sourceId: `PITCH-SOON-${pn}`,
        status: "open",
        createdBy: userId,
      });
      demandCount += 1;
    }

    return {
      warehouseId: wh.id,
      locations,
      partIds,
      bomCount,
      demandCount,
      supplyCount,
      partCount: partIds.size,
    };
  });

  // Seed stock via postStockTransaction (outside nested tx — each posts own tx)
  const stockParts = [
    ...PURCHASED_NAMES.slice(0, 40).map(([pn]) => pn),
    ...MFG_NAMES.filter(([pn]) => !pn.startsWith("PH-")).map(([pn]) => pn),
  ];
  const locList = Object.values(setup.locations);
  let stockSeeded = 0;
  for (let i = 0; i < stockParts.length; i++) {
    const pn = stockParts[i]!;
    const partId = setup.partIds.get(pn);
    if (!partId) continue;
    const locId = locList[i % locList.length]!;
    const qty = 10 + (i % 40);
    const unitCost = 25 + (i % 50);
    try {
      await postStockTransaction(organizationId, userId, {
        partId,
        toLocationId: locId,
        quantity: qty,
        unitCost,
        note: "Pitch-seed inleverans",
      });
      stockSeeded += 1;
    } catch {
      // Ignore duplicates / validation — seed is best-effort for re-runs
    }
  }

  // A few historical-ish extra issues to create movement
  for (const pn of ["RAW-SKRUV-01", "RAW-PACK-01", "RAW-GJL-01"]) {
    const partId = setup.partIds.get(pn);
    if (!partId) continue;
    try {
      await postStockTransaction(organizationId, userId, {
        partId,
        fromLocationId: setup.locations["A-01"]!,
        quantity: 2,
        type: "issue",
        note: "Pitch-seed uttag",
      });
    } catch {
      // best-effort
    }
  }

  // Optional open inventory count
  let inventoryCountId: string | null = null;
  await getTenantDb(organizationId, async (tx) => {
    const existing = (
      await tx
        .select({ id: inventoryCount.id })
        .from(inventoryCount)
        .where(
          and(
            eq(inventoryCount.organizationId, organizationId),
            eq(inventoryCount.status, "counting"),
          ),
        )
        .limit(1)
    )[0];
    if (existing) {
      inventoryCountId = existing.id;
      return;
    }

    const [created] = await tx
      .insert(inventoryCount)
      .values({
        organizationId,
        warehouseId: setup.warehouseId,
        name: "Pitch-inventering MAIN",
        status: "counting",
        note: "Öppen demo-inventering",
        createdBy: userId,
      })
      .returning();
    inventoryCountId = created!.id;

    const balances = await tx
      .select({
        partId: stockBalance.partId,
        locationId: stockBalance.locationId,
        batchId: stockBalance.batchId,
        quantity: stockBalance.quantity,
        averageCost: stockBalance.averageCost,
      })
      .from(stockBalance)
      .innerJoin(stockLocation, eq(stockBalance.locationId, stockLocation.id))
      .where(
        and(
          eq(stockBalance.organizationId, organizationId),
          eq(stockLocation.warehouseId, setup.warehouseId),
        ),
      )
      .limit(30);

    for (const bal of balances) {
      if (Number(bal.quantity) === 0) continue;
      await tx.insert(inventoryCountLine).values({
        organizationId,
        inventoryCountId: created!.id,
        partId: bal.partId,
        locationId: bal.locationId,
        batchId: bal.batchId,
        expectedQuantity: bal.quantity,
        unitCost: bal.averageCost,
      });
    }
  });

  return {
    parts: setup.partCount,
    boms: setup.bomCount,
    demandLines: setup.demandCount,
    supplyLines: setup.supplyCount,
    locations: Object.keys(setup.locations),
    inventoryCountId,
    message: `Pitch-demo seedad: ${setup.partCount} artiklar, ${setup.bomCount} BOM, ${stockSeeded} saldon, ${setup.demandCount} behov.`,
  };
}
