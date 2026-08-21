import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listWarehouses } from "@/modules/inventory/services/warehouses";
import { WarehousesClient } from "./warehouses-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function WarehousesPage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const warehouses = await listWarehouses(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Struktur
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Lagerställen
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fysiska lagerbyggnader. Negativt saldo blockeras som standard — kan
          tillåtas per lagerställe.
        </p>
      </div>
      <WarehousesClient
        orgSlug={orgSlug}
        warehouses={warehouses.map((w) => ({
          id: w.id,
          code: w.code,
          name: w.name,
          allowNegativeStock: w.allowNegativeStock,
          isActive: w.isActive,
        }))}
      />
    </div>
  );
}
