import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { startAttempt } from "@/app/elev/actions";
import type { Answer, Exam, QuestionType, StudentAnswer } from "@/lib/types";
import { ExamRunner, type RunnerQuestion } from "./exam-runner";

/**
 * Deterministisk blandning utifrån ett frö (attemptId): samma elev får alltid
 * samma ordning, även efter omladdning av sidan.
 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const next = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

  let rawQuestions =
    (questionsData as
      | {
          exam_question_id: string;
          ordning: number;
          poang: number;
          fragetyp: QuestionType;
          fragetext: string;
          alternativ: string[] | null;
          bild_url: string | null;
        }[]
      | null) ?? [];

  // Slumpad frågeordning per elev (deterministisk utifrån försöket).
  if (exam.slumpa_fragor) {
    rawQuestions = seededShuffle(rawQuestions, attemptId);
  }

  const questions = rawQuestions.map<RunnerQuestion>((q, i) => ({
    examQuestionId: q.exam_question_id,
    ordning: exam.slumpa_fragor ? i + 1 : q.ordning,
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
