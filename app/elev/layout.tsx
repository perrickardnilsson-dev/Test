import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/elev", label: "Mina prov", icon: "overview" },
  { href: "/elev/klasser", label: "Mina klasser", icon: "classes" },
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

export const dynamic = "force-dynamic";
