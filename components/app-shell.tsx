"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Users,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Ikonnycklar – måste vara strängar så server-layout kan skicka nav till klienten. */
export type NavIcon =
  | "overview"
  | "users"
  | "library"
  | "exams"
  | "teams"
  | "classes";

const NAV_ICONS: Record<
  NavIcon,
  React.ComponentType<{ className?: string }>
> = {
  overview: LayoutDashboard,
  users: Users,
  library: Library,
  exams: FileText,
  teams: UsersRound,
  classes: Users,
};

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

export function AppShell({
  profile,
  nav,
  children,
  homeHref,
}: {
  profile: Profile;
  nav: NavItem[];
  children: React.ReactNode;
  homeHref: string;
}) {
  const activePath = usePathname();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link
              href={homeHref}
              className="flex items-center gap-2 font-semibold"
            >
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="hidden sm:inline">NO-provplattform</span>
            </Link>
            <nav className="flex items-center gap-1">
              {nav.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                const active =
                  activePath === item.href ||
                  (item.href !== homeHref && activePath.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{profile.name}</div>
              <div className="text-xs text-muted-foreground">
                {profile.role === "teacher" ? "Lärare" : "Elev"}
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="icon" type="submit" title="Logga ut">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
