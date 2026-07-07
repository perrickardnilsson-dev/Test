import { LayoutDashboard, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/elev", label: "Mina prov", icon: LayoutDashboard },
  { href: "/elev/klasser", label: "Mina klasser", icon: Users },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("student");
  return (
    <AppShell profile={profile} nav={NAV} homeHref="/elev">
      {children}
    </AppShell>
  );
}
