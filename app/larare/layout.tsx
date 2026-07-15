import {
  LayoutDashboard,
  Library,
  FileText,
  Users,
  UsersRound,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/larare", label: "Översikt", icon: LayoutDashboard },
  { href: "/larare/klasser", label: "Klasser", icon: Users },
  { href: "/larare/fragebank", label: "Frågebank", icon: Library },
  { href: "/larare/prov", label: "Prov", icon: FileText },
  { href: "/larare/amneslag", label: "Ämneslag", icon: UsersRound },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("teacher");
  return (
    <AppShell profile={profile} nav={NAV} homeHref="/larare">
      {children}
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
