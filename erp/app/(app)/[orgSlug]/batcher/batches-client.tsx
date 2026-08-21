"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import { createBatchAction } from "@/modules/inventory/actions";

const STATUS_LABELS: Record<string, string> = {
  available: "Tillgänglig",
  quarantine: "Karantän",
  blocked: "Blockerad",
};

type PartOption = {
  id: string;
  partNumber: string;
  description: string;
  traceabilityMode: string;
};

type BatchRow = {
  id: string;
  partNumber: string;
  batchNumber: string;
  status: string;
  productionDate: string | null;
  expiryDate: string | null;
  supplierBatchNumber: string | null;
  certificateRef: string | null;
};

type Props = {
  orgSlug: string;
  parts: PartOption[];
  batches: BatchRow[];
};

export function BatchesClient({ orgSlug, parts, batches }: Props) {
  const router = useRouter();
  const batchParts = parts.filter((p) => p.traceabilityMode !== "none");
  const [partId, setPartId] = React.useState(batchParts[0]?.id ?? "");
  const [batchNumber, setBatchNumber] = React.useState("");
  const [supplierBatchNumber, setSupplierBatchNumber] = React.useState("");
  const [certificateRef, setCertificateRef] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createBatchAction(orgSlug, {
        partId,
        batchNumber,
        supplierBatchNumber: supplierBatchNumber || null,
        certificateRef: certificateRef || null,
        status: "available",
      });
      setBatchNumber("");
      setSupplierBatchNumber("");
      setCertificateRef("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skapa batch");
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
              <th className="px-3 py-2">Batchnr</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Prod.datum</th>
              <th className="px-3 py-2">Utgång</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Inga batcher ännu.
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{b.partNumber}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {b.batchNumber}
                  </td>
                  <td className="px-3 py-2">
                    {STATUS_LABELS[b.status] ?? b.status}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {b.productionDate ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {b.expiryDate ?? "—"}
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
        <h2 className="text-sm font-semibold">Ny batch</h2>
        <div className="space-y-2">
          <Label htmlFor="batch-part">Artikel</Label>
          <Select
            id="batch-part"
            required
            value={partId}
            onChange={(e) => setPartId(e.target.value)}
            disabled={batchParts.length === 0}
          >
            {batchParts.length === 0 ? (
              <option value="">Inga spårbara artiklar</option>
            ) : (
              batchParts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.partNumber} — {p.description}
                </option>
              ))
            )}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-number">Batchnummer</Label>
          <Input
            id="batch-number"
            required
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            className="font-mono"
            placeholder="B-2026-001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-supplier">Leverantörsbatch</Label>
          <Input
            id="batch-supplier"
            value={supplierBatchNumber}
            onChange={(e) => setSupplierBatchNumber(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-cert">Certifikatref</Label>
          <Input
            id="batch-cert"
            value={certificateRef}
            onChange={(e) => setCertificateRef(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          className="w-full"
          disabled={pending || batchParts.length === 0}
        >
          {pending ? "Sparar…" : "Skapa batch"}
        </Button>
      </form>
    </div>
  );
}
