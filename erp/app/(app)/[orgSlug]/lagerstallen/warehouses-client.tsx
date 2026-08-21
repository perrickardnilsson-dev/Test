"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { createWarehouseAction } from "@/modules/inventory/actions";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  allowNegativeStock: boolean;
  isActive: boolean;
};

type Props = {
  orgSlug: string;
  warehouses: Warehouse[];
};

export function WarehousesClient({ orgSlug, warehouses }: Props) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [allowNegative, setAllowNegative] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createWarehouseAction(orgSlug, {
        code,
        name,
        allowNegativeStock: allowNegative,
        isActive: true,
      });
      setCode("");
      setName("");
      setAllowNegative(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte skapa lagerställe",
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
              <th className="px-3 py-2">Kod</th>
              <th className="px-3 py-2">Namn</th>
              <th className="px-3 py-2">Negativt saldo</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Inga lagerställen ännu. Skapa ett för att kunna lägga upp
                  lagerplatser.
                </td>
              </tr>
            ) : (
              warehouses.map((w) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{w.code}</td>
                  <td className="px-3 py-2">{w.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {w.allowNegativeStock ? "Tillåtet" : "Blockerat"}
                  </td>
                  <td className="px-3 py-2">
                    {w.isActive ? "Aktiv" : "Inaktiv"}
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
        <h2 className="text-sm font-semibold">Nytt lagerställe</h2>
        <div className="space-y-2">
          <Label htmlFor="wh-code">Kod</Label>
          <Input
            id="wh-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono"
            placeholder="HUVUD"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wh-name">Namn</Label>
          <Input
            id="wh-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Huvudlager"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowNegative}
            onChange={(e) => setAllowNegative(e.target.checked)}
          />
          Tillåt negativt saldo
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sparar…" : "Skapa lagerställe"}
        </Button>
      </form>
    </div>
  );
}
