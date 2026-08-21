import { redirect } from "next/navigation";
import { getSession } from "@/core/auth";
import { bootstrapModules } from "@/core/module-registry/bootstrap";
import {
  buildCommandItems,
  buildNavigation,
} from "@/core/module-registry";
import { AppShell } from "@/core/ui/components/app-shell";
import { auth } from "@/core/auth/auth";
import { headers } from "next/headers";

type Props = {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
};

export default async function OrgLayout({ children, params }: Props) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session) {
    redirect("/logga-in");
  }

  const orgs = await auth.api.listOrganizations({
    headers: await headers(),
  });
  const org = orgs.find((o) => o.slug === orgSlug);
  if (!org) {
    redirect("/skapa-organisation");
  }

  bootstrapModules();
  const nav = buildNavigation(orgSlug);
  const commands = buildCommandItems(orgSlug);

  return (
    <AppShell
      orgSlug={orgSlug}
      orgName={org.name}
      userEmail={session.user.email}
      nav={nav}
      commands={commands}
    >
      {children}
    </AppShell>
  );
}
