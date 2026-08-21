"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/core/ui/components/button";
import { seedPitchDemoAction } from "@/modules/inventory/actions";

type Props = {
  orgSlug: string;
  stockValue: number;
  partCount: number;
  openDemandCount: number;
  shortageCount: number;
  deadStockCount: number;
};

export function PitchHomeClient({
  orgSlug,
  stockValue,
  partCount,
  openDemandCount,
  shortageCount,
  deadStockCount,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onSeed() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await seedPitchDemoAction(orgSlug);
      setMessage(result.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed misslyckades");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Lagervärde" value={`${stockValue.toLocaleString("sv-SE")} kr`} />
        <Stat label="Artiklar" value={String(partCount)} />
        <Stat label="Öppna behov" value={String(openDemandCount)} />
        <Stat
          label="Brist / död lager"
          value={`${shortageCount} / ${deadStockCount}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void onSeed()} disabled={pending}>
          {pending ? "Seedar…" : "Seed pitch-demo"}
        </Button>
        {message ? (
          <p className="text-sm text-emerald-700">{message}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
