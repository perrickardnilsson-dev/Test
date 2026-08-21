import { headers } from "next/headers";
import { auth } from "@/core/auth/auth";
import { requireSession } from "@/core/auth";

export async function requireOrgAccess(orgSlug: string) {
  const session = await requireSession();
  const orgs = await auth.api.listOrganizations({
    headers: await headers(),
  });
  const org = orgs.find((o) => o.slug === orgSlug);
  if (!org) {
    throw new Error("Organisationen hittades inte eller saknar behörighet");
  }
  return {
    session,
    organizationId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    userId: session.user.id,
  };
}
