"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import {
  postManualIssueAction,
  postManualReceiptAction,
  recordCountByPartAction,
} from "@/modules/inventory/actions";
import { BarcodeScanner } from "@/modules/inventory/components/barcode-scanner";

type PartOption = {
  id: string;
  partNumber: string;
  description: string;
  unit: string;
};

type LocationOption = {
  id: string;
  code: string;
  warehouseCode: string;
  label: string;
};

type OpenCount = {
  id: string;
  name: string;
  status: string;
};

type Props = {
  orgSlug: string;
  parts: PartOption[];
  locations: LocationOption[];
  openCounts: OpenCount[];
};

type Mode = "receive" | "issue" | "count";

export function MobileWarehouseClient({
  orgSlug,
  parts,
  locations,
  openCounts,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("receive");
  const [partNumber, setPartNumber] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitCost, setUnitCost] = React.useState("0");
  const [locationId, setLocationId] = React.useState(locations[0]?.id ?? "");
  const [countId, setCountId] = React.useState(
    openCounts.find((c) => c.status === "counting")?.id ??
      openCounts[0]?.id ??
      "",
  );
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  function resolvePartId(pn: string): PartOption | undefined {
    const trimmed = pn.trim().toLowerCase();
    return parts.find((p) => p.partNumber.toLowerCase() === trimmed);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const qty = Number(quantity);
      if (Number.isNaN(qty) || qty <= 0) {
        throw new Error("Ange giltigt antal");
      }

      if (mode === "count") {
        if (!countId) throw new Error("Välj en öppen inventering");
        await recordCountByPartAction(orgSlug, {
          inventoryCountId: countId,
          partNumber: partNumber.trim(),
          locationId: locationId || undefined,
          countedQuantity: qty,
        });
        setMessage("Räkning registrerad");
      } else {
        const part = resolvePartId(partNumber);
        if (!part) throw new Error(`Artikel ${partNumber} hittades inte`);
        if (!locationId) throw new Error("Välj lagerplats");

        if (mode === "receive") {
          await postManualReceiptAction(orgSlug, {
            partId: part.id,
            toLocationId: locationId,
            quantity: qty,
            unitCost: Number(unitCost) || 0,
            note: "Mobilt inleverans",
          });
          setMessage("Inleverans bokförd");
        } else {
          await postManualIssueAction(orgSlug, {
            partId: part.id,
            fromLocationId: locationId,
            quantity: qty,
            type: "issue",
            note: "Mobilt utleverans",
          });
          setMessage("Utleverans bokförd");
        }
      }
      setQuantity("1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Åtgärden misslyckades");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["receive", "In"],
            ["issue", "Ut"],
            ["count", "Räkna"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={mode === id ? "default" : "outline"}
            className="h-12"
            onClick={() => setMode(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <BarcodeScanner
        onScan={(code) => {
          setPartNumber(code);
          setMessage(`Skannat: ${code}`);
        }}
      />

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="mw-pn">Artikelnummer</Label>
          <Input
            id="mw-pn"
            className="h-12 font-mono text-lg"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            required
            autoComplete="off"
          />
        </div>

        {mode !== "count" || locations.length > 0 ? (
          <div className="space-y-1.5">
            <Label htmlFor="mw-loc">Lagerplats</Label>
            <Select
              id="mw-loc"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {mode === "count" ? (
          <div className="space-y-1.5">
            <Label htmlFor="mw-count">Inventering</Label>
            {openCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen öppen inventering.{" "}
                <Link
                  href={`/${orgSlug}/inventering`}
                  className="text-primary hover:underline"
                >
                  Skapa en
                </Link>
              </p>
            ) : (
              <Select
                id="mw-count"
                value={countId}
                onChange={(e) => setCountId(e.target.value)}
              >
                {openCounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </Select>
            )}
            {countId ? (
              <Link
                href={`/${orgSlug}/inventering/${countId}/mobil`}
                className="text-sm text-primary hover:underline"
              >
                Öppna mobilräkning
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="mw-qty">Antal</Label>
          <Input
            id="mw-qty"
            className="h-12 font-mono text-lg"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="decimal"
            required
          />
        </div>

        {mode === "receive" ? (
          <div className="space-y-1.5">
            <Label htmlFor="mw-cost">Enhetskostnad</Label>
            <Input
              id="mw-cost"
              className="h-12 font-mono"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              inputMode="decimal"
            />
          </div>
        ) : null}

        <Button type="submit" className="h-14 w-full text-lg" disabled={pending}>
          {pending
            ? "Arbetar…"
            : mode === "receive"
              ? "Bokför inleverans"
              : mode === "issue"
                ? "Bokför utleverans"
                : "Registrera räkning"}
        </Button>
      </form>

      {message ? (
        <p className="text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
