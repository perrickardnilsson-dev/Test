import Link from "next/link";
import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import {
  listPartGroups,
  listParts,
  listSavedPartViews,
} from "@/modules/inventory/services/parts";
import { partListFilterSchema } from "@/modules/inventory/domain/part-schemas";
import { PartsWorkbench } from "./parts-workbench";

type Props = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PartsPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);

  const filter = partListFilterSchema.parse({
    search: typeof sp.q === "string" ? sp.q : "",
    status: typeof sp.status === "string" ? sp.status.split(",").filter(Boolean) : undefined,
    type: typeof sp.type === "string" ? sp.type.split(",").filter(Boolean) : undefined,
    partGroupId:
      typeof sp.group === "string" && sp.group.length > 0 ? sp.group : null,
  });

  const [parts, groups, savedViews] = await Promise.all([
    listParts(ctx.organizationId, filter),
    listPartGroups(ctx.organizationId),
    listSavedPartViews(ctx.organizationId, ctx.userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Lager · Artiklar
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Artikelregister
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sök, filtrera och öppna artiklar. Nya artiklar skapas med fyra fält —
            resten ligger under fler inställningar.
          </p>
        </div>
        <Link
          href={`/${orgSlug}/artiklar/ny`}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ny artikel
        </Link>
      </div>

      <PartsWorkbench
        orgSlug={orgSlug}
        initialParts={parts}
        groups={groups.map((g) => ({ id: g.id, code: g.code, name: g.name }))}
        savedViews={savedViews.map((v) => ({
          id: v.id,
          name: v.name,
          config: v.config,
        }))}
        initialFilter={filter}
      />
    </div>
  );
}
