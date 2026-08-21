import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/larare", label: "Översikt", icon: "overview" },
  { href: "/larare/klasser", label: "Klasser", icon: "users" },
  { href: "/larare/fragebank", label: "Frågebank", icon: "library" },
  { href: "/larare/prov", label: "Prov", icon: "exams" },
  { href: "/larare/amneslag", label: "Ämneslag", icon: "teams" },
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
