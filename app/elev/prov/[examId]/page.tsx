import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { startAttempt } from "@/app/elev/actions";
import type { Answer, Exam, QuestionType, StudentAnswer } from "@/lib/types";
import { ExamRunner, type RunnerQuestion } from "./exam-runner";

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  await requireRole("student");
  const supabase = await createClient();

  const { data: examData } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .single();

  if (!examData) redirect("/elev");
  const exam = examData as Exam;

  const now = Date.now();
  if (exam.oppnar && new Date(exam.oppnar).getTime() > now) redirect("/elev");

  const started = await startAttempt(examId);
  if (started.error || !started.attemptId) redirect("/elev");
  const attemptId = started.attemptId;

  const { data: attempt } = await supabase
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attempt?.inlamnad) {
    redirect("/elev");
  }

  // Förlängd tid för eleven skjuter även fram provets stängning.
  const extraMinutes = attempt?.extra_minuter ?? 0;
  if (
    exam.stanger &&
    new Date(exam.stanger).getTime() + extraMinutes * 60000 < now
  ) {
    redirect("/elev");
  }

  const { data: questionsData } = await supabase.rpc(
    "get_student_exam_questions",
    { p_exam_id: examId },
  );

  const questions = ((questionsData as
    | {
        exam_question_id: string;
        ordning: number;
        poang: number;
        fragetyp: QuestionType;
        fragetext: string;
        alternativ: string[] | null;
        bild_url: string | null;
      }[]
    | null) ?? []).map<RunnerQuestion>((q) => ({
    examQuestionId: q.exam_question_id,
    ordning: q.ordning,
    poang: q.poang,
    fragetyp: q.fragetyp,
    fragetext: q.fragetext,
    alternativ: q.alternativ,
    bildUrl: q.bild_url,
  }));

  const { data: answersData } = await supabase
    .from("answers")
    .select("exam_question_id, svar")
    .eq("attempt_id", attemptId);

  const initialAnswers: Record<string, StudentAnswer> = {};
  ((answersData as Pick<Answer, "exam_question_id" | "svar">[]) ?? []).forEach(
    (a) => {
      initialAnswers[a.exam_question_id] = a.svar;
    },
  );

  return (
    <ExamRunner
      exam={{
        id: exam.id,
        titel: exam.titel,
        instruktioner: exam.instruktioner,
        visningslage: exam.visningslage,
        tidsgrans_minuter: exam.tidsgrans_minuter,
      }}
      attemptId={attemptId}
      startedAt={attempt?.startad ?? new Date().toISOString()}
      extraMinutes={extraMinutes}
      questions={questions}
      initialAnswers={initialAnswers}
    />
  );
}
