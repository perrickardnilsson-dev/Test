import Link from "next/link";
import { bootstrapModules } from "@/core/module-registry/bootstrap";
import { listModules } from "@/core/module-registry";
import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { getPitchDashboard } from "@/modules/inventory/services/dashboard";
import { PitchHomeClient } from "./pitch-home-client";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function OrgHomePage({ params }: Props) {
  const { orgSlug } = await params;
  bootstrapModules();
  const modules = listModules();
  const ctx = await requireOrgAccess(orgSlug);
  const dash = await getPitchDashboard(ctx.organizationId);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Översikt · Pitch
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Översikt</h1>
        <p className="mt-2 text-muted-foreground">
          Lagerläge, brist och kommande behov. Seed pitch-demo för att fylla
          systemet snabbt.
        </p>
      </div>

      <PitchHomeClient
        orgSlug={orgSlug}
        stockValue={dash.stockValue}
        partCount={dash.partCount}
        openDemandCount={dash.openDemandCount}
        shortageCount={dash.shortageList.length}
        deadStockCount={dash.deadStock.length}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Bristlista
          </h2>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {dash.shortageList.length === 0 ? (
              <li className="py-4 text-sm text-muted-foreground">
                Inga brister just nu.
              </li>
            ) : (
              dash.shortageList.slice(0, 8).map((s) => (
                <li
                  key={s.partId}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div>
                    <p className="font-mono text-xs">{s.partNumber}</p>
                    <p className="text-muted-foreground">{s.description}</p>
                  </div>
                  <p className="font-mono text-xs whitespace-nowrap">
                    {s.available}/{s.safetyStock}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Behov 14 dagar
          </h2>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {dash.upcomingDemand.length === 0 ? (
              <li className="py-4 text-sm text-muted-foreground">
                Inga behov inom 14 dagar.
              </li>
            ) : (
              dash.upcomingDemand.slice(0, 8).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div>
                    <p className="font-mono text-xs">{d.partNumber}</p>
                    <p className="text-muted-foreground">{d.dueDate}</p>
                  </div>
                  <p className="font-mono text-xs">{d.quantity}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {dash.deadStock.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground">
            Död lager (utan behov / rörelse)
          </h2>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {dash.deadStock.slice(0, 5).map((d) => (
              <li
                key={d.partId}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <div>
                  <p className="font-mono text-xs">{d.partNumber}</p>
                  <p className="text-muted-foreground">{d.description}</p>
                </div>
                <p className="font-mono text-xs">
                  {d.quantity} · {d.stockValue.toLocaleString("sv-SE")} kr
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-medium text-muted-foreground">Moduler</h2>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {modules.map((mod) => (
            <li
              key={mod.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{mod.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {mod.id}
                </p>
              </div>
              {mod.enabledByDefault ? (
                <Link
                  href={`/${orgSlug}/${mod.nav[0]?.href ?? ""}`}
                  className="text-sm text-primary hover:underline"
                >
                  Öppna
                </Link>
              ) : (
                <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  Kommer snart
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
