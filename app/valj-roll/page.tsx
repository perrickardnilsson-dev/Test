import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { RoleForm } from "./role-form";

export default async function ValjRollPage() {
  const profile = await getProfile();
  if (!profile) redirect("/logga-in");
  if (profile.onboarded !== false) {
    redirect(profile.role === "teacher" ? "/larare" : "/elev");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-6 flex items-center gap-2 font-semibold text-lg">
        <GraduationCap className="h-6 w-6 text-primary" />
        NO-provplattform
      </div>
      <RoleForm initialName={profile.name} />
    </div>
  );
}
