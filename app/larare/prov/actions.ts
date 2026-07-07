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

export async function deleteExam(examId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("exams").delete().eq("id", examId);
  if (error) return { error: error.message };
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
