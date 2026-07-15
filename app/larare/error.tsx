"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LarareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="max-w-lg space-y-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-semibold">Lärarvyn kunde inte laddas</h1>
        <p className="text-sm text-muted-foreground">
          Det här händer oftast om kontot skapades innan databasen var klar,
          eller om sessionen behöver förnyas. Prova stegen nedan.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">Felkod: {error.digest}</p>
        )}
        <ol className="text-left text-sm text-muted-foreground list-decimal pl-5 space-y-2">
          <li>
            Kör <code className="text-xs">supabase/fix-saknade-profiler.sql</code>{" "}
            i Supabase SQL Editor
          </li>
          <li>Logga ut och logga in igen</li>
          <li>
            Kontrollera i Supabase → Table Editor → profiles att ditt konto har{" "}
            <code className="text-xs">role = teacher</code>
          </li>
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => reset()}>
            Försök igen
          </Button>
          <Button asChild variant="outline">
            <Link href="/konfiguration">Konfiguration</Link>
          </Button>
          <form action="/auth/signout" method="post">
            <Button type="submit">Logga ut</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
