"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import {
  createBomAction,
  deleteBomLineAction,
  getBomTreeAction,
  updateBomAction,
  upsertBomLineAction,
} from "@/modules/inventory/actions";

type BomSummary = {
  id: string;
  parentPartId: string;
  partNumber: string;
  description: string;
  revision: string;
  status: string;
};

type PartOption = {
  id: string;
  partNumber: string;
  description: string;
  type: string;
};

type BomLineRow = {
  id: string;
  componentPartId: string;
  partNumber: string;
  description: string;
  partType: string;
  quantityPer: number;
  scrapPercent: number;
  position: number;
};

type SelectedBom = BomSummary & { lines: BomLineRow[] };

type TreeNode = {
  partId: string;
  partNumber?: string;
  description?: string;
  quantityPer: number;
  scrapPercent: number;
  effectiveQuantity: number;
  depth: number;
  isPhantom: boolean;
  children: TreeNode[];
};

type Props = {
  orgSlug: string;
  boms: BomSummary[];
  parts: PartOption[];
  manufacturedParts: PartOption[];
  selectedBom: SelectedBom | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Utkast",
  active: "Aktiv",
  obsolete: "Utgått",
};

function BomTreeView({ node }: { node: TreeNode }) {
  return (
    <li className="my-1">
      <span className="font-mono text-xs">{node.partNumber ?? node.partId}</span>
      {node.description ? (
        <span className="ml-2 text-muted-foreground">— {node.description}</span>
      ) : null}
      {node.depth > 0 ? (
        <span className="ml-2 text-xs text-muted-foreground">
          × {node.effectiveQuantity.toFixed(4)}
          {node.scrapPercent > 0 ? ` (spill ${node.scrapPercent}%)` : ""}
        </span>
      ) : null}
      {node.isPhantom ? (
        <span className="ml-2 text-xs text-amber-700">fantom</span>
      ) : null}
      {node.children.length > 0 ? (
        <ul className="ml-4 list-disc border-l border-border pl-3">
          {node.children.map((child) => (
            <BomTreeView
              key={`${child.partId}-${child.depth}-${child.quantityPer}`}
              node={child}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function StructuresClient({
  orgSlug,
  boms,
  parts,
  manufacturedParts,
  selectedBom,
}: Props) {
  const router = useRouter();
  const [parentPartId, setParentPartId] = React.useState(
    manufacturedParts[0]?.id ?? "",
  );
  const [revision, setRevision] = React.useState("A");
  const [componentPartId, setComponentPartId] = React.useState(
    parts[0]?.id ?? "",
  );
  const [quantityPer, setQuantityPer] = React.useState("1");
  const [scrapPercent, setScrapPercent] = React.useState("0");
  const [position, setPosition] = React.useState("10");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [tree, setTree] = React.useState<TreeNode | null>(null);

  function selectBom(id: string) {
    router.push(`/${orgSlug}/strukturer?bomId=${id}`);
  }

  async function onCreateBom(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createBomAction(orgSlug, {
        parentPartId,
        revision,
        status: "draft",
      });
      setMessage("Struktur skapad som utkast.");
      router.push(`/${orgSlug}/strukturer?bomId=${created.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skapa struktur");
    } finally {
      setPending(false);
    }
  }

  async function onActivate() {
    if (!selectedBom) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await updateBomAction(orgSlug, { id: selectedBom.id, status: "active" });
      setMessage("Struktur aktiverad — low-level code uppdaterad.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte aktivera");
    } finally {
      setPending(false);
    }
  }

  async function onAddLine(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBom) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await upsertBomLineAction(orgSlug, {
        bomId: selectedBom.id,
        componentPartId,
        quantityPer: Number(quantityPer),
        scrapPercent: Number(scrapPercent),
        position: Number(position),
      });
      setMessage("Komponentrad sparad.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara rad");
    } finally {
      setPending(false);
    }
  }

  async function onDeleteLine(lineId: string) {
    setPending(true);
    setError(null);
    try {
      await deleteBomLineAction(orgSlug, { lineId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte ta bort rad");
    } finally {
      setPending(false);
    }
  }

  async function onShowTree() {
    if (!selectedBom) return;
    setPending(true);
    setError(null);
    try {
      const data = await getBomTreeAction(orgSlug, selectedBom.parentPartId);
      setTree(data as TreeNode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte bygga träd");
      setTree(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(210_14%_96%)] text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Artikel</th>
                <th className="px-3 py-2">Rev</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {boms.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                    Inga strukturer ännu.
                  </td>
                </tr>
              ) : (
                boms.map((b) => (
                  <tr
                    key={b.id}
                    className={`cursor-pointer border-t border-border hover:bg-[hsl(210_20%_98%)] ${
                      selectedBom?.id === b.id ? "bg-[hsl(210_25%_95%)]" : ""
                    }`}
                    onClick={() => selectBom(b.id)}
                  >
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs">{b.partNumber}</span>
                      <span className="ml-2 text-muted-foreground">{b.description}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{b.revision}</td>
                    <td className="px-3 py-2">{STATUS_LABEL[b.status] ?? b.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={onCreateBom} className="h-fit space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">Ny struktur</h2>
          <div className="space-y-2">
            <Label htmlFor="bom-parent">Överordnad artikel</Label>
            <Select
              id="bom-parent"
              required
              value={parentPartId}
              onChange={(e) => setParentPartId(e.target.value)}
              disabled={manufacturedParts.length === 0}
            >
              {manufacturedParts.length === 0 ? (
                <option value="">Inga tillverkade/fantom-artiklar</option>
              ) : (
                manufacturedParts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partNumber} — {p.description}
                  </option>
                ))
              )}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bom-rev">Revision</Label>
            <Input
              id="bom-rev"
              required
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
              className="font-mono"
            />
          </div>
          <Button type="submit" disabled={pending || !parentPartId}>
            Skapa utkast
          </Button>
        </form>
      </div>

      {selectedBom ? (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                {selectedBom.partNumber} · rev {selectedBom.revision}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedBom.description} · {STATUS_LABEL[selectedBom.status] ?? selectedBom.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={onShowTree}>
                Visa träd
              </Button>
              {selectedBom.status !== "active" ? (
                <Button type="button" disabled={pending} onClick={onActivate}>
                  Aktivera
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(210_14%_96%)] text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2">Komponent</th>
                  <th className="px-3 py-2">Antal</th>
                  <th className="px-3 py-2">Spill %</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {selectedBom.lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      Inga komponenter.
                    </td>
                  </tr>
                ) : (
                  selectedBom.lines.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{l.position}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs">{l.partNumber}</span>
                        <span className="ml-2 text-muted-foreground">{l.description}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{l.quantityPer}</td>
                      <td className="px-3 py-2 font-mono text-xs">{l.scrapPercent}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={pending}
                          onClick={() => onDeleteLine(l.id)}
                        >
                          Ta bort
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={onAddLine} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="line-comp">Komponent</Label>
              <Select
                id="line-comp"
                required
                value={componentPartId}
                onChange={(e) => setComponentPartId(e.target.value)}
              >
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partNumber} — {p.description}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="line-qty">Antal per</Label>
              <Input
                id="line-qty"
                type="number"
                min="0.0001"
                step="any"
                required
                value={quantityPer}
                onChange={(e) => setQuantityPer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line-scrap">Spill %</Label>
              <Input
                id="line-scrap"
                type="number"
                min="0"
                max="99.99"
                step="any"
                value={scrapPercent}
                onChange={(e) => setScrapPercent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line-pos">Position</Label>
              <Input
                id="line-pos"
                type="number"
                min="0"
                step="1"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-5">
              <Button type="submit" disabled={pending}>
                Lägg till komponent
              </Button>
            </div>
          </form>

          {tree ? (
            <div className="rounded-md border border-border p-3">
              <h3 className="mb-2 text-sm font-semibold">Strukturträd</h3>
              <ul className="list-disc pl-4 text-sm">
                <BomTreeView node={tree} />
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
