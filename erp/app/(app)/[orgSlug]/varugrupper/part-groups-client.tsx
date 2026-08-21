"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import { Select } from "@/core/ui/components/select";
import { createPartGroupAction } from "@/modules/inventory/actions";

type Group = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
};

type Props = {
  orgSlug: string;
  groups: Group[];
};

export function PartGroupsClient({ orgSlug, groups }: Props) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [parentId, setParentId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createPartGroupAction(orgSlug, {
        code,
        name,
        parentId: parentId || null,
      });
      setCode("");
      setName("");
      setParentId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skapa grupp");
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
              <th className="px-3 py-2">Överordnad</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Inga varugrupper ännu.
                </td>
              </tr>
            ) : (
              groups.map((g) => {
                const parent = groups.find((p) => p.id === g.parentId);
                return (
                  <tr key={g.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{g.code}</td>
                    <td className="px-3 py-2">{g.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {parent ? `${parent.code} — ${parent.name}` : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={onSubmit}
        className="h-fit space-y-3 rounded-lg border border-border p-4"
      >
        <h2 className="text-sm font-semibold">Ny varugrupp</h2>
        <div className="space-y-2">
          <Label htmlFor="code">Kod</Label>
          <Input
            id="code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Namn</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentId">Överordnad</Label>
          <Select
            id="parentId"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">— Ingen —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.code} — {g.name}
              </option>
            ))}
          </Select>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sparar…" : "Skapa grupp"}
        </Button>
      </form>
    </div>
  );
}
