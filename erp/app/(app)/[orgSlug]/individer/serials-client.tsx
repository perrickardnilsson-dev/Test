"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import { createSerialUnitAction } from "@/modules/inventory/actions";

const STATUS_LABELS: Record<string, string> = {
  available: "Tillgänglig",
  quarantine: "Karantän",
  blocked: "Blockerad",
  consumed: "Förbrukad",
  shipped: "Levererad",
};

type PartOption = {
  id: string;
  partNumber: string;
  description: string;
  traceabilityMode: string;
};

type BatchOption = {
  id: string;
  partId: string;
  batchNumber: string;
  partNumber: string;
};

type SerialRow = {
  id: string;
  partNumber: string;
  serialNumber: string;
  batchId: string | null;
  status: string;
};

type Props = {
  orgSlug: string;
  parts: PartOption[];
  batches: BatchOption[];
  serials: SerialRow[];
};

export function SerialsClient({ orgSlug, parts, batches, serials }: Props) {
  const router = useRouter();
  const serialParts = parts.filter((p) => p.traceabilityMode === "serial");
  const [partId, setPartId] = React.useState(serialParts[0]?.id ?? "");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [batchId, setBatchId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const partBatches = batches.filter((b) => b.partId === partId);
  const batchLabelById = new Map(
    batches.map((b) => [b.id, b.batchNumber] as const),
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createSerialUnitAction(orgSlug, {
        partId,
        serialNumber,
        batchId: batchId || null,
        status: "available",
      });
      setSerialNumber("");
      setBatchId("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte skapa individ",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(210_14%_96%)] text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">Artikel</th>
              <th className="px-3 py-2">Serienr</th>
              <th className="px-3 py-2">Batch</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {serials.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Inga individer ännu.
                </td>
              </tr>
            ) : (
              serials.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{s.partNumber}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {s.serialNumber}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {s.batchId ? (batchLabelById.get(s.batchId) ?? "—") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {STATUS_LABELS[s.status] ?? s.status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={onSubmit}
        className="h-fit space-y-3 rounded-lg border border-border p-4"
      >
        <h2 className="text-sm font-semibold">Ny individ</h2>
        <div className="space-y-2">
          <Label htmlFor="serial-part">Artikel</Label>
          <Select
            id="serial-part"
            required
            value={partId}
            onChange={(e) => {
              setPartId(e.target.value);
              setBatchId("");
            }}
            disabled={serialParts.length === 0}
          >
            {serialParts.length === 0 ? (
              <option value="">Inga serieartiklar</option>
            ) : (
              serialParts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.partNumber} — {p.description}
                </option>
              ))
            )}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="serial-number">Serienummer</Label>
          <Input
            id="serial-number"
            required
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="font-mono"
            placeholder="SN-001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serial-batch">Batch (valfritt)</Label>
          <Select
            id="serial-batch"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          >
            <option value="">Ingen</option>
            {partBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber}
              </option>
            ))}
          </Select>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          className="w-full"
          disabled={pending || serialParts.length === 0}
        >
          {pending ? "Sparar…" : "Skapa individ"}
        </Button>
      </form>
    </div>
  );
}
