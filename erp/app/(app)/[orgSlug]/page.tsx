import Link from "next/link";
import { bootstrapModules } from "@/core/module-registry/bootstrap";
import { listModules } from "@/core/module-registry";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function OrgHomePage({ params }: Props) {
  const { orgSlug } = await params;
  bootstrapModules();
  const modules = listModules();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        Fas 1 · Plattform
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Översikt</h1>
      <p className="mt-2 text-muted-foreground">
        Kommandopaletten (⌘K) är primär navigation. Sidomenyn speglar
        modulregistret.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">Moduler</h2>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {modules.map((mod) => (
            <li
              key={mod.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{mod.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{mod.id}</p>
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
