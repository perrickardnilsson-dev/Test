import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SubjectBadge } from "@/components/subject-badge";
import type {
  Answer,
  Attempt,
  Class,
  Exam,
  ExamQuestion,
  Grading,
  Profile,
  QuestionBankItem,
} from "@/lib/types";
import { RattningClient } from "./rattning-client";

export type EQWithBank = ExamQuestion & { question_bank: QuestionBankItem };

export default async function RattningPage({
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

  const { data: eqData } = await supabase
    .from("exam_questions")
    .select("*, question_bank(*)")
    .eq("exam_id", id)
    .order("ordning");
  const examQuestions = (eqData as EQWithBank[]) ?? [];

  const { data: attemptsData } = await supabase
    .from("attempts")
    .select("*, profiles(id, name, email)")
    .eq("exam_id", id)
    .not("inlamnad", "is", null);
  const attempts =
    (attemptsData as (Attempt & {
      profiles: Pick<Profile, "id" | "name" | "email">;
    })[]) ?? [];

  const attemptIds = attempts.map((a) => a.id);

  const { data: answersData } = attemptIds.length
    ? await supabase
        .from("answers")
        .select("*")
        .in("attempt_id", attemptIds)
    : { data: [] };
  const answers = (answersData as Answer[]) ?? [];

  const answerIds = answers.map((a) => a.id);
  const { data: gradingsData } = answerIds.length
    ? await supabase.from("gradings").select("*").in("answer_id", answerIds)
    : { data: [] };
  const gradings = (gradingsData as Grading[]) ?? [];

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
          <h1 className="text-2xl font-bold">Rättning: {exam.titel}</h1>
          <SubjectBadge subject={exam.classes.amne} />
        </div>
        <p className="text-muted-foreground">
          {exam.classes.name} · {attempts.length} inlämnade prov
        </p>
      </div>

      {attempts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Inga elever har lämnat in provet ännu.
          </CardContent>
        </Card>
      ) : (
        <RattningClient
          examId={id}
          examTitle={exam.titel}
          examStatus={exam.status}
          examQuestions={examQuestions}
          attempts={attempts}
          answers={answers}
          gradings={gradings}
        />
      )}
    </div>
  );
}
