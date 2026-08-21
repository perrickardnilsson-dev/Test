import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listPartGroups } from "@/modules/inventory/services/parts";
import { PartGroupsClient } from "./part-groups-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function PartGroupsPage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const groups = await listPartGroups(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Varugrupper
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Varugrupper
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hierarkisk indelning av artiklar. Används för filter och rapporter.
        </p>
      </div>
      <PartGroupsClient
        orgSlug={orgSlug}
        groups={groups.map((g) => ({
          id: g.id,
          code: g.code,
          name: g.name,
          parentId: g.parentId,
        }))}
      />
    </div>
  );
}
