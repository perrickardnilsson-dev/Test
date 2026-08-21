"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import {
  postManualIssueAction,
  postManualReceiptAction,
  postManualTransferAction,
} from "@/modules/inventory/actions";

type PartOption = {
  id: string;
  partNumber: string;
  description: string;
  unit: string;
  traceabilityMode: "none" | "batch" | "serial";
};

type LocationOption = {
  id: string;
  code: string;
  warehouseCode: string;
  label: string;
};

type BatchOption = {
  id: string;
  partId: string;
  batchNumber: string;
  partNumber: string;
};

type Props = {
  orgSlug: string;
  parts: PartOption[];
  locations: LocationOption[];
  batches: BatchOption[];
};

type Mode = "receipt" | "issue" | "transfer";

export function MovementClient({
  orgSlug,
  parts,
  locations,
  batches,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("receipt");
  const [partId, setPartId] = React.useState(parts[0]?.id ?? "");
  const [fromLocationId, setFromLocationId] = React.useState(
    locations[0]?.id ?? "",
  );
  const [toLocationId, setToLocationId] = React.useState(
    locations[0]?.id ?? "",
  );
  const [quantity, setQuantity] = React.useState("1");
  const [unitCost, setUnitCost] = React.useState("0");
  const [issueType, setIssueType] = React.useState<"issue" | "scrap">("issue");
  const [note, setNote] = React.useState("");
  const [batchNumber, setBatchNumber] = React.useState("");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [batchId, setBatchId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const selectedPart = parts.find((p) => p.id === partId);
  const partMode = selectedPart?.traceabilityMode ?? "none";
  const partBatches = batches.filter((b) => b.partId === partId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const qty = Number(quantity);
      if (mode === "receipt") {
        await postManualReceiptAction(orgSlug, {
          partId,
          toLocationId,
          quantity: qty,
          unitCost: Number(unitCost) || 0,
          batchNumber:
            partMode === "batch" || partMode === "serial"
              ? batchNumber || null
              : null,
          serialNumber: partMode === "serial" ? serialNumber || null : null,
          note: note || null,
        });
        setSuccess("Inleverans bokförd.");
      } else if (mode === "issue") {
        await postManualIssueAction(orgSlug, {
          partId,
          fromLocationId,
          quantity: qty,
          type: issueType,
          batchId:
            partMode === "batch" || partMode === "serial"
              ? batchId || null
              : null,
          note: note || null,
        });
        setSuccess(
          issueType === "scrap" ? "Skrot bokfört." : "Utleverans bokförd.",
        );
      } else {
        await postManualTransferAction(orgSlug, {
          partId,
          fromLocationId,
          toLocationId,
          quantity: qty,
          batchId:
            partMode === "batch" || partMode === "serial"
              ? batchId || null
              : null,
          note: note || null,
        });
        setSuccess("Flytt bokförd.");
      }
      setQuantity("1");
      setNote("");
      setBatchNumber("");
      setSerialNumber("");
      setBatchId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte bokföra");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex gap-2">
        {(
          [
            ["receipt", "Inleverans"],
            ["issue", "Utleverans"],
            ["transfer", "Flytt"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={mode === value ? "default" : "secondary"}
            onClick={() => setMode(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-border p-4"
      >
        <div className="space-y-2">
          <Label htmlFor="mv-part">Artikel</Label>
          <Select
            id="mv-part"
            required
            value={partId}
            onChange={(e) => {
              setPartId(e.target.value);
              setBatchId("");
              setBatchNumber("");
              setSerialNumber("");
            }}
            disabled={parts.length === 0}
          >
            {parts.length === 0 ? (
              <option value="">Inga artiklar</option>
            ) : (
              parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.partNumber} — {p.description}
                </option>
              ))
            )}
          </Select>
        </div>

        {mode !== "receipt" ? (
          <div className="space-y-2">
            <Label htmlFor="mv-from">Från plats</Label>
            <Select
              id="mv-from"
              required
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              disabled={locations.length === 0}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {mode !== "issue" ? (
          <div className="space-y-2">
            <Label htmlFor="mv-to">Till plats</Label>
            <Select
              id="mv-to"
              required
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              disabled={locations.length === 0}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {mode === "issue" ? (
          <div className="space-y-2">
            <Label htmlFor="mv-issue-type">Typ</Label>
            <Select
              id="mv-issue-type"
              value={issueType}
              onChange={(e) =>
                setIssueType(e.target.value as "issue" | "scrap")
              }
            >
              <option value="issue">Utleverans</option>
              <option value="scrap">Skrot</option>
            </Select>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="mv-qty">
              Antal{selectedPart ? ` (${selectedPart.unit})` : ""}
            </Label>
            <Input
              id="mv-qty"
              type="number"
              min={0.0001}
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          {mode === "receipt" ? (
            <div className="space-y-2">
              <Label htmlFor="mv-cost">Enhetskostnad</Label>
              <Input
                id="mv-cost"
                type="number"
                min={0}
                step="any"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          ) : (
            <div />
          )}
        </div>

        {mode === "receipt" &&
        (partMode === "batch" || partMode === "serial") ? (
          <div className="space-y-2">
            <Label htmlFor="mv-batch-number">Batchnummer</Label>
            <Input
              id="mv-batch-number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="font-mono"
              placeholder="B-2026-001"
            />
          </div>
        ) : null}

        {mode === "receipt" && partMode === "serial" ? (
          <div className="space-y-2">
            <Label htmlFor="mv-serial-number">Serienummer</Label>
            <Input
              id="mv-serial-number"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="font-mono"
              placeholder="SN-001"
            />
          </div>
        ) : null}

        {mode !== "receipt" &&
        (partMode === "batch" || partMode === "serial") ? (
          <div className="space-y-2">
            <Label htmlFor="mv-batch-id">Batch (valfritt)</Label>
            <Select
              id="mv-batch-id"
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
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="mv-note">Notering</Label>
          <Input
            id="mv-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? (
          <p className="text-sm text-[hsl(152_45%_32%)]">{success}</p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={
            pending || parts.length === 0 || locations.length === 0
          }
        >
          {pending ? "Bokför…" : "Bokför"}
        </Button>
      </form>
    </div>
  );
}
