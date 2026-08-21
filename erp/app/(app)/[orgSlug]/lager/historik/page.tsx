import Link from "next/link";
import { requireOrgAccess } from "@/modules/inventory/lib/org-context";
import { listStockTransactions } from "@/modules/inventory/services/stock";
import { stockTransactionFilterSchema } from "@/modules/inventory/domain/stock-schemas";

const TYPE_LABELS: Record<string, string> = {
  receipt: "Inleverans",
  issue: "Utleverans",
  transfer: "Flytt",
  adjustment: "Justering",
  count: "Inventering",
  scrap: "Skrot",
};

type Props = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StockHistoryPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);

  const filter = stockTransactionFilterSchema.parse({
    type:
      typeof sp.type === "string" && sp.type.length > 0 ? sp.type : undefined,
    limit: 100,
  });

  const rows = await listStockTransactions(ctx.organizationId, filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Lager · Historik
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Lagertransaktioner
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Oföränderlig huvudbok. Fel rättas med motbokning — rader raderas
            aldrig.
          </p>
        </div>
        <Link
          href={`/${orgSlug}/lager/rorelse`}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ny rörelse
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Typ</span>
          <select
            name="type"
            defaultValue={typeof sp.type === "string" ? sp.type : ""}
            className="flex h-10 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Alla</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
        >
          Filtrera
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(210_14%_96%)] text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">Tid</th>
              <th className="px-3 py-2">Typ</th>
              <th className="px-3 py-2">Artikel</th>
              <th className="px-3 py-2 text-right">Antal</th>
              <th className="px-3 py-2 text-right">Enhetskostnad</th>
              <th className="px-3 py-2">Från</th>
              <th className="px-3 py-2">Till</th>
              <th className="px-3 py-2">Notering</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Inga transaktioner ännu.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.postedAt).toLocaleString("sv-SE")}
                  </td>
                  <td className="px-3 py-2">
                    {TYPE_LABELS[r.type] ?? r.type}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs">{r.partNumber}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {r.partDescription}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {Number(r.quantity).toLocaleString("sv-SE")}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {Number(r.unitCost).toLocaleString("sv-SE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.fromLocationCode ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.toLocationCode ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.note ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
