"use server";

import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function completeOnboarding(
  role: Role,
  name: string,
  classCode: string,
) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("complete_onboarding", {
    p_role: role,
    p_name: name,
  });
  if (error) return { error: error.message };

  let joinWarning: string | undefined;
  if (role === "student" && classCode.trim()) {
    const { error: joinError } = await supabase.rpc("join_class_with_code", {
      p_code: classCode.trim(),
    });
    if (joinError) joinWarning = joinError.message;
  }

  return {
    success: true,
    dest: role === "teacher" ? "/larare" : "/elev",
    joinWarning,
  };
}
