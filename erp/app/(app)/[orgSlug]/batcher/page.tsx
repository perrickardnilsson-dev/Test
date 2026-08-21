import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listParts } from "@/modules/inventory/services/parts";
import { listBatches } from "@/modules/inventory/services/traceability";
import { BatchesClient } from "./batches-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

function formatDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export default async function BatchesPage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  const [batches, parts] = await Promise.all([
    listBatches(ctx.organizationId),
    listParts(ctx.organizationId, { search: "" }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Spårbarhet
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Batcher</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Charge-/batchregister per artikel. Används vid inleverans och
          återkallning.
        </p>
      </div>
      <BatchesClient
        orgSlug={orgSlug}
        parts={parts.map((p) => ({
          id: p.id,
          partNumber: p.partNumber,
          description: p.description,
          traceabilityMode: p.traceabilityMode,
        }))}
        batches={batches.map((b) => ({
          id: b.id,
          partNumber: b.partNumber,
          batchNumber: b.batchNumber,
          status: b.status,
          productionDate: formatDate(b.productionDate),
          expiryDate: formatDate(b.expiryDate),
          supplierBatchNumber: b.supplierBatchNumber,
          certificateRef: b.certificateRef,
        }))}
      />
    </div>
  );
}
