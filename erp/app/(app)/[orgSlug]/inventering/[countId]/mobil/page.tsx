import Link from "next/link";
import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { getInventoryCount } from "@/modules/inventory/services/inventory-count";
import { MobileCountClient } from "./mobile-count-client";

type Props = {
  params: Promise<{ orgSlug: string; countId: string }>;
};

export default async function MobileCountPage({ params }: Props) {
  const { orgSlug, countId } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const count = await getInventoryCount(ctx.organizationId, countId);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Mobil räkning
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {count.name}
          </h1>
        </div>
        <Link
          href={`/${orgSlug}/inventering/${countId}`}
          className="text-sm text-primary hover:underline"
        >
          Desktop
        </Link>
      </div>
      <MobileCountClient
        orgSlug={orgSlug}
        countId={countId}
        status={count.status}
        remaining={count.summary.uncountedCount}
        lines={count.lines
          .filter((l) => !l.isCounted)
          .slice(0, 8)
          .map((l) => ({
            partNumber: l.partNumber,
            locationCode: l.locationCode,
            expectedQuantity: l.expectedQuantity,
          }))}
      />
    </div>
  );
}
