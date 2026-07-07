import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeFreeText } from "@/lib/ai/flows";
import { autoScore, facitToText, svarToText } from "@/lib/grading";
import type {
  Facit,
  QuestionBankItem,
  QuestionType,
  StudentAnswer,
} from "@/lib/types";

export const maxDuration = 300;

type AnswerRow = {
  id: string;
  svar: StudentAnswer;
  exam_questions: {
    poang: number;
    question_bank: Pick<
      QuestionBankItem,
      "fragetyp" | "fragetext" | "alternativ" | "facit" | "bedomningsanvisning"
    >;
  };
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const { data: exam } = await supabase
    .from("exams")
    .select("id, teacher_id")
    .eq("id", examId)
    .single();
  if (!exam || exam.teacher_id !== user.id) {
    return NextResponse.json({ error: "Provet hittades inte" }, { status: 404 });
  }

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id")
    .eq("exam_id", examId)
    .not("inlamnad", "is", null);

  const attemptIds = (attempts ?? []).map((a) => a.id);
  if (attemptIds.length === 0) {
    return NextResponse.json({
      success: true,
      graded: 0,
      message: "Inga inlämnade prov att rätta ännu.",
    });
  }

  const { data: answersData } = await supabase
    .from("answers")
    .select(
      "id, svar, exam_questions!inner(poang, question_bank!inner(fragetyp, fragetext, alternativ, facit, bedomningsanvisning))",
    )
    .in("attempt_id", attemptIds);

  const answers = (answersData as unknown as AnswerRow[]) ?? [];

  // Befintliga rättningar för att undvika onödiga AI-anrop.
  const { data: existingGradings } = await supabase
    .from("gradings")
    .select("answer_id, ai_motivering")
    .in(
      "answer_id",
      answers.map((a) => a.id),
    );
  const gradedWithAi = new Set(
    (existingGradings ?? [])
      .filter((g) => g.ai_motivering != null)
      .map((g) => g.answer_id),
  );

  let graded = 0;
  let aiErrors = 0;

  for (const ans of answers) {
    const q = ans.exam_questions.question_bank;
    const facit = q.facit as Facit;
    const maxPoang = ans.exam_questions.poang;
    const type = q.fragetyp as QuestionType;

    if (type === "flerval_ett" || type === "flerval_flera") {
      const auto = autoScore(facit, ans.svar, maxPoang);
      await supabase.from("gradings").upsert(
        {
          answer_id: ans.id,
          auto_poang: auto,
          larare_poang: auto,
          ai_forslag_poang: null,
          ai_niva: null,
          ai_motivering: null,
          status: "godkand",
        },
        { onConflict: "answer_id" },
      );
      graded++;
      continue;
    }

    // Kortsvar och fritext: AI-förslag som läraren granskar.
    if (gradedWithAi.has(ans.id)) continue;

    try {
      const suggestion = await gradeFreeText({
        fragetext: q.fragetext,
        maxPoang,
        facit: facitToText(facit),
        bedomningsanvisning: q.bedomningsanvisning,
        elevsvar: svarToText(ans.svar, q.alternativ),
      });
      const poang = Math.min(maxPoang, Math.max(0, suggestion.poang));
      await supabase.from("gradings").upsert(
        {
          answer_id: ans.id,
          auto_poang: null,
          ai_forslag_poang: poang,
          ai_niva: suggestion.niva,
          ai_motivering: suggestion.motivering,
          status: "vantar",
        },
        { onConflict: "answer_id" },
      );
      graded++;
    } catch {
      aiErrors++;
    }
  }

  return NextResponse.json({
    success: true,
    graded,
    aiErrors,
    attempts: attemptIds.length,
  });
}
