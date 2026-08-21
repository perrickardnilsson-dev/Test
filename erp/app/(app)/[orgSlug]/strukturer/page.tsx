import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listParts } from "@/modules/inventory/services/parts";
import { getBomWithLines, listBoms } from "@/modules/inventory/services/bom";
import { StructuresClient } from "./structures-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ bomId?: string }>;
};

export default async function StructuresPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const { bomId } = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);

  const [boms, parts, selected] = await Promise.all([
    listBoms(ctx.organizationId),
    listParts(ctx.organizationId, { search: "" }),
    bomId ? getBomWithLines(ctx.organizationId, bomId) : Promise.resolve(null),
  ]);

  const manufacturedParts = parts.filter(
    (p) => p.type === "manufactured" || p.type === "phantom",
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Planering
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Strukturer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Artikelstruktur (BOM) med revision, komponentrader och trädvy.
          Aktivering beräknar low-level code.
        </p>
      </div>
      <StructuresClient
        orgSlug={orgSlug}
        boms={boms.map((b) => ({
          id: b.id,
          parentPartId: b.parentPartId,
          partNumber: b.partNumber,
          description: b.description,
          revision: b.revision,
          status: b.status,
        }))}
        parts={parts.map((p) => ({
          id: p.id,
          partNumber: p.partNumber,
          description: p.description,
          type: p.type,
        }))}
        manufacturedParts={manufacturedParts.map((p) => ({
          id: p.id,
          partNumber: p.partNumber,
          description: p.description,
          type: p.type,
        }))}
        selectedBom={
          selected
            ? {
                id: selected.id,
                parentPartId: selected.parentPartId,
                partNumber: selected.partNumber,
                description: selected.description,
                revision: selected.revision,
                status: selected.status,
                lines: selected.lines.map((l) => ({
                  id: l.id,
                  componentPartId: l.componentPartId,
                  partNumber: l.partNumber,
                  description: l.description,
                  partType: l.partType,
                  quantityPer: Number(l.quantityPer),
                  scrapPercent: Number(l.scrapPercent),
                  position: l.position,
                })),
              }
            : null
        }
      />
    </div>
  );
}
