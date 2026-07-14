import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SubjectBadge } from "@/components/subject-badge";
import type { Attempt, Class, Exam, Profile } from "@/lib/types";
import { MonitorClient } from "./monitor-client";

export default async function MonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: examData } = await supabase
    .from("exams")
    .select("*, classes(id, name, amne, arskurs)")
    .eq("id", id)
    .single();
  if (!examData) notFound();
  const exam = examData as Exam & {
    classes: Pick<Class, "id" | "name" | "amne" | "arskurs">;
  };

  // Alla elever i klassen.
  const { data: membersData } = await supabase
    .from("class_members")
    .select("student_id, profiles(id, name, email)")
    .eq("class_id", exam.class_id);
  const members =
    (membersData as unknown as {
      student_id: string;
      profiles: Pick<Profile, "id" | "name" | "email">;
    }[]) ?? [];

  // Försök + antal besvarade frågor per försök.
  const { data: attemptsData } = await supabase
    .from("attempts")
    .select("*")
    .eq("exam_id", id);
  const attempts = (attemptsData as Attempt[]) ?? [];

  const attemptIds = attempts.map((a) => a.id);
  const { data: answersData } = attemptIds.length
    ? await supabase
        .from("answers")
        .select("attempt_id, svar")
        .in("attempt_id", attemptIds)
    : { data: [] };

  const answeredCount = new Map<string, number>();
  for (const a of (answersData as { attempt_id: string; svar: unknown }[]) ??
    []) {
    const svar = a.svar as { valda_index?: number[]; text?: string } | null;
    const hasContent =
      svar &&
      ((svar.valda_index && svar.valda_index.length > 0) ||
        (svar.text && svar.text.trim().length > 0));
    if (hasContent) {
      answeredCount.set(a.attempt_id, (answeredCount.get(a.attempt_id) ?? 0) + 1);
    }
  }

  const { count: questionCount } = await supabase
    .from("exam_questions")
    .select("*", { count: "exact", head: true })
    .eq("exam_id", id);

  return (
    <div className="space-y-6">
      <Link
        href={`/larare/prov/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tillbaka till provet
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Pågående prov: {exam.titel}</h1>
          <SubjectBadge subject={exam.classes.amne} />
        </div>
        <p className="text-muted-foreground">
          {exam.classes.name} · {members.length} elever i klassen
        </p>
      </div>

      <MonitorClient
        examId={id}
        tidsgransMinuter={exam.tidsgrans_minuter}
        questionCount={questionCount ?? 0}
        members={members}
        attempts={attempts}
        answeredCount={Object.fromEntries(answeredCount)}
      />
    </div>
  );
}
