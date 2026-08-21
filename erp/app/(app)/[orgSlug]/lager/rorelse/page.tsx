import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listParts } from "@/modules/inventory/services/parts";
import { listBatches } from "@/modules/inventory/services/traceability";
import { listStockLocations } from "@/modules/inventory/services/warehouses";
import { MovementClient } from "./movement-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function StockMovementPage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  const [parts, locations, batches] = await Promise.all([
    listParts(ctx.organizationId, { search: "" }),
    listStockLocations(ctx.organizationId),
    listBatches(ctx.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Rörelse
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Manuell lagerrörelse
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inleverans, utleverans/skrot och flytt. Alla saldoförändringar går via
          bokföring med vägt genomsnittspris.
        </p>
      </div>
      <MovementClient
        orgSlug={orgSlug}
        parts={parts.map((p) => ({
          id: p.id,
          partNumber: p.partNumber,
          description: p.description,
          unit: p.unit,
          traceabilityMode: p.traceabilityMode,
        }))}
        locations={locations.map((l) => ({
          id: l.id,
          code: l.code,
          warehouseCode: l.warehouseCode,
          label: `${l.warehouseCode} / ${l.code}`,
        }))}
        batches={batches.map((b) => ({
          id: b.id,
          partId: b.partId,
          batchNumber: b.batchNumber,
          partNumber: b.partNumber,
        }))}
      />
    </div>
  );
}
