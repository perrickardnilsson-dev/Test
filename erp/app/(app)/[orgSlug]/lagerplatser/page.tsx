import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import {
  listWarehouses,
  listStockLocations,
} from "@/modules/inventory/services/warehouses";
import { LocationsClient } from "./locations-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StockLocationsPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);
  const warehouseId =
    typeof sp.warehouse === "string" && sp.warehouse.length > 0
      ? sp.warehouse
      : null;

  const [warehouses, locations] = await Promise.all([
    listWarehouses(ctx.organizationId),
    listStockLocations(ctx.organizationId, warehouseId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Struktur
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Lagerplatser
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hyllor och zoner inom lagerställen. Plocksekvens styr plockordning.
        </p>
      </div>
      <LocationsClient
        orgSlug={orgSlug}
        warehouses={warehouses.map((w) => ({
          id: w.id,
          code: w.code,
          name: w.name,
        }))}
        locations={locations.map((l) => ({
          id: l.id,
          warehouseId: l.warehouseId,
          warehouseCode: l.warehouseCode,
          code: l.code,
          name: l.name,
          zone: l.zone,
          pickSequence: l.pickSequence,
          type: l.type,
          isActive: l.isActive,
        }))}
        initialWarehouseId={warehouseId}
      />
    </div>
  );
}
