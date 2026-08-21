"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import {
  PART_STATUS_LABELS,
  PART_TYPE_LABELS,
  PART_UNIT_LABELS,
} from "@/modules/inventory/domain/part-schemas";
import {
  createPartAction,
  updatePartAction,
} from "@/modules/inventory/actions";

type Group = { id: string; code: string; name: string };

type PartValues = {
  id?: string;
  partNumber: string;
  description: string;
  unit: string;
  type: string;
  partGroupId?: string | null;
  status: string;
  standardCost: number;
  salesPrice: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  lotSizingRule: string;
  lotSize?: number | null;
  planningMethod: string;
  traceabilityMode: string;
  weightKg?: number | null;
  notes?: string | null;
};

type Props = {
  orgSlug: string;
  groups: Group[];
  mode: "create" | "edit";
  initial?: PartValues;
};

const defaults: PartValues = {
  partNumber: "",
  description: "",
  unit: "st",
  type: "purchased",
  partGroupId: null,
  status: "active",
  standardCost: 0,
  salesPrice: 0,
  leadTimeDays: 0,
  safetyStock: 0,
  reorderPoint: 0,
  lotSizingRule: "lot_for_lot",
  lotSize: null,
  planningMethod: "mrp",
  traceabilityMode: "none",
  weightKg: null,
  notes: "",
};

export function PartForm({ orgSlug, groups, mode, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = React.useState<PartValues>({
    ...defaults,
    ...initial,
  });
  const [showMore, setShowMore] = React.useState(mode === "edit");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  function set<K extends keyof PartValues>(key: K, value: PartValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === "create") {
        const created = await createPartAction(orgSlug, values);
        router.push(`/${orgSlug}/artiklar/${created.id}`);
      } else {
        await updatePartAction(orgSlug, { ...values, id: values.id });
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <section className="space-y-4 rounded-lg border border-border p-5">
        <div>
          <h2 className="text-sm font-semibold">Grunduppgifter</h2>
          <p className="text-xs text-muted-foreground">
            Fyra fält räcker för att skapa. Resten har vettiga standardvärden.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="partNumber">Artikelnummer</Label>
            <Input
              id="partNumber"
              required
              value={values.partNumber}
              onChange={(e) => set("partNumber", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="unit">Enhet</Label>
            <Select
              id="unit"
              value={values.unit}
              onChange={(e) => set("unit", e.target.value)}
            >
              {Object.entries(PART_UNIT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Benämning</Label>
            <Input
              id="description"
              required
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Typ</Label>
            <Select
              id="type"
              value={values.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {Object.entries(PART_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <div>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? "Dölj fler inställningar" : "Fler inställningar"}
        </button>
      </div>

      {showMore ? (
        <section className="space-y-4 rounded-lg border border-dashed border-border p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={values.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {Object.entries(PART_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="partGroupId">Varugrupp</Label>
              <Select
                id="partGroupId"
                value={values.partGroupId ?? ""}
                onChange={(e) =>
                  set("partGroupId", e.target.value || null)
                }
              >
                <option value="">— Ingen —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} — {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="standardCost">Standardkostnad</Label>
              <Input
                id="standardCost"
                type="number"
                step="0.01"
                min="0"
                value={values.standardCost}
                onChange={(e) => set("standardCost", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesPrice">Försäljningspris</Label>
              <Input
                id="salesPrice"
                type="number"
                step="0.01"
                min="0"
                value={values.salesPrice}
                onChange={(e) => set("salesPrice", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Ledtid (dagar)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="0"
                value={values.leadTimeDays}
                onChange={(e) => set("leadTimeDays", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="safetyStock">Säkerhetslager</Label>
              <Input
                id="safetyStock"
                type="number"
                min="0"
                step="0.01"
                value={values.safetyStock}
                onChange={(e) => set("safetyStock", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Beställningspunkt</Label>
              <Input
                id="reorderPoint"
                type="number"
                min="0"
                step="0.01"
                value={values.reorderPoint}
                onChange={(e) => set("reorderPoint", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lotSizingRule">Partiformning</Label>
              <Select
                id="lotSizingRule"
                value={values.lotSizingRule}
                onChange={(e) => set("lotSizingRule", e.target.value)}
              >
                <option value="lot_for_lot">Lot-för-lot</option>
                <option value="fixed_qty">Fast kvantitet</option>
                <option value="min_qty">Min kvantitet</option>
                <option value="economic_order_qty">EOQ</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lotSize">Partistorlek</Label>
              <Input
                id="lotSize"
                type="number"
                min="0"
                step="0.01"
                value={values.lotSize ?? ""}
                onChange={(e) =>
                  set(
                    "lotSize",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planningMethod">Planeringsmetod</Label>
              <Select
                id="planningMethod"
                value={values.planningMethod}
                onChange={(e) => set("planningMethod", e.target.value)}
              >
                <option value="mrp">MRP</option>
                <option value="reorder_point">Beställningspunkt</option>
                <option value="manual">Manuell</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="traceabilityMode">Spårbarhet</Label>
              <Select
                id="traceabilityMode"
                value={values.traceabilityMode}
                onChange={(e) => set("traceabilityMode", e.target.value)}
              >
                <option value="none">Ingen</option>
                <option value="batch">Batch</option>
                <option value="serial">Serie</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightKg">Vikt (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                min="0"
                step="0.001"
                value={values.weightKg ?? ""}
                onChange={(e) =>
                  set(
                    "weightKg",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Anteckningar</Label>
              <textarea
                id="notes"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={values.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Sparar…"
            : mode === "create"
              ? "Skapa artikel"
              : "Spara ändringar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${orgSlug}/artiklar`)}
        >
          Tillbaka
        </Button>
      </div>
    </form>
  );
}
