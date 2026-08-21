import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, MonitorPlay } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubjectBadge } from "@/components/subject-badge";
import { EXAM_STATUS_LABELS } from "@/lib/constants";
import type {
  Class,
  Exam,
  ExamQuestion,
  QuestionBankItem,
} from "@/lib/types";
import { ExamSettingsForm } from "./exam-settings-form";
import { ExamQuestionsManager } from "./exam-questions-manager";
import { PublishBar } from "./publish-bar";
import { DuplicateExamDialog } from "./duplicate-exam-dialog";

export type ExamQuestionWithBank = ExamQuestion & {
  question_bank: QuestionBankItem;
};

const STATUS_VARIANT = {
  utkast: "secondary",
  publicerat: "default",
  rattat: "success",
} as const;

export default async function ExamDetailPage({
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

  const examQuestions = ((eqData as ExamQuestionWithBank[]) ?? []).filter(
    (eq) => eq.question_bank,
  );

  // Bankfrågor i samma ämne som inte redan är med.
  const usedIds = examQuestions.map((eq) => eq.question_id);
  const { data: bankData } = await supabase
    .from("question_bank")
    .select("*")
    .eq("amne", exam.classes.amne);
  const availableQuestions = ((bankData as QuestionBankItem[]) ?? []).filter(
    (q) => !usedIds.includes(q.id),
  );

  const totalPoints = examQuestions.reduce((sum, eq) => sum + eq.poang, 0);
  const isDraft = exam.status === "utkast";

  // Lärarens klasser för "Duplicera till klass".
  const { data: classesData } = await supabase
    .from("classes")
    .select("id, name, amne, arskurs")
    .order("created_at");
  const teacherClasses =
    (classesData as Pick<Class, "id" | "name" | "amne" | "arskurs">[]) ?? [];

  return (
    <div className="space-y-6 pb-24">
      <Link
        href="/larare/prov"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Alla prov
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{exam.titel}</h1>
            <Badge variant={STATUS_VARIANT[exam.status]}>
              {EXAM_STATUS_LABELS[exam.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <SubjectBadge subject={exam.classes.amne} />
            <span>
              {exam.classes.name} · åk {exam.classes.arskurs}
            </span>
            <span>
              · {examQuestions.length} frågor · {totalPoints} p totalt
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <DuplicateExamDialog
            examId={exam.id}
            currentClassId={exam.class_id}
            currentSubject={exam.classes.amne}
            classes={teacherClasses}
          />
          {exam.status !== "utkast" && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/larare/prov/${exam.id}/overvakning`}>
                  <MonitorPlay className="h-4 w-4" /> Pågående prov
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/larare/prov/${exam.id}/rattning`}>
                  <ClipboardCheck className="h-4 w-4" /> Rättning &amp; resultat
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {isDraft && <ExamSettingsForm exam={exam} />}

      <ExamQuestionsManager
        examId={exam.id}
        isDraft={isDraft}
        questions={examQuestions}
        availableQuestions={availableQuestions}
      />

      {isDraft && (
        <PublishBar examId={exam.id} questionCount={examQuestions.length} />
      )}
    </div>
  );
}
