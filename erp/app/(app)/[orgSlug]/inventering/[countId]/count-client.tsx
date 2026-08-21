"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Button } from "@/core/ui/components/button";
import {
  approveAndPostInventoryCountAction,
  cancelInventoryCountAction,
  recordCountLineAction,
  submitInventoryCountAction,
} from "@/modules/inventory/actions";

type Line = {
  id: string;
  partNumber: string;
  description: string;
  unit: string;
  locationCode: string;
  expectedQuantity: number;
  countedQuantity: number | null;
  unitCost: number;
  varianceQuantity: number | null;
  varianceValue: number | null;
  isCounted: boolean;
};

type Summary = {
  lineCount: number;
  countedCount: number;
  uncountedCount: number;
  varianceQuantity: number;
  varianceValue: number;
  absoluteVarianceValue: number;
};

type Props = {
  orgSlug: string;
  countId: string;
  status: string;
  summary: Summary;
  lines: Line[];
};

export function CountClient({
  orgSlug,
  countId,
  status,
  summary,
  lines,
}: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const l of lines) {
      init[l.id] =
        l.countedQuantity == null ? "" : String(l.countedQuantity);
    }
    return init;
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function saveLine(lineId: string) {
    const raw = drafts[lineId];
    if (raw === undefined || raw === "") return;
    const qty = Number(raw);
    if (Number.isNaN(qty)) {
      setError("Ogiltigt antal");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await recordCountLineAction(orgSlug, {
        lineId,
        countedQuantity: qty,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit() {
    setPending(true);
    setError(null);
    try {
      await submitInventoryCountAction(orgSlug, {
        inventoryCountId: countId,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skicka");
    } finally {
      setPending(false);
    }
  }

  async function onApprove() {
    setPending(true);
    setError(null);
    try {
      await approveAndPostInventoryCountAction(orgSlug, {
        inventoryCountId: countId,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte godkänna");
    } finally {
      setPending(false);
    }
  }

  async function onCancel() {
    setPending(true);
    setError(null);
    try {
      await cancelInventoryCountAction(orgSlug, {
        inventoryCountId: countId,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte avbryta");
    } finally {
      setPending(false);
    }
  }

  const canCount = status === "counting";
  const canSubmit = status === "counting" && summary.uncountedCount === 0;
  const canApprove = status === "pending_approval";
  const canCancel =
    status === "draft" ||
    status === "counting" ||
    status === "pending_approval";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canSubmit ? (
          <Button type="button" onClick={onSubmit} disabled={pending}>
            Skicka för godkännande
          </Button>
        ) : null}
        {canApprove ? (
          <Button type="button" onClick={onApprove} disabled={pending}>
            Godkänn & bokför
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            Avbryt
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <p>
          Räknade:{" "}
          <span className="font-medium">
            {summary.countedCount}/{summary.lineCount}
          </span>
        </p>
        <p>
          Avvikelse antal:{" "}
          <span className="font-mono">{summary.varianceQuantity}</span>
        </p>
        <p>
          Avvikelse värde:{" "}
          <span className="font-mono">
            {summary.varianceValue.toLocaleString("sv-SE")} kr
          </span>
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(210_14%_96%)] text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">Artikel</th>
              <th className="px-3 py-2">Plats</th>
              <th className="px-3 py-2 text-right">Förväntat</th>
              <th className="px-3 py-2 text-right">Räknat</th>
              <th className="px-3 py-2 text-right">Avvikelse</th>
              <th className="px-3 py-2 text-right">Värde</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Inga rader. Skapa inventering med snapshot från saldon.
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-mono text-xs">{l.partNumber}</p>
                    <p className="text-muted-foreground">{l.description}</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {l.locationCode}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {l.expectedQuantity}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canCount ? (
                      <Input
                        className="ml-auto w-24 text-right"
                        value={drafts[l.id] ?? ""}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [l.id]: e.target.value,
                          }))
                        }
                        inputMode="decimal"
                      />
                    ) : (
                      <span className="font-mono">
                        {l.countedQuantity ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {l.varianceQuantity ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {l.varianceValue == null
                      ? "—"
                      : `${l.varianceValue.toLocaleString("sv-SE")} kr`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canCount ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => saveLine(l.id)}
                      >
                        Spara
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
