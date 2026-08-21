import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listParts } from "@/modules/inventory/services/parts";
import {
  listDemandLines,
  listNetRequirementRuns,
  listPlanningSuggestions,
  listSupplyLines,
} from "@/modules/inventory/services/mrp";
import { PlanningClient } from "./planning-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

function toIso(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

export default async function PlanningPage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  const [parts, demands, supplies, runs, suggestions] = await Promise.all([
    listParts(ctx.organizationId, { search: "" }),
    listDemandLines(ctx.organizationId),
    listSupplyLines(ctx.organizationId),
    listNetRequirementRuns(ctx.organizationId),
    listPlanningSuggestions(ctx.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Planering
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Planering</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nettobehovskörning (MRP), behov/tillgång och förslag med pegging.
          Acceptera eller förkasta i bulk.
        </p>
      </div>
      <PlanningClient
        orgSlug={orgSlug}
        parts={parts.map((p) => ({
          id: p.id,
          partNumber: p.partNumber,
          description: p.description,
        }))}
        demands={demands.map((d) => ({
          id: d.id,
          partNumber: d.partNumber,
          description: d.description,
          quantity: Number(d.quantity),
          dueDate: toIso(d.dueDate),
          sourceType: d.sourceType,
          sourceId: d.sourceId,
        }))}
        supplies={supplies.map((s) => ({
          id: s.id,
          partNumber: s.partNumber,
          description: s.description,
          quantity: Number(s.quantity),
          dueDate: toIso(s.dueDate),
          sourceType: s.sourceType,
          sourceId: s.sourceId,
        }))}
        runs={runs.map((r) => ({
          id: r.id,
          runAt: r.runAt.toISOString(),
          asOfDate: toIso(r.asOfDate),
          status: r.status,
          message: r.message,
          suggestionCount: r.suggestionCount,
        }))}
        suggestions={suggestions.map((s) => ({
          id: s.id,
          partNumber: s.partNumber,
          description: s.description,
          suggestionType: s.suggestionType,
          quantity: Number(s.quantity),
          dueDate: toIso(s.dueDate),
          orderDate: toIso(s.orderDate),
          isLate: s.isLate,
          status: s.status,
          pegging: (s.pegging ?? []).map((p) => ({
            demandSourceType: p.demandSourceType,
            demandSourceId: p.demandSourceId,
            demandQuantity: p.demandQuantity,
            demandDueDate: p.demandDueDate,
            explanation: p.explanation,
          })),
        }))}
      />
    </div>
  );
}
