"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import { createInventoryCountAction } from "@/modules/inventory/actions";

type CountRow = {
  id: string;
  name: string;
  status: string;
  warehouseId: string | null;
  note: string | null;
  createdAt: string;
  postedAt: string | null;
};

type WarehouseOption = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  orgSlug: string;
  counts: CountRow[];
  warehouses: WarehouseOption[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Utkast",
  counting: "Räkning",
  pending_approval: "Väntar godkännande",
  posted: "Bokförd",
  cancelled: "Avbruten",
};

export function InventeringClient({ orgSlug, counts, warehouses }: Props) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [snapshot, setSnapshot] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const created = await createInventoryCountAction(orgSlug, {
        name,
        warehouseId: warehouseId || null,
        snapshotBalances: snapshot,
      });
      setName("");
      router.push(`/${orgSlug}/inventering/${created.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte skapa inventering",
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
              <th className="px-3 py-2">Namn</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Skapad</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {counts.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Inga inventeringar ännu.
                </td>
              </tr>
            ) : (
              counts.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {STATUS_LABEL[c.status] ?? c.status}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {c.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/${orgSlug}/inventering/${c.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Öppna
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={onCreate}
        className="h-fit space-y-3 rounded-lg border border-border p-4"
      >
        <h2 className="text-sm font-semibold">Ny inventering</h2>
        <div className="space-y-1.5">
          <Label htmlFor="count-name">Namn</Label>
          <Input
            id="count-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="t.ex. Årlig MAIN"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="count-wh">Lagerställe (valfritt)</Label>
          <Select
            id="count-wh"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">Alla</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={snapshot}
            onChange={(e) => setSnapshot(e.target.checked)}
          />
          Snapshot från aktuella saldon
        </label>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Skapar…" : "Starta räkning"}
        </Button>
      </form>
    </div>
  );
}
