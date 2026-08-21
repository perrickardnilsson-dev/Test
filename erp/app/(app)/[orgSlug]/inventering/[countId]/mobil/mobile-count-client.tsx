"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { recordCountByPartAction } from "@/modules/inventory/actions";
import { BarcodeScanner } from "@/modules/inventory/components/barcode-scanner";

type Props = {
  orgSlug: string;
  countId: string;
  status: string;
  remaining: number;
  lines: Array<{
    partNumber: string;
    locationCode: string;
    expectedQuantity: number;
  }>;
};

export function MobileCountClient({
  orgSlug,
  countId,
  status,
  remaining,
  lines,
}: Props) {
  const router = useRouter();
  const [partNumber, setPartNumber] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const canCount = status === "counting";

  async function submit(pn: string, qty: number) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await recordCountByPartAction(orgSlug, {
        inventoryCountId: countId,
        partNumber: pn.trim(),
        countedQuantity: qty,
      });
      setMessage(
        `Sparat. Avvikelse ${result.varianceQuantity ?? 0} (värde ${result.varianceValue ?? 0})`,
      );
      setPartNumber("");
      setQuantity("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!partNumber.trim() || Number.isNaN(qty)) {
      setError("Ange artikelnummer och antal");
      return;
    }
    await submit(partNumber, qty);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Kvar att räkna: <span className="font-medium">{remaining}</span>
      </p>

      {canCount ? (
        <>
          <BarcodeScanner
            onScan={(code) => {
              setPartNumber(code);
              setMessage(`Skannat: ${code}`);
            }}
          />
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pn">Artikelnummer</Label>
              <Input
                id="pn"
                className="h-14 text-xl font-mono"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                autoComplete="off"
                placeholder="RAW-…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Räknat antal</Label>
              <Input
                id="qty"
                className="h-14 text-xl font-mono"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="decimal"
                placeholder="0"
              />
            </div>
            <Button
              type="submit"
              className="h-14 w-full text-lg"
              disabled={pending}
            >
              {pending ? "Sparar…" : "Registrera"}
            </Button>
          </form>
        </>
      ) : (
        <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          Inventeringen är i status <strong>{status}</strong> och kan inte
          räknas.
        </p>
      )}

      {message ? (
        <p className="text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {lines.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Nästa oräknade
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {lines.map((l) => (
              <li
                key={`${l.partNumber}-${l.locationCode}`}
                className="flex items-center justify-between gap-2 px-3 py-3"
              >
                <div>
                  <p className="font-mono text-sm">{l.partNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.locationCode} · förväntat {l.expectedQuantity}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPartNumber(l.partNumber)}
                >
                  Välj
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
