"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExamDisplayMode } from "@/lib/types";

export async function updateExamSettings(
  examId: string,
  input: {
    titel: string;
    instruktioner: string | null;
    visningslage: ExamDisplayMode;
    tidsgrans_minuter: number | null;
    oppnar: string | null;
    stanger: string | null;
    slumpa_fragor: boolean;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("exams")
    .update(input)
    .eq("id", examId)
    .eq("status", "utkast");
  if (error) return { error: error.message };
  revalidatePath(`/larare/prov/${examId}`);
  return { success: true };
}

export async function removeExamQuestion(examId: string, examQuestionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_questions")
    .delete()
    .eq("id", examQuestionId);
  if (error) return { error: error.message };
  await renumber(examId);
  revalidatePath(`/larare/prov/${examId}`);
  return { success: true };
}

export async function addExamQuestion(examId: string, questionId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("exam_questions")
    .select("ordning, question_id")
    .eq("exam_id", examId);

  if (existing?.some((e) => e.question_id === questionId)) {
    return { error: "Frågan finns redan i provet" };
  }

  const { data: q } = await supabase
    .from("question_bank")
    .select("poang")
    .eq("id", questionId)
    .single();

  const nextOrder =
    (existing?.reduce((max, e) => Math.max(max, e.ordning), 0) ?? 0) + 1;

  const { error } = await supabase.from("exam_questions").insert({
    exam_id: examId,
    question_id: questionId,
    ordning: nextOrder,
    poang: q?.poang ?? 1,
  });
  if (error) return { error: error.message };
  revalidatePath(`/larare/prov/${examId}`);
  return { success: true };
}

export async function updateExamQuestionPoints(
  examId: string,
  examQuestionId: string,
  poang: number,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_questions")
    .update({ poang: Math.max(1, poang) })
    .eq("id", examQuestionId);
  if (error) return { error: error.message };
  revalidatePath(`/larare/prov/${examId}`);
  return { success: true };
}

export async function publishExam(examId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("exam_questions")
    .select("*", { count: "exact", head: true })
    .eq("exam_id", examId);

  if (!count || count === 0) {
    return { error: "Provet måste innehålla minst en fråga" };
  }

  const { error } = await supabase
    .from("exams")
    .update({ status: "publicerat" })
    .eq("id", examId)
    .eq("status", "utkast");
  if (error) return { error: error.message };
  revalidatePath(`/larare/prov/${examId}`);
  revalidatePath("/larare/prov");
  return { success: true };
}

/**
 * Duplicerar ett prov (med alla frågor) som nytt utkast, till samma eller en
 * annan klass. Tidsfönstret nollställs eftersom det gäller ett nytt tillfälle.
 */
export async function duplicateExam(examId: string, targetClassId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .single();
  if (!exam) return { error: "Provet hittades inte" };

  const { data: targetClass } = await supabase
    .from("classes")
    .select("id")
    .eq("id", targetClassId)
    .single();
  if (!targetClass) return { error: "Klassen hittades inte" };

  const { data: newExam, error: examErr } = await supabase
    .from("exams")
    .insert({
      class_id: targetClassId,
      teacher_id: user.id,
      titel:
        targetClassId === exam.class_id ? `${exam.titel} (kopia)` : exam.titel,
      instruktioner: exam.instruktioner,
      visningslage: exam.visningslage,
      tidsgrans_minuter: exam.tidsgrans_minuter,
      slumpa_fragor: exam.slumpa_fragor,
      oppnar: null,
      stanger: null,
      status: "utkast",
    })
    .select("id")
    .single();
  if (examErr || !newExam) {
    return { error: examErr?.message ?? "Kunde inte skapa kopian" };
  }

  const { data: questions } = await supabase
    .from("exam_questions")
    .select("question_id, ordning, poang")
    .eq("exam_id", examId)
    .order("ordning");

  if (questions && questions.length > 0) {
    const { error: eqErr } = await supabase.from("exam_questions").insert(
      questions.map((q) => ({
        exam_id: newExam.id,
        question_id: q.question_id,
        ordning: q.ordning,
        poang: q.poang,
      })),
    );
    if (eqErr) return { error: eqErr.message };
  }

  revalidatePath("/larare/prov");
  return { success: true, examId: newExam.id as string };
}

export async function deleteExam(examId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("exams").delete().eq("id", examId);
  if (error) return { error: error.message };
  revalidatePath("/larare/prov");
  return { success: true };
}

export async function updateGrading(
  examId: string,
  gradingId: string,
  input: {
    larare_poang: number;
    larare_kommentar: string | null;
    status: "vantar" | "godkand";
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("gradings")
    .update({
      larare_poang: input.larare_poang,
      larare_kommentar: input.larare_kommentar,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gradingId);
  if (error) return { error: error.message };
  revalidatePath(`/larare/prov/${examId}/rattning`);
  return { success: true };
}

/**
 * Godkänner alla rättningar som väntar och har ett AI-förslag:
 * AI-poängen blir lärarpoäng där läraren inte redan satt något.
 */
export async function approveAllPendingGradings(examId: string) {
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id")
    .eq("exam_id", examId);
  const attemptIds = (attempts ?? []).map((a) => a.id);
  if (attemptIds.length === 0) return { success: true, approved: 0 };

  const { data: answers } = await supabase
    .from("answers")
    .select("id")
    .in("attempt_id", attemptIds);
  const answerIds = (answers ?? []).map((a) => a.id);
  if (answerIds.length === 0) return { success: true, approved: 0 };

  const { data: pending } = await supabase
    .from("gradings")
    .select("id, larare_poang, ai_forslag_poang")
    .in("answer_id", answerIds)
    .eq("status", "vantar")
    .not("ai_forslag_poang", "is", null);

  let approved = 0;
  for (const g of pending ?? []) {
    const { error } = await supabase
      .from("gradings")
      .update({
        status: "godkand",
        larare_poang: g.larare_poang ?? g.ai_forslag_poang,
        updated_at: new Date().toISOString(),
      })
      .eq("id", g.id);
    if (!error) approved++;
  }

  revalidatePath(`/larare/prov/${examId}/rattning`);
  return { success: true, approved };
}

/** Återöppnar ett inlämnat försök så att eleven kan fortsätta. */
export async function reopenAttempt(examId: string, attemptId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attempts")
    .update({ inlamnad: null })
    .eq("id", attemptId)
    .eq("exam_id", examId);
  if (error) return { error: error.message };
  revalidatePath(`/larare/prov/${examId}/overvakning`);
  return { success: true };
}

/** Ger en enskild elev förlängd tid (läggs på tidsgräns och stängningstid). */
export async function extendAttemptTime(
  examId: string,
  attemptId: string,
  extraMinuter: number,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attempts")
    .update({ extra_minuter: Math.max(0, Math.round(extraMinuter)) })
    .eq("id", attemptId)
    .eq("exam_id", examId);
  if (error) return { error: error.message };
  revalidatePath(`/larare/prov/${examId}/overvakning`);
  return { success: true };
}

export async function publishResults(examId: string) {
  const supabase = await createClient();

  // Godkänn eventuella kvarvarande rättningar (t.ex. flerval) automatiskt
  // genom att sätta provet till "rättat".
  const { error } = await supabase
    .from("exams")
    .update({ status: "rattat" })
    .eq("id", examId);
  if (error) return { error: error.message };
  revalidatePath(`/larare/prov/${examId}`);
  revalidatePath(`/larare/prov/${examId}/rattning`);
  revalidatePath("/larare/prov");
  return { success: true };
}

async function renumber(examId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_questions")
    .select("id")
    .eq("exam_id", examId)
    .order("ordning");
  if (!data) return;
  await Promise.all(
    data.map((row, i) =>
      supabase.from("exam_questions").update({ ordning: i + 1 }).eq("id", row.id),
    ),
  );
}
