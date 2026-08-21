"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StudentAnswer } from "@/lib/types";

export async function joinClass(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_class_with_code", {
    p_code: code,
  });
  if (error) return { error: error.message };
  revalidatePath("/elev");
  const row = Array.isArray(data) ? data[0] : null;
  return { success: true, className: row?.class_name as string | undefined };
}

/** Startar (eller återupptar) ett försök på ett prov. */
export async function startAttempt(examId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  const { data: existing } = await supabase
    .from("attempts")
    .select("id, inlamnad")
    .eq("exam_id", examId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    return { success: true, attemptId: existing.id as string };
  }

  const { data, error } = await supabase
    .from("attempts")
    .insert({ exam_id: examId, student_id: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, attemptId: data.id as string };
}

export async function saveAnswer(
  attemptId: string,
  examQuestionId: string,
  svar: StudentAnswer,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("answers").upsert(
    {
      attempt_id: attemptId,
      exam_question_id: examQuestionId,
      svar,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,exam_question_id" },
  );
  if (error) return { error: error.message };
  return { success: true };
}

/** Registrerar att eleven lämnade provfliken (anti-fusk). */
export async function reportFocusLoss(attemptId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_focus_loss", {
    p_attempt_id: attemptId,
  });
  if (error) return { error: error.message };
  return { success: true, count: (data as number) ?? 0 };
}

export async function submitAttempt(attemptId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attempts")
    .update({ inlamnad: new Date().toISOString() })
    .eq("id", attemptId)
    .is("inlamnad", null);
  if (error) return { error: error.message };
  revalidatePath("/elev");
  return { success: true };
}
