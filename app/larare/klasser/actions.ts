"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

function generateClassCode(subject: Subject, arskurs: number): string {
  const prefix = subject.slice(0, 2).toUpperCase();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${arskurs}${rand}`;
}

export async function createClass(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  const name = String(formData.get("name") ?? "").trim();
  const amne = String(formData.get("amne") ?? "") as Subject;
  const arskurs = Number(formData.get("arskurs"));

  if (!name || !amne || !arskurs) {
    return { error: "Fyll i alla fält" };
  }

  // Försök några gånger ifall koden krockar (unik).
  for (let attempt = 0; attempt < 5; attempt++) {
    const class_code = generateClassCode(amne, arskurs);
    const { error } = await supabase.from("classes").insert({
      teacher_id: user.id,
      name,
      amne,
      arskurs,
      class_code,
    });
    if (!error) {
      revalidatePath("/larare/klasser");
      revalidatePath("/larare");
      return { success: true };
    }
    if (!error.message.includes("class_code")) {
      return { error: error.message };
    }
  }
  return { error: "Kunde inte generera unik klasskod, försök igen." };
}

export async function deleteClass(classId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) return { error: error.message };
  revalidatePath("/larare/klasser");
  return { success: true };
}

export async function createInvitation(classId: string, email: string) {
  const supabase = await createClient();
  const clean = email.trim().toLowerCase();
  if (!clean) return { error: "Ange en e-postadress" };

  const { data, error } = await supabase
    .from("invitations")
    .insert({ class_id: classId, email: clean })
    .select("token")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/larare/klasser/${classId}`);
  return { success: true, token: data.token as string };
}

export async function deleteInvitation(invitationId: string, classId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId);
  if (error) return { error: error.message };
  revalidatePath(`/larare/klasser/${classId}`);
  return { success: true };
}

export async function removeMember(classId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId);
  if (error) return { error: error.message };
  revalidatePath(`/larare/klasser/${classId}`);
  return { success: true };
}
