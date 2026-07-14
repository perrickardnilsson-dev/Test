"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emailEnabled, sendInvitationEmail } from "@/lib/email";
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

/** Sparar (upsertar) lärarens omdömesunderlag för en elev i en klass. */
export async function saveStudentReport(
  classId: string,
  studentId: string,
  innehall: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  const { error } = await supabase.from("student_reports").upsert(
    {
      class_id: classId,
      student_id: studentId,
      teacher_id: user.id,
      innehall,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "class_id,student_id" },
  );
  if (error) return { error: error.message };
  revalidatePath(`/larare/klasser/${classId}/omdomen`);
  return { success: true };
}

/**
 * Importerar en hel elevlista: skapar inbjudningar för alla nya adresser
 * och hoppar över dem som redan är inbjudna eller medlemmar.
 */
export async function importInvitations(classId: string, emails: string[]) {
  const supabase = await createClient();

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const unique = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase())),
  ).filter((e) => emailRe.test(e));
  if (unique.length === 0) {
    return { error: "Inga giltiga e-postadresser i listan" };
  }

  const [{ data: existingInv }, { data: membersData }] = await Promise.all([
    supabase.from("invitations").select("email").eq("class_id", classId),
    supabase
      .from("class_members")
      .select("profiles(email)")
      .eq("class_id", classId),
  ]);
  const taken = new Set<string>([
    ...((existingInv as { email: string }[]) ?? []).map((i) =>
      i.email.toLowerCase(),
    ),
    ...(
      (membersData as unknown as { profiles: { email: string } | null }[]) ??
      []
    )
      .map((m) => m.profiles?.email.toLowerCase())
      .filter((e): e is string => Boolean(e)),
  ]);

  const fresh = unique.filter((e) => !taken.has(e));
  const skipped = unique.length - fresh.length;
  if (fresh.length === 0) {
    return { success: true, created: 0, skipped, emailsSent: 0 };
  }

  const { data: inserted, error } = await supabase
    .from("invitations")
    .insert(fresh.map((email) => ({ class_id: classId, email })))
    .select("email, token");
  if (error) return { error: error.message };

  let emailsSent = 0;
  if (emailEnabled()) {
    const { data: klass } = await supabase
      .from("classes")
      .select("name")
      .eq("id", classId)
      .single();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    for (const row of inserted ?? []) {
      const result = await sendInvitationEmail({
        to: row.email,
        className: klass?.name ?? "din klass",
        inviteUrl: `${baseUrl}/inbjudan/${row.token}`,
      });
      if (result.sent) emailsSent++;
    }
  }

  revalidatePath(`/larare/klasser/${classId}`);
  return { success: true, created: fresh.length, skipped, emailsSent };
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

  // Skicka mejl om e-post är konfigurerat, annars kopierar läraren länken.
  let emailSent = false;
  let emailError: string | undefined;
  if (emailEnabled()) {
    const { data: klass } = await supabase
      .from("classes")
      .select("name")
      .eq("id", classId)
      .single();
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const result = await sendInvitationEmail({
      to: clean,
      className: klass?.name ?? "din klass",
      inviteUrl: `${baseUrl}/inbjudan/${data.token}`,
    });
    emailSent = result.sent;
    emailError = result.error;
  }

  revalidatePath(`/larare/klasser/${classId}`);
  return {
    success: true,
    token: data.token as string,
    emailSent,
    emailError,
  };
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
