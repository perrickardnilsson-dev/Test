"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSchool(name: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_school", {
    p_name: name,
  });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : null;
  revalidatePath("/larare/amneslag");
  return { success: true, schoolName: row?.school_name as string | undefined };
}

export async function joinSchool(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_school_with_code", {
    p_code: code.trim(),
  });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : null;
  revalidatePath("/larare/amneslag");
  return { success: true, schoolName: row?.school_name as string | undefined };
}

export async function leaveSchool() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_school");
  if (error) return { error: error.message };
  revalidatePath("/larare/amneslag");
  return { success: true };
}

export async function toggleQuestionShared(questionId: string, delad: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("question_bank")
    .update({ delad })
    .eq("id", questionId);
  if (error) return { error: error.message };
  revalidatePath("/larare/fragebank");
  return { success: true };
}
