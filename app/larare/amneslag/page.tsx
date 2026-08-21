import { UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { School } from "@/lib/types";
import { CreateOrJoinSchool, SchoolCodeCard, LeaveSchoolButton } from "./school-client";

export default async function AmneslagPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  let school: School | null = null;
  let members: { id: string; name: string; email: string }[] = [];
  let sharedCounts = new Map<string, number>();

  if (profile.school_id) {
    const [{ data: schoolData }, { data: membersData }, { data: sharedData }] =
      await Promise.all([
        supabase
          .from("schools")
          .select("*")
          .eq("id", profile.school_id)
          .single(),
        supabase.rpc("get_school_members"),
        supabase
          .from("question_bank")
          .select("owner_id")
          .eq("delad", true)
          .not("owner_id", "is", null),
      ]);
    school = (schoolData as School) ?? null;
    members =
      (membersData as { id: string; name: string; email: string }[]) ?? [];
    sharedCounts = new Map();
    for (const q of (sharedData as { owner_id: string }[]) ?? []) {
      sharedCounts.set(q.owner_id, (sharedCounts.get(q.owner_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ämneslag</h1>
        <p className="text-muted-foreground">
          Gå ihop med kollegorna på skolan och dela frågor med varandra i
          frågebanken.
        </p>
      </div>

      {!school ? (
        <CreateOrJoinSchool />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound className="h-5 w-5" /> {school.name}
                </CardTitle>
                <CardDescription>
                  {members.length}{" "}
                  {members.length === 1 ? "medlem" : "medlemmar"} i ämneslaget
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div>
                      <div className="font-medium">
                        {m.name}
                        {m.id === profile.id && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (du)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {m.email}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {sharedCounts.get(m.id) ?? 0} delade frågor
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Så fungerar delningen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Markera en fråga som <strong>delad</strong> i frågebanken så
                  blir den synlig och användbar för alla i ämneslaget – i deras
                  frågebank och när de genererar prov.
                </p>
                <p>
                  Dina frågor förblir dina: bara du kan redigera eller ta bort
                  dem, och du kan sluta dela en fråga när som helst. Lämnar du
                  ämneslaget slutar dina delade frågor synas för kollegorna.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <SchoolCodeCard code={school.school_code} />
            <LeaveSchoolButton schoolName={school.name} />
          </div>
        </div>
      )}
    </div>
  );
}
