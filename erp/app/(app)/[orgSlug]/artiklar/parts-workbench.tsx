"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Input } from "@/core/ui/components/input";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import {
  PART_STATUS_LABELS,
  PART_TYPE_LABELS,
  PART_UNIT_LABELS,
  type PartListFilter,
} from "@/modules/inventory/domain/part-schemas";
import {
  deleteSavedViewAction,
  importPartsCsvAction,
  savePartViewAction,
} from "@/modules/inventory/actions";

type PartRow = {
  id: string;
  partNumber: string;
  description: string;
  unit: keyof typeof PART_UNIT_LABELS;
  type: keyof typeof PART_TYPE_LABELS;
  status: keyof typeof PART_STATUS_LABELS;
  partGroupId: string | null;
  standardCost: string;
  salesPrice: string;
  leadTimeDays: number;
  updatedAt: Date | string;
};

type Group = { id: string; code: string; name: string };
type SavedView = {
  id: string;
  name: string;
  config: {
    search?: string;
    status?: string[];
    type?: string[];
    partGroupId?: string | null;
    columns?: string[];
  };
};

type Props = {
  orgSlug: string;
  initialParts: PartRow[];
  groups: Group[];
  savedViews: SavedView[];
  initialFilter: PartListFilter;
};

export function PartsWorkbench({
  orgSlug,
  initialParts,
  groups,
  savedViews,
  initialFilter,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = React.useState(initialFilter.search ?? "");
  const [status, setStatus] = React.useState(initialFilter.status?.[0] ?? "");
  const [type, setType] = React.useState(initialFilter.type?.[0] ?? "");
  const [groupId, setGroupId] = React.useState(
    initialFilter.partGroupId ?? "",
  );
  const [importMsg, setImportMsg] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const columns = React.useMemo<ColumnDef<PartRow>[]>(
    () => [
      {
        accessorKey: "partNumber",
        header: "Artikelnummer",
        cell: ({ row }) => (
          <Link
            href={`/${orgSlug}/artiklar/${row.original.id}`}
            className="font-mono text-sm font-medium text-primary hover:underline"
          >
            {row.original.partNumber}
          </Link>
        ),
      },
      { accessorKey: "description", header: "Benämning" },
      {
        accessorKey: "unit",
        header: "Enhet",
        cell: ({ getValue }) =>
          PART_UNIT_LABELS[getValue() as keyof typeof PART_UNIT_LABELS] ??
          String(getValue()),
      },
      {
        accessorKey: "type",
        header: "Typ",
        cell: ({ getValue }) =>
          PART_TYPE_LABELS[getValue() as keyof typeof PART_TYPE_LABELS] ??
          String(getValue()),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) =>
          PART_STATUS_LABELS[getValue() as keyof typeof PART_STATUS_LABELS] ??
          String(getValue()),
      },
      {
        accessorKey: "standardCost",
        header: "Std.kostnad",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs tabular-nums">
            {Number(getValue()).toLocaleString("sv-SE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
    ],
    [orgSlug],
  );

  const table = useReactTable({
    data: initialParts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function applyFilters(next?: {
    search?: string;
    status?: string;
    type?: string;
    groupId?: string;
  }) {
    const q = new URLSearchParams();
    const s = next?.search ?? search;
    const st = next?.status ?? status;
    const ty = next?.type ?? type;
    const g = next?.groupId ?? groupId;
    if (s) q.set("q", s);
    if (st) q.set("status", st);
    if (ty) q.set("type", ty);
    if (g) q.set("group", g);
    const qs = q.toString();
    router.push(`/${orgSlug}/artiklar${qs ? `?${qs}` : ""}`);
  }

  async function onSaveView() {
    const name = window.prompt("Namn på sparad vy");
    if (!name?.trim()) return;
    setPending(true);
    try {
      await savePartViewAction(orgSlug, {
        name: name.trim(),
        config: {
          search: search || undefined,
          status: status ? [status] : undefined,
          type: type ? [type] : undefined,
          partGroupId: groupId || null,
        },
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function onLoadView(view: SavedView) {
    const s = view.config.search ?? "";
    const st = view.config.status?.[0] ?? "";
    const ty = view.config.type?.[0] ?? "";
    const g = view.config.partGroupId ?? "";
    setSearch(s);
    setStatus(st);
    setType(ty);
    setGroupId(g);
    applyFilters({ search: s, status: st, type: ty, groupId: g });
  }

  async function onImportFile(file: File) {
    setPending(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const result = await importPartsCsvAction(orgSlug, text);
      setImportMsg(
        `Importerade ${result.created.length} artiklar` +
          (result.errors.length ? ` · ${result.errors.length} fel` : ""),
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-[hsl(210_16%_98%)] p-3">
        <div className="min-w-[12rem] flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Sök</label>
          <Input
            value={search}
            placeholder="Nummer eller benämning…"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />
        </div>
        <div className="w-36 space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Alla</option>
            {Object.entries(PART_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40 space-y-1">
          <label className="text-xs text-muted-foreground">Typ</label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Alla</option>
            {Object.entries(PART_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44 space-y-1">
          <label className="text-xs text-muted-foreground">Varugrupp</label>
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">Alla</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.code} — {g.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={() => applyFilters()} disabled={pending}>
          Filtrera
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onSaveView()}
          disabled={pending}
        >
          Spara vy
        </Button>
        <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-input px-3 text-sm hover:bg-accent">
          Importera CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {savedViews.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Sparade vyer:</span>
          {savedViews.map((v) => (
            <div key={v.id} className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                onClick={() => onLoadView(v)}
              >
                {v.name}
              </button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive"
                title="Ta bort"
                onClick={() => {
                  void deleteSavedViewAction(orgSlug, v.id).then(() =>
                    router.refresh(),
                  );
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {importMsg ? (
        <p className="text-sm text-muted-foreground">{importMsg}</p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(210_14%_96%)] text-left text-xs tracking-wide text-muted-foreground uppercase">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  Inga artiklar matchar filtret.{" "}
                  <Link
                    href={`/${orgSlug}/artiklar/ny`}
                    className="text-primary hover:underline"
                  >
                    Skapa den första
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border hover:bg-accent/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {initialParts.length} artiklar · CSV-mall:
        partNumber,description,unit,type,status
      </p>
    </div>
  );
}
