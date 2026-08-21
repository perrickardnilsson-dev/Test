import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { TraceClient } from "./trace-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function TraceabilityPage({ params }: Props) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Lager · Spårbarhet
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Spårbarhet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spåra batcher och individer bakåt (ursprung) eller framåt
          (återkallning).
        </p>
      </div>
      <TraceClient orgSlug={orgSlug} />
    </div>
  );
}
