import Link from "next/link";
import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listStockBalances } from "@/modules/inventory/services/stock";
import { listWarehouses } from "@/modules/inventory/services/warehouses";
import { stockBalanceFilterSchema } from "@/modules/inventory/domain/stock-schemas";
import { StockBalancesClient } from "./stock-balances-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StockBalancesPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);

  const filter = stockBalanceFilterSchema.parse({
    search: typeof sp.q === "string" ? sp.q : "",
    warehouseId:
      typeof sp.warehouse === "string" && sp.warehouse.length > 0
        ? sp.warehouse
        : null,
    view: sp.view === "location" ? "location" : "part",
  });

  const [balances, warehouses] = await Promise.all([
    listStockBalances(ctx.organizationId, filter),
    listWarehouses(ctx.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Lager · Saldo
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Lagersaldo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldo per artikel och plats. Uppdateras enbart via bokförda
            lagertransaktioner (vägt genomsnittspris).
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${orgSlug}/lager/historik`}
            className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
          >
            Transaktioner
          </Link>
          <Link
            href={`/${orgSlug}/lager/rorelse`}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Lagerrörelse
          </Link>
        </div>
      </div>

      <StockBalancesClient
        orgSlug={orgSlug}
        balances={balances.map((b) => ({
          id: b.id,
          partNumber: b.partNumber,
          partDescription: b.partDescription,
          unit: b.unit,
          warehouseCode: b.warehouseCode,
          locationCode: b.locationCode,
          quantity: b.quantity,
          reservedQuantity: b.reservedQuantity,
          averageCost: b.averageCost,
        }))}
        warehouses={warehouses.map((w) => ({
          id: w.id,
          code: w.code,
          name: w.name,
        }))}
        initialFilter={filter}
      />
    </div>
  );
}
