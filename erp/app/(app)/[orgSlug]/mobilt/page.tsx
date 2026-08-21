import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listParts } from "@/modules/inventory/services/parts";
import { listStockLocations } from "@/modules/inventory/services/warehouses";
import { listInventoryCounts } from "@/modules/inventory/services/inventory-count";
import { MobileWarehouseClient } from "./mobile-warehouse-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function MobileWarehousePage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  const [parts, locations, counts] = await Promise.all([
    listParts(ctx.organizationId, { search: "" }),
    listStockLocations(ctx.organizationId),
    listInventoryCounts(ctx.organizationId),
  ]);

  const openCounts = counts.filter(
    (c) => c.status === "counting" || c.status === "pending_approval",
  );

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Mobilt
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Mobilt lager
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inleverans, utleverans och inventering med kamera eller manuell
          inmatning.
        </p>
      </div>
      <MobileWarehouseClient
        orgSlug={orgSlug}
        parts={parts.map((p) => ({
          id: p.id,
          partNumber: p.partNumber,
          description: p.description,
          unit: p.unit,
        }))}
        locations={locations.map((l) => ({
          id: l.id,
          code: l.code,
          warehouseCode: l.warehouseCode,
          label: `${l.warehouseCode} / ${l.code}`,
        }))}
        openCounts={openCounts.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
        }))}
      />
    </div>
  );
}
