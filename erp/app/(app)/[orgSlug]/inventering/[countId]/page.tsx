import Link from "next/link";
import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { getInventoryCount } from "@/modules/inventory/services/inventory-count";
import { CountClient } from "./count-client";

type Props = {
  params: Promise<{ orgSlug: string; countId: string }>;
};

export default async function InventoryCountDetailPage({ params }: Props) {
  const { orgSlug, countId } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const count = await getInventoryCount(ctx.organizationId, countId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Inventering
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {count.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status: {count.status} · {count.summary.countedCount}/
            {count.summary.lineCount} räknade · Avvikelse{" "}
            {count.summary.varianceValue.toLocaleString("sv-SE")} kr
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${orgSlug}/inventering/${countId}/mobil`}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-[hsl(210_14%_96%)]"
          >
            Mobil räkning
          </Link>
          <Link
            href={`/${orgSlug}/inventering`}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-[hsl(210_14%_96%)]"
          >
            Tillbaka
          </Link>
        </div>
      </div>
      <CountClient
        orgSlug={orgSlug}
        countId={countId}
        status={count.status}
        summary={count.summary}
        lines={count.lines.map((l) => ({
          id: l.id,
          partNumber: l.partNumber,
          description: l.description,
          unit: l.unit,
          locationCode: l.locationCode,
          expectedQuantity: l.expectedQuantity,
          countedQuantity: l.countedQuantity,
          unitCost: l.unitCost,
          varianceQuantity: l.varianceQuantity,
          varianceValue: l.varianceValue,
          isCounted: l.isCounted,
        }))}
      />
    </div>
  );
}
