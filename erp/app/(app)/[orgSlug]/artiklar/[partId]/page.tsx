import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { getPart, listPartGroups } from "@/modules/inventory/services/parts";
import { PartForm } from "../part-form";
import {
  PART_STATUS_LABELS,
  PART_TYPE_LABELS,
} from "@/modules/inventory/domain/part-schemas";

type Props = {
  params: Promise<{ orgSlug: string; partId: string }>;
};

export default async function PartDetailPage({ params }: Props) {
  const { orgSlug, partId } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const [part, groups] = await Promise.all([
    getPart(ctx.organizationId, partId),
    listPartGroups(ctx.organizationId),
  ]);
  if (!part) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${orgSlug}/artiklar`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Artiklar
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {part.partNumber}
          </h1>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {PART_STATUS_LABELS[part.status]}
          </span>
          <span className="text-xs text-muted-foreground">
            {PART_TYPE_LABELS[part.type]}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{part.description}</p>
      </div>

      <PartForm
        orgSlug={orgSlug}
        mode="edit"
        groups={groups.map((g) => ({ id: g.id, code: g.code, name: g.name }))}
        initial={{
          id: part.id,
          partNumber: part.partNumber,
          description: part.description,
          unit: part.unit,
          type: part.type,
          partGroupId: part.partGroupId,
          status: part.status,
          standardCost: Number(part.standardCost),
          salesPrice: Number(part.salesPrice),
          leadTimeDays: part.leadTimeDays,
          safetyStock: Number(part.safetyStock),
          reorderPoint: Number(part.reorderPoint),
          lotSizingRule: part.lotSizingRule,
          lotSize: part.lotSize ? Number(part.lotSize) : null,
          planningMethod: part.planningMethod,
          traceabilityMode: part.traceabilityMode,
          weightKg: part.weightKg ? Number(part.weightKg) : null,
          notes: part.notes,
        }}
      />
    </div>
  );
}
