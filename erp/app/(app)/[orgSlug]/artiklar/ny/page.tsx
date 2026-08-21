import Link from "next/link";
import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listPartGroups } from "@/modules/inventory/services/parts";
import { PartForm } from "../part-form";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function NewPartPage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const groups = await listPartGroups(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${orgSlug}/artiklar`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Artiklar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Ny artikel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Börja med nummer, benämning, enhet och typ. Övriga fält har
          standardvärden bakom fler inställningar.
        </p>
      </div>
      <PartForm
        orgSlug={orgSlug}
        mode="create"
        groups={groups.map((g) => ({ id: g.id, code: g.code, name: g.name }))}
      />
    </div>
  );
}
