import { checkDatabaseHealth } from "@/core/db/health";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const db = await checkDatabaseHealth();
  const appOk = true;
  const overallOk = appOk && db.ok;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Systemstatus</h1>
      <p className="mt-2 text-muted-foreground">
        Health check för applikation och databas (Fas 0).
      </p>

      <dl className="mt-8 space-y-4 border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">Övergripande</dt>
          <dd
            className={`font-mono text-sm font-medium ${overallOk ? "text-primary" : "text-destructive"}`}
          >
            {overallOk ? "OK" : "DEGRADED"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">Applikation</dt>
          <dd className="font-mono text-sm">OK</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">PostgreSQL</dt>
          <dd
            className={`font-mono text-sm ${db.ok ? "text-primary" : "text-destructive"}`}
          >
            {db.ok ? `OK (${db.latencyMs} ms)` : "NÅBAR EJ"}
          </dd>
        </div>
        {!db.ok && db.error ? (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Databasfel</p>
            <p className="mt-1 font-mono text-xs break-all">{db.error}</p>
            <p className="mt-2">
              Starta lokal Postgres med{" "}
              <code className="font-mono text-xs">npm run db:up</code> (kräver
              Docker).
            </p>
          </div>
        ) : null}
      </dl>
    </main>
  );
}
