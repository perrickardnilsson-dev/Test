import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReportDraft } from "@/lib/ai/flows";
import { formatDate } from "@/lib/utils";
import type { Subject } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    classId?: string;
    studentId?: string;
  };
  if (!body.classId || !body.studentId) {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const { data: klass } = await supabase
    .from("classes")
    .select("id, name, amne, arskurs, teacher_id")
    .eq("id", body.classId)
    .single();
  if (!klass || klass.teacher_id !== user.id) {
    return NextResponse.json({ error: "Klassen hittades inte" }, { status: 404 });
  }

  const { data: student } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", body.studentId)
    .single();
  if (!student) {
    return NextResponse.json({ error: "Eleven hittades inte" }, { status: 404 });
  }

  // Alla rättade prov i klassen, kronologiskt.
  const { data: examsData } = await supabase
    .from("exams")
    .select("id, titel, created_at")
    .eq("class_id", body.classId)
    .eq("status", "rattat")
    .order("created_at");
  const exams =
    (examsData as { id: string; titel: string; created_at: string }[]) ?? [];
  if (exams.length === 0) {
    return NextResponse.json(
      { error: "Inga rättade prov i klassen ännu." },
      { status: 400 },
    );
  }

  const examIds = exams.map((e) => e.id);
  const [{ data: eqData }, { data: attemptsData }] = await Promise.all([
    supabase
      .from("exam_questions")
      .select("id, exam_id, poang, question_bank(centralt_innehall)")
      .in("exam_id", examIds),
    supabase
      .from("attempts")
      .select("id, exam_id")
      .in("exam_id", examIds)
      .eq("student_id", body.studentId)
      .not("inlamnad", "is", null),
  ]);

  const eqs =
    (eqData as unknown as {
      id: string;
      exam_id: string;
      poang: number;
      question_bank: { centralt_innehall: string };
    }[]) ?? [];
  const attempts = (attemptsData as { id: string; exam_id: string }[]) ?? [];
  if (attempts.length === 0) {
    return NextResponse.json(
      { error: "Eleven har inte lämnat in något rättat prov ännu." },
      { status: 400 },
    );
  }

  const attemptIds = attempts.map((a) => a.id);
  const { data: answersData } = await supabase
    .from("answers")
    .select("id, attempt_id, exam_question_id")
    .in("attempt_id", attemptIds);
  const answers =
    (answersData as {
      id: string;
      attempt_id: string;
      exam_question_id: string;
    }[]) ?? [];

  const answerIds = answers.map((a) => a.id);
  const { data: gradingsData } = answerIds.length
    ? await supabase
        .from("gradings")
        .select("answer_id, auto_poang, larare_poang")
        .in("answer_id", answerIds)
    : { data: [] };
  const gradingByAnswer = new Map(
    (
      (gradingsData as {
        answer_id: string;
        auto_poang: number | null;
        larare_poang: number | null;
      }[]) ?? []
    ).map((g) => [g.answer_id, g]),
  );
  const answerByKey = new Map(
    answers.map((a) => [`${a.attempt_id}:${a.exam_question_id}`, a]),
  );
  const attemptByExam = new Map(attempts.map((a) => [a.exam_id, a]));

  function points(attemptId: string, eqId: string): number {
    const ans = answerByKey.get(`${attemptId}:${eqId}`);
    if (!ans) return 0;
    const g = gradingByAnswer.get(ans.id);
    return Number(g?.larare_poang ?? g?.auto_poang ?? 0);
  }

  // Rad per prov + samlat per arbetsområde.
  const provrader: string[] = [];
  const perOmrade = new Map<string, { earned: number; max: number }>();

  for (const exam of exams) {
    const attempt = attemptByExam.get(exam.id);
    const qs = eqs.filter((q) => q.exam_id === exam.id);
    if (!attempt) {
      provrader.push(`- ${exam.titel} (${formatDate(exam.created_at)}): deltog ej`);
      continue;
    }
    let earned = 0;
    let max = 0;
    for (const q of qs) {
      const p = points(attempt.id, q.id);
      earned += p;
      max += q.poang;
      const ci = q.question_bank?.centralt_innehall ?? "Övrigt";
      const entry = perOmrade.get(ci) ?? { earned: 0, max: 0 };
      entry.earned += p;
      entry.max += q.poang;
      perOmrade.set(ci, entry);
    }
    const share = max ? Math.round((earned / max) * 100) : 0;
    provrader.push(
      `- ${exam.titel} (${formatDate(exam.created_at)}): ${earned}/${max} poäng (${share} %)`,
    );
  }

  const omradesrader = Array.from(perOmrade.entries())
    .filter(([, v]) => v.max > 0)
    .map(
      ([ci, v]) =>
        `- ${ci}: ${v.earned}/${v.max} poäng (${Math.round((v.earned / v.max) * 100)} %)`,
    );
  if (omradesrader.length === 0) {
    return NextResponse.json(
      { error: "Eleven har inte lämnat in något rättat prov ännu." },
      { status: 400 },
    );
  }

  try {
    const draft = await generateReportDraft({
      elevnamn: student.name,
      amne: klass.amne as Subject,
      arskurs: klass.arskurs as number,
      provrader,
      omradesrader,
    });
    return NextResponse.json({ success: true, draft });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "AI-genereringen misslyckades",
      },
      { status: 500 },
    );
  }
}
