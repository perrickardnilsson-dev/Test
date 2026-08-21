"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isConfig =
    error.message.includes("SUPABASE_NOT_CONFIGURED") ||
    error.message.includes("URL and Key are required");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md space-y-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-semibold">Något gick fel</h1>
        <p className="text-sm text-muted-foreground">
          {isConfig
            ? "Appen saknar Supabase-inställningar eller databasen är inte skapad ännu."
            : "Ett oväntat serverfel inträffade. Prova att ladda om sidan."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Felkod: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => reset()}>
            Försök igen
          </Button>
          <Button asChild>
            <Link href="/konfiguration">Visa konfigurationsguide</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
