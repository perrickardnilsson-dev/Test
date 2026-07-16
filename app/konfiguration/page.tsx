import Link from "next/link";
import { AlertTriangle, CheckCircle2, GraduationCap, XCircle } from "lucide-react";
import { checkDatabase, getEnvCheck, isSupabaseConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ENV_LABELS: { key: keyof ReturnType<typeof getEnvCheck>; label: string; required: boolean }[] = [
  { key: "supabaseUrl", label: "NEXT_PUBLIC_SUPABASE_URL", required: true },
  { key: "supabaseAnonKey", label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
  { key: "supabaseServiceKey", label: "SUPABASE_SERVICE_ROLE_KEY", required: true },
  { key: "anthropicKey", label: "ANTHROPIC_API_KEY", required: false },
  { key: "appUrl", label: "NEXT_PUBLIC_APP_URL", required: true },
];

export default async function KonfigurationPage({
  searchParams,
}: {
  searchParams: Promise<{ fel?: string }>;
}) {
  const params = await searchParams;
  const env = getEnvCheck();
  const supabaseOk = isSupabaseConfigured();
  const dbCheck = supabaseOk ? await checkDatabase() : null;

  const missingRequired = ENV_LABELS.filter((e) => e.required && !env[e.key]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="container flex items-center gap-2 py-6 font-semibold text-lg">
        <GraduationCap className="h-6 w-6 text-primary" />
        NO-provplattform
      </header>

      <main className="container max-w-2xl pb-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Appen behöver konfigureras
            </CardTitle>
            <CardDescription>
              Plattformen kraschade troligen för att miljövariabler eller
              databasen saknas. Följ stegen nedan och deploya om på Vercel
              efteråt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {params.fel === "supabase" && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Kunde inte ansluta till Supabase. Kontrollera URL och anon-nyckel
                under Project Settings → API i Supabase-dashboarden.
              </p>
            )}

            <section className="space-y-3">
              <h2 className="font-semibold">1. Miljövariabler (Vercel)</h2>
              <p className="text-sm text-muted-foreground">
                Gå till Vercel → ditt projekt → Settings → Environment Variables.
                Lägg till variablerna och kör sedan en ny deploy (Redeploy).
                Anon-nyckeln hittas under Supabase → Settings → API →{" "}
                <code className="text-xs">anon public</code> (börjar oftast med{" "}
                <code className="text-xs">eyJ…</code>).
              </p>
              <ul className="space-y-2">
                {ENV_LABELS.map(({ key, label, required }) => {
                  const ok = env[key];
                  const Icon = ok ? CheckCircle2 : required ? XCircle : AlertTriangle;
                  const color = ok
                    ? "text-green-600"
                    : required
                      ? "text-red-600"
                      : "text-amber-500";
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                      <code className="text-xs">{label}</code>
                      {!required && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          valfri
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {missingRequired.length > 0 && (
                <p className="text-sm text-red-600">
                  Saknas:{" "}
                  {missingRequired.map((e) => e.label).join(", ")}
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">2. Databas (Supabase SQL Editor)</h2>
              <p className="text-sm text-muted-foreground">
                Öppna Supabase → SQL Editor och kör hela{" "}
                <code className="text-xs">supabase/setup.sql</code> från repot.
                Kör inte bara seed-filen – tabellerna måste skapas först.
              </p>
              {dbCheck && (
                <div
                  className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                    dbCheck.ok
                      ? "border-green-200 bg-green-50 text-green-900"
                      : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  {dbCheck.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {dbCheck.ok
                      ? "Databasen svarar och profiles-tabellen finns."
                      : dbCheck.message}
                  </span>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">3. Supabase Auth (produktion) — viktigt för inloggning!</h2>
              <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 p-3">
                Om miljövariablerna är gröna men inloggning ändå kraschar har du
                troligen inte satt detta. Gå till Supabase → Authentication → URL
                Configuration.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  Site URL: din Vercel-URL (t.ex.{" "}
                  <code className="text-xs">https://din-app.vercel.app</code>)
                </li>
                <li>
                  Redirect URLs: lägg till{" "}
                  <code className="text-xs">/auth/confirm</code> och{" "}
                  <code className="text-xs">/auth/callback</code> för samma domän
                </li>
                <li>
                  För enkel testning: stäng av e-postbekräftelse under
                  Authentication → Providers → Email
                </li>
              </ul>
            </section>

            {supabaseOk && dbCheck?.ok && (
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/">Fortsätt till startsidan</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/api/debug-auth">
                    Testa inloggning (diagnostik)
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
