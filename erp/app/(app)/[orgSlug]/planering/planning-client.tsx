"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import {
  createDemandLineAction,
  createSupplyLineAction,
  runNetRequirementAction,
  seedMrpDemoAction,
  updateSuggestionsAction,
} from "@/modules/inventory/actions";

type PartOption = {
  id: string;
  partNumber: string;
  description: string;
};

type DemandRow = {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  dueDate: string;
  sourceType: string;
  sourceId: string | null;
};

type SupplyRow = {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  dueDate: string;
  sourceType: string;
  sourceId: string | null;
};

type RunRow = {
  id: string;
  runAt: string;
  asOfDate: string;
  status: string;
  message: string | null;
  suggestionCount: number;
};

type Pegging = {
  demandSourceType: string;
  demandSourceId: string | null;
  demandQuantity: number;
  demandDueDate: string;
  explanation: string;
};

type SuggestionRow = {
  id: string;
  partNumber: string;
  description: string;
  suggestionType: string;
  quantity: number;
  dueDate: string;
  orderDate: string;
  isLate: boolean;
  status: string;
  pegging: Pegging[];
};

type Props = {
  orgSlug: string;
  parts: PartOption[];
  demands: DemandRow[];
  supplies: SupplyRow[];
  runs: RunRow[];
  suggestions: SuggestionRow[];
};

const TYPE_LABEL: Record<string, string> = {
  purchase: "Inköp",
  manufacture: "Tillverkning",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Öppen",
  accepted: "Accepterad",
  rejected: "Förkastad",
};

