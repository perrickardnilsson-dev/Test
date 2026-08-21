"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Search } from "lucide-react";
import { Button } from "@/core/ui/components/button";
import {
  CommandPalette,
  type CommandItem,
} from "@/core/ui/components/command-palette";
import { cn } from "@/core/ui/utils";
import type { NavEntry } from "@/core/module-registry";

type Props = {
  orgSlug: string;
  orgName: string;
  userEmail: string;
  nav: NavEntry[];
  commands: CommandItem[];
  children: React.ReactNode;
};

export function AppShell({
  orgSlug,
  orgName,
  userEmail,
  nav,
  commands,
  children,
}: Props) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-[hsl(210_16%_97%)] md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Package className="size-4 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{orgName}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {orgSlug}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <Link
            href={`/${orgSlug}`}
            className={cn(
              "block rounded-md px-2 py-1.5 text-sm",
              pathname === `/${orgSlug}`
                ? "bg-accent font-medium text-accent-foreground"
                : "text-foreground hover:bg-accent/60",
            )}
          >
            Översikt
          </Link>
          {nav.map((item) =>
            item.comingSoon ? (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground"
              >
                <span>{item.label}</span>
                <span className="text-[9px] tracking-wide uppercase">Snart</span>
              </div>
            ) : (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-foreground hover:bg-accent/60",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-xs flex-1 justify-start gap-2 text-muted-foreground"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="size-3.5" />
            <span className="truncate">Sök…</span>
            <kbd className="ml-auto hidden rounded border border-border px-1.5 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </Button>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>

      <CommandPalette
        items={commands}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </div>
  );
}
