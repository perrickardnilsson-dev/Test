"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/core/ui/components/input";

export type CommandItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  comingSoon?: boolean;
};

type Props = {
  items: CommandItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ items, open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.label.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
    );
  });

  const groups = [...new Set(filtered.map((i) => i.group))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 px-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Stäng"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kommandopalett"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-border bg-background shadow-lg"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök vyer och åtgärder…"
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">
              Inga träffar
            </li>
          ) : (
            groups.map((group) => (
              <li key={group} className="mb-2">
                <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {group}
                </p>
                <ul>
                  {filtered
                    .filter((i) => i.group === group)
                    .map((item) => (
                      <li key={item.id}>
                        {item.comingSoon ? (
                          <div className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-muted-foreground">
                            <span>{item.label}</span>
                            <span className="text-[10px] tracking-wide uppercase">
                              Kommer snart
                            </span>
                          </div>
                        ) : (
                          <Link
                            href={item.href}
                            className="flex rounded-md px-2 py-2 text-sm hover:bg-accent"
                            onClick={(e) => {
                              e.preventDefault();
                              onOpenChange(false);
                              router.push(item.href);
                            }}
                          >
                            {item.label}
                          </Link>
                        )}
                      </li>
                    ))}
                </ul>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