export function PlanningClient({
  orgSlug,
  parts,
  demands,
  supplies,
  runs,
  suggestions,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [partId, setPartId] = React.useState(parts[0]?.id ?? "");
  const [quantity, setQuantity] = React.useState("10");
  const [dueDate, setDueDate] = React.useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [lineKind, setLineKind] = React.useState<"demand" | "supply">("demand");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const openSuggestions = suggestions.filter((s) => s.status === "open");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOpen() {
    if (selected.size === openSuggestions.length) setSelected(new Set());
    else setSelected(new Set(openSuggestions.map((s) => s.id)));
  }

  async function onSeed() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await seedMrpDemoAction(orgSlug);
      setMessage(
        `Demo seedad: ${result.parentPartNumber}, behov ${result.demandQuantity} till ${result.dueDate}.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte seeda demo");
    } finally {
      setPending(false);
    }
  }

  async function onRun() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await runNetRequirementAction(orgSlug, {});
      setMessage(
        `NBK klar: ${result.suggestionCount} förslag (${result.dependentDemandCount} beroende behov).`,
      );
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "NBK misslyckades");
    } finally {
      setPending(false);
    }
  }

  async function onBulk(status: "accepted" | "rejected") {
    if (selected.size === 0) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await updateSuggestionsAction(orgSlug, {
        suggestionIds: [...selected],
        status,
      });
      setMessage(
        status === "accepted"
          ? `${result.count} förslag accepterade.`
          : `${result.count} förslag förkastade.`,
      );
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte uppdatera");
    } finally {
      setPending(false);
    }
  }

  async function onAddLine(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (lineKind === "demand") {
        await createDemandLineAction(orgSlug, {
          partId,
          quantity: Number(quantity),
          dueDate,
          sourceType: "manual",
        });
        setMessage("Behov tillagt.");
      } else {
        await createSupplyLineAction(orgSlug, {
          partId,
          quantity: Number(quantity),
          dueDate,
          sourceType: "manual",
        });
        setMessage("Tillgång tillagd.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara rad");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={onSeed}>Seed MRP-demo</Button>
        <Button type="button" disabled={pending} onClick={onRun}>Kör nettobehov</Button>
        <Button type="button" variant="outline" disabled={pending || selected.size === 0} onClick={() => onBulk("accepted")}>
          Acceptera valda
        </Button>
        <Button type="button" variant="outline" disabled={pending || selected.size === 0} onClick={() => onBulk("rejected")}>
          Förkasta valda
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Förslag</h2>
          {openSuggestions.length > 0 ? (
            <button type="button" className="text-xs text-muted-foreground underline" onClick={toggleAllOpen}>
              {selected.size === openSuggestions.length ? "Avmarkera öppna" : "Markera alla öppna"}
            </button>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(210_14%_96%)] text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2">Artikel</th>
                <th className="px-3 py-2">Typ</th>
                <th className="px-3 py-2">Antal</th>
                <th className="px-3 py-2">Orderdatum</th>
                <th className="px-3 py-2">Behovsdatum</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Inga förslag. Seed demo och kör NBK.
                  </td>
                </tr>
              ) : (
                suggestions.map((s) => (
                  <React.Fragment key={s.id}>
                    <tr className={`border-t border-border ${s.isLate ? "bg-amber-50" : ""}`}>
                      <td className="px-3 py-2">
                        {s.status === "open" ? (
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => toggle(s.id)}
                            aria-label={`Välj ${s.partNumber}`}
                          />
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        >
                          <span className="font-mono text-xs">{s.partNumber}</span>
                          <span className="ml-2 text-muted-foreground">{s.description}</span>
                          {s.isLate ? (
                            <span className="ml-2 text-xs font-medium text-amber-800">Försenat</span>
                          ) : null}
                        </button>
                      </td>
                      <td className="px-3 py-2">{TYPE_LABEL[s.suggestionType] ?? s.suggestionType}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.quantity}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.orderDate}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.dueDate}</td>
                      <td className="px-3 py-2">{STATUS_LABEL[s.status] ?? s.status}</td>
                    </tr>
                    {expandedId === s.id ? (
                      <tr className="border-t border-border bg-[hsl(210_20%_98%)]">
                        <td colSpan={7} className="px-3 py-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Pegging — varför föreslås detta?
                          </p>
                          <ul className="space-y-1 text-sm">
                            {s.pegging.map((p, i) => (
                              <li key={`${s.id}-peg-${i}`}>{p.explanation}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Öppna behov</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(210_14%_96%)] text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Artikel</th>
                  <th className="px-3 py-2">Antal</th>
                  <th className="px-3 py-2">Datum</th>
                </tr>
              </thead>
              <tbody>
                {demands.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Inga behov.</td>
                  </tr>
                ) : (
                  demands.map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{d.partNumber}</td>
                      <td className="px-3 py-2 font-mono text-xs">{d.quantity}</td>
                      <td className="px-3 py-2 font-mono text-xs">{d.dueDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Öppen tillgång</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(210_14%_96%)] text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Artikel</th>
                  <th className="px-3 py-2">Antal</th>
                  <th className="px-3 py-2">Datum</th>
                </tr>
              </thead>
              <tbody>
                {supplies.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Ingen schemalagd tillgång.</td>
                  </tr>
                ) : (
                  supplies.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{s.partNumber}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.quantity}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.dueDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <form onSubmit={onAddLine} className="grid max-w-3xl gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-5">
        <h2 className="text-sm font-semibold sm:col-span-2 lg:col-span-5">Lägg till behov / tillgång</h2>
        <div className="space-y-2">
          <Label htmlFor="line-kind">Typ</Label>
          <Select id="line-kind" value={lineKind} onChange={(e) => setLineKind(e.target.value as "demand" | "supply")}>
            <option value="demand">Behov</option>
            <option value="supply">Tillgång</option>
          </Select>
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="line-part">Artikel</Label>
          <Select id="line-part" required value={partId} onChange={(e) => setPartId(e.target.value)} disabled={parts.length === 0}>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.partNumber} — {p.description}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="line-qty">Antal</Label>
          <Input id="line-qty" type="number" min="0.0001" step="any" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="line-due">Datum</Label>
          <Input id="line-due" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-5">
          <Button type="submit" disabled={pending || !partId}>Spara</Button>
        </div>
      </form>

      {runs.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Tidigare körningar</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {runs.slice(0, 5).map((r) => (
              <li key={r.id}>
                <span className="font-mono text-xs">{r.runAt.slice(0, 19).replace("T", " ")}</span>
                {" · "}{r.status}{" · "}{r.suggestionCount} förslag
                {r.message ? ` — ${r.message}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
