"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import type { StockBalanceFilter } from "@/modules/inventory/domain/stock-schemas";

type BalanceRow = {
  id: string;
  partNumber: string;
  partDescription: string;
  unit: string;
  warehouseCode: string;
  locationCode: string;
  quantity: string;
  reservedQuantity: string;
  averageCost: string;
};

type Props = {
  orgSlug: string;
  balances: BalanceRow[];
  warehouses: Array<{ id: string; code: string; name: string }>;
  initialFilter: StockBalanceFilter;
};

function fmtQty(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("sv-SE") : v;
}

function fmtMoney(v: string) {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("sv-SE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })
    : v;
}

export function StockBalancesClient({
  orgSlug,
  balances,
  warehouses,
  initialFilter,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = React.useState(initialFilter.search ?? "");
  const [warehouseId, setWarehouseId] = React.useState(
    initialFilter.warehouseId ?? "",
  );
  const [view, setView] = React.useState<"part" | "location">(
    initialFilter.view ?? "part",
  );

  function applyFilters(next?: {
    search?: string;
    warehouseId?: string;
    view?: "part" | "location";
  }) {
    const q = next?.search ?? search;
    const wh = next?.warehouseId ?? warehouseId;
    const v = next?.view ?? view;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (wh) params.set("warehouse", wh);
    if (v !== "part") params.set("view", v);
    const qs = params.toString();
    router.push(`/${orgSlug}/lager${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="bal-q">Sök</Label>
          <Input
            id="bal-q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Artikelnummer, benämning, plats…"
            className="min-w-[16rem]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bal-wh">Lagerställe</Label>
          <Select
            id="bal-wh"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              applyFilters({ warehouseId: e.target.value });
            }}
          >
            <option value="">Alla</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="bal-view">Visa som</Label>
          <Select
            id="bal-view"
            value={view}
            onChange={(e) => {
              const v = e.target.value as "part" | "location";
              setView(v);
              applyFilters({ view: v });
            }}
          >
            <option value="part">Per artikel</option>
            <option value="location">Per plats</option>
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Filtrera
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(210_14%_96%)] text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">Artikel</th>
              <th className="px-3 py-2">Benämning</th>
              <th className="px-3 py-2">Lagerställe</th>
              <th className="px-3 py-2">Plats</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2 text-right">Reserverat</th>
              <th className="px-3 py-2 text-right">Tillgängligt</th>
              <th className="px-3 py-2 text-right">Snittkostnad</th>
              <th className="px-3 py-2 text-right">Värde</th>
            </tr>
          </thead>
          <tbody>
            {balances.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Inget saldo. Bokför en inleverans under Lagerrörelse.
                </td>
              </tr>
            ) : (
              balances.map((b) => {
                const qty = Number(b.quantity);
                const reserved = Number(b.reservedQuantity);
                const avg = Number(b.averageCost);
                const available = qty - reserved;
                const value = qty * avg;
                return (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">
                      {b.partNumber}
                    </td>
                    <td className="px-3 py-2">{b.partDescription}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {b.warehouseCode}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {b.locationCode}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {fmtQty(b.quantity)} {b.unit}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {fmtQty(b.reservedQuantity)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {available.toLocaleString("sv-SE")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {fmtMoney(b.averageCost)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {value.toLocaleString("sv-SE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
