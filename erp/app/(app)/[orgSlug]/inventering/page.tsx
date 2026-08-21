import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listInventoryCounts } from "@/modules/inventory/services/inventory-count";
import { listWarehouses } from "@/modules/inventory/services/warehouses";
import { InventeringClient } from "./inventering-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function InventeringPage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  const [counts, warehouses] = await Promise.all([
    listInventoryCounts(ctx.organizationId),
    listWarehouses(ctx.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Inventering
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Inventering
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Låst räkning → godkännande → justering. Avvikelse bokförs först efter
          godkännande.
        </p>
      </div>
      <InventeringClient
        orgSlug={orgSlug}
        counts={counts.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          warehouseId: c.warehouseId,
          note: c.note,
          createdAt: c.createdAt.toISOString(),
          postedAt: c.postedAt?.toISOString() ?? null,
        }))}
        warehouses={warehouses.map((w) => ({
          id: w.id,
          code: w.code,
          name: w.name,
        }))}
      />
    </div>
  );
}
