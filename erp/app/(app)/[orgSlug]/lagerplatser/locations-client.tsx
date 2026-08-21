"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import { createStockLocationAction } from "@/modules/inventory/actions";

const LOCATION_TYPE_LABELS: Record<string, string> = {
  picking: "Plock",
  bulk: "Bulk",
  quarantine: "Karantän",
  wip: "PIA",
};

type Warehouse = { id: string; code: string; name: string };

type Location = {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  code: string;
  name: string | null;
  zone: string | null;
  pickSequence: number;
  type: string;
  isActive: boolean;
};

type Props = {
  orgSlug: string;
  warehouses: Warehouse[];
  locations: Location[];
  initialWarehouseId: string | null;
};

export function LocationsClient({
  orgSlug,
  warehouses,
  locations,
  initialWarehouseId,
}: Props) {
  const router = useRouter();
  const [filterWh, setFilterWh] = React.useState(initialWarehouseId ?? "");
  const [warehouseId, setWarehouseId] = React.useState(
    initialWarehouseId ?? warehouses[0]?.id ?? "",
  );
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [zone, setZone] = React.useState("");
  const [pickSequence, setPickSequence] = React.useState("0");
  const [type, setType] = React.useState("picking");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  function onFilterChange(value: string) {
    setFilterWh(value);
    const qs = value ? `?warehouse=${value}` : "";
    router.push(`/${orgSlug}/lagerplatser${qs}`);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createStockLocationAction(orgSlug, {
        warehouseId,
        code,
        name: name || null,
        zone: zone || null,
        pickSequence: Number(pickSequence) || 0,
        type,
        isActive: true,
      });
      setCode("");
      setName("");
      setZone("");
      setPickSequence("0");
      setType("picking");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte skapa lagerplats",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="filter-wh">Filtrera lagerställe</Label>
          <Select
            id="filter-wh"
            value={filterWh}
            onChange={(e) => onFilterChange(e.target.value)}
            className="min-w-[12rem]"
          >
            <option value="">Alla</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(210_14%_96%)] text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2">Lagerställe</th>
                <th className="px-3 py-2">Kod</th>
                <th className="px-3 py-2">Namn</th>
                <th className="px-3 py-2">Zon</th>
                <th className="px-3 py-2">Typ</th>
                <th className="px-3 py-2">Plockseq</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    {warehouses.length === 0
                      ? "Skapa först ett lagerställe."
                      : "Inga lagerplatser ännu."}
                  </td>
                </tr>
              ) : (
                locations.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">
                      {l.warehouseCode}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{l.code}</td>
                    <td className="px-3 py-2">{l.name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {l.zone ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {LOCATION_TYPE_LABELS[l.type] ?? l.type}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {l.pickSequence}
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
          <h2 className="text-sm font-semibold">Ny lagerplats</h2>
          <div className="space-y-2">
            <Label htmlFor="loc-wh">Lagerställe</Label>
            <Select
              id="loc-wh"
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              disabled={warehouses.length === 0}
            >
              {warehouses.length === 0 ? (
                <option value="">Inga lagerställen</option>
              ) : (
                warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))
              )}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-code">Kod</Label>
            <Input
              id="loc-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono"
              placeholder="A-01-01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-name">Namn</Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-zone">Zon</Label>
            <Input
              id="loc-zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="loc-type">Typ</Label>
              <Select
                id="loc-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-seq">Plockseq</Label>
              <Input
                id="loc-seq"
                type="number"
                min={0}
                value={pickSequence}
                onChange={(e) => setPickSequence(e.target.value)}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            className="w-full"
            disabled={pending || warehouses.length === 0}
          >
            {pending ? "Sparar…" : "Skapa lagerplats"}
          </Button>
        </form>
      </div>
    </div>
  );
}
