import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listParts } from "@/modules/inventory/services/parts";
import {
  listBatches,
  listSerialUnits,
} from "@/modules/inventory/services/traceability";
import { SerialsClient } from "./serials-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function SerialUnitsPage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  const [serials, parts, batches] = await Promise.all([
    listSerialUnits(ctx.organizationId),
    listParts(ctx.organizationId, { search: "" }),
    listBatches(ctx.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Spårbarhet
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Individer
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Serienumrerade enheter. Krävs för artiklar med seriespårning.
        </p>
      </div>
      <SerialsClient
        orgSlug={orgSlug}
        parts={parts.map((p) => ({
          id: p.id,
          partNumber: p.partNumber,
          description: p.description,
          traceabilityMode: p.traceabilityMode,
        }))}
        batches={batches.map((b) => ({
          id: b.id,
          partId: b.partId,
          batchNumber: b.batchNumber,
          partNumber: b.partNumber,
        }))}
        serials={serials.map((s) => ({
          id: s.id,
          partNumber: s.partNumber,
          serialNumber: s.serialNumber,
          batchId: s.batchId,
          status: s.status,
        }))}
      />
    </div>
  );
}
