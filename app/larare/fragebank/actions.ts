"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractedQuestionSchema } from "@/lib/ai/schemas";
import { z } from "zod";

const saveQuestionSchema = extractedQuestionSchema.extend({
  amne: z.enum(["biologi", "fysik", "kemi", "teknik"]),
  kalla: z.enum(["np", "ai_genererad", "egen"]),
  source_document_id: z.string().uuid().nullable().optional(),
});

export async function saveQuestion(payload: unknown, id?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  const parsed = saveQuestionSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Ogiltiga fält: " + parsed.error.issues[0]?.message };
  }
  const q = parsed.data;

  const row = {
    owner_id: user.id,
    amne: q.amne,
    arskurs: q.arskurs,
    centralt_innehall: q.centralt_innehall,
    fragetyp: q.fragetyp,
    fragetext: q.fragetext,
    alternativ: q.alternativ,
    facit: q.facit,
    bedomningsanvisning: q.bedomningsanvisning,
    niva: q.niva,
    kalla: q.kalla,
    source_document_id: q.source_document_id ?? null,
    poang: q.poang,
  };

  if (id) {
    const { error } = await supabase
      .from("question_bank")
      .update(row)
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("question_bank").insert(row);
    if (error) return { error: error.message };
  }

  revalidatePath("/larare/fragebank");
  return { success: true };
}

export async function deleteQuestion(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("question_bank")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/larare/fragebank");
  return { success: true };
}

/** Sparar granskade frågor från en PDF-tolkning till frågebanken. */
export async function approveExtractedQuestions(
  documentId: string,
  questions: unknown,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  const { data: doc } = await supabase
    .from("source_documents")
    .select("id, amne, teacher_id")
    .eq("id", documentId)
    .single();
  if (!doc || doc.teacher_id !== user.id) {
    return { error: "Dokumentet hittades inte" };
  }

  const listSchema = z.array(extractedQuestionSchema);
  const parsed = listSchema.safeParse(questions);
  if (!parsed.success) {
    return { error: "Ogiltiga frågor: " + parsed.error.issues[0]?.message };
  }

  const rows = parsed.data.map((q) => ({
    owner_id: user.id,
    amne: doc.amne,
    arskurs: q.arskurs,
    centralt_innehall: q.centralt_innehall,
    fragetyp: q.fragetyp,
    fragetext: q.fragetext,
    alternativ: q.alternativ,
    facit: q.facit,
    bedomningsanvisning: q.bedomningsanvisning,
    niva: q.niva,
    kalla: "np" as const,
    source_document_id: documentId,
    poang: q.poang,
  }));

  const { error } = await supabase.from("question_bank").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/larare/fragebank");
  revalidatePath(`/larare/fragebank/dokument/${documentId}`);
  return { success: true, count: rows.length };
}

export async function createSourceDocument(input: {
  title: string;
  amne: string;
  year: number | null;
  storage_path: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  const { data, error } = await supabase
    .from("source_documents")
    .insert({
      teacher_id: user.id,
      title: input.title,
      amne: input.amne,
      year: input.year,
      storage_path: input.storage_path,
      status: "uppladdad",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/larare/fragebank");
  return { success: true, id: data.id as string };
}

export async function deleteDocument(documentId: string, storagePath: string) {
  const supabase = await createClient();
  await supabase.storage.from("np-pdfs").remove([storagePath]);
  const { error } = await supabase
    .from("source_documents")
    .delete()
    .eq("id", documentId);
  if (error) return { error: error.message };
  revalidatePath("/larare/fragebank");
  return { success: true };
}
