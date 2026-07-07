import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubjectBadge } from "@/components/subject-badge";
import { EXAM_STATUS_LABELS } from "@/lib/constants";
import type { Class, Exam, Invitation, Profile } from "@/lib/types";
import { ClassCodeCard } from "./class-code-card";
import { InviteManager } from "./invite-manager";
import { MembersList } from "./members-list";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: klass } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (!klass) notFound();
  const cls = klass as Class;

  const [{ data: members }, { data: invitations }, { data: exams }] =
    await Promise.all([
      supabase
        .from("class_members")
        .select("student_id, joined_at, profiles(id, name, email)")
        .eq("class_id", id),
      supabase
        .from("invitations")
        .select("*")
        .eq("class_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("exams")
        .select("*")
        .eq("class_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const memberList =
    (members as unknown as {
      student_id: string;
      joined_at: string;
      profiles: Pick<Profile, "id" | "name" | "email">;
    }[]) ?? [];
  const invitationList = (invitations as Invitation[]) ?? [];
  const examList = (exams as Exam[]) ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/larare/klasser"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Alla klasser
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{cls.name}</h1>
            <SubjectBadge subject={cls.amne} />
          </div>
          <p className="text-muted-foreground">Årskurs {cls.arskurs}</p>
        </div>
        <Button asChild>
          <Link href={`/larare/prov/nytt?klass=${cls.id}`}>Skapa prov</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MembersList classId={cls.id} members={memberList} />

          <Card>
            <CardHeader>
              <CardTitle>Prov för klassen</CardTitle>
              <CardDescription>
                Prov som skapats för {cls.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {examList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Inga prov ännu.
                </p>
              ) : (
                examList.map((e) => (
                  <Link
                    key={e.id}
                    href={`/larare/prov/${e.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50"
                  >
                    <span className="font-medium">{e.titel}</span>
                    <span className="text-xs text-muted-foreground">
                      {EXAM_STATUS_LABELS[e.status]}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ClassCodeCard code={cls.class_code} />
          <InviteManager classId={cls.id} invitations={invitationList} />
        </div>
      </div>
    </div>
  );
}
