import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateQuestions } from "@/lib/ai/flows";
import type { QuestionBankItem, QuestionType, Subject } from "@/lib/types";

export const maxDuration = 300;

const bodySchema = z.object({
  classId: z.string().uuid(),
  titel: z.string().min(1),
  instruktioner: z.string().nullable().optional(),
  centralt_innehall: z.array(z.string()).min(1),
  niva: z.enum(["E", "C", "A"]),
  fragetyper: z
    .array(z.enum(["flerval_ett", "flerval_flera", "kortsvar", "fritext"]))
    .min(1),
  antal_bank: z.number().int().min(0),
  antal_ai: z.number().int().min(0),
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltiga fält: " + parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const { data: klass } = await supabase
    .from("classes")
    .select("*")
    .eq("id", body.classId)
    .single();
  if (!klass || klass.teacher_id !== user.id) {
    return NextResponse.json({ error: "Klassen hittades inte" }, { status: 404 });
  }
  const amne = klass.amne as Subject;
  const arskurs = klass.arskurs as number;

  // 1. Välj bankfrågor som matchar ämne, årskurs, valt innehåll och frågetyp.
  const chosenQuestionIds: string[] = [];
  if (body.antal_bank > 0) {
    const { data: bank } = await supabase
      .from("question_bank")
      .select("*")
      .eq("amne", amne)
      .in("fragetyp", body.fragetyper);

    const candidates = ((bank as QuestionBankItem[]) ?? []).filter(
      (q) =>
        Math.abs(q.arskurs - arskurs) <= 1 &&
        body.centralt_innehall.some(
          (ci) =>
            q.centralt_innehall.toLowerCase().includes(ci.toLowerCase()) ||
            ci.toLowerCase().includes(q.centralt_innehall.toLowerCase()),
        ),
    );
    const pool = candidates.length > 0 ? candidates : (bank as QuestionBankItem[]) ?? [];
    chosenQuestionIds.push(
      ...shuffle(pool).slice(0, body.antal_bank).map((q) => q.id),
    );
  }

  // 2. Generera AI-frågor och spara i frågebanken.
  if (body.antal_ai > 0) {
    // Exempel att härma från banken.
    const { data: examples } = await supabase
      .from("question_bank")
      .select("fragetext, alternativ")
      .eq("amne", amne)
      .limit(4);
    const exempel = ((examples as { fragetext: string }[]) ?? []).map(
      (e) => e.fragetext,
    );

    try {
      const perContent = Math.max(
        1,
        Math.ceil(body.antal_ai / body.centralt_innehall.length),
      );
      const generated: {
        fragetyp: QuestionType;
        fragetext: string;
        alternativ: string[] | null;
        facit: unknown;
        bedomningsanvisning: string | null;
        niva: "E" | "C" | "A";
        arskurs: number;
        centralt_innehall: string;
        poang: number;
      }[] = [];

      for (const ci of body.centralt_innehall) {
        if (generated.length >= body.antal_ai) break;
        const remaining = body.antal_ai - generated.length;
        const result = await generateQuestions({
          amne,
          arskurs,
          centralt_innehall: ci,
          niva: body.niva,
          fragetyper: body.fragetyper,
          antal: Math.min(perContent, remaining),
          exempel,
        });
        generated.push(...result.fragor);
      }

      const rows = generated.slice(0, body.antal_ai).map((q) => ({
        owner_id: user.id,
        amne,
        arskurs: q.arskurs,
        centralt_innehall: q.centralt_innehall,
        fragetyp: q.fragetyp,
        fragetext: q.fragetext,
        alternativ: q.alternativ,
        facit: q.facit,
        bedomningsanvisning: q.bedomningsanvisning,
        niva: q.niva,
        kalla: "ai_genererad" as const,
        poang: q.poang,
      }));

      if (rows.length > 0) {
        const { data: inserted, error: insErr } = await supabase
          .from("question_bank")
          .insert(rows)
          .select("id");
        if (insErr) throw new Error(insErr.message);
        chosenQuestionIds.push(...(inserted ?? []).map((r) => r.id));
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "AI-generering misslyckades";
      // Fortsätt ändå om vi fick bankfrågor.
      if (chosenQuestionIds.length === 0) {
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  if (chosenQuestionIds.length === 0) {
    return NextResponse.json(
      { error: "Inga frågor kunde väljas. Justera urvalet och försök igen." },
      { status: 400 },
    );
  }

  // 3. Skapa provet (utkast) och koppla frågorna i blandad ordning.
  const { data: exam, error: examErr } = await supabase
    .from("exams")
    .insert({
      class_id: body.classId,
      teacher_id: user.id,
      titel: body.titel,
      instruktioner: body.instruktioner ?? null,
      status: "utkast",
    })
    .select("id")
    .single();
  if (examErr || !exam) {
    return NextResponse.json(
      { error: examErr?.message ?? "Kunde inte skapa provet" },
      { status: 500 },
    );
  }

  const { data: pointsRows } = await supabase
    .from("question_bank")
    .select("id, poang")
    .in("id", chosenQuestionIds);
  const pointsMap = new Map(
    (pointsRows ?? []).map((r) => [r.id, r.poang as number]),
  );

  const examQuestions = shuffle(chosenQuestionIds).map((qid, i) => ({
    exam_id: exam.id,
    question_id: qid,
    ordning: i + 1,
    poang: pointsMap.get(qid) ?? 1,
  }));

  const { error: eqErr } = await supabase
    .from("exam_questions")
    .insert(examQuestions);
  if (eqErr) {
    return NextResponse.json({ error: eqErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, examId: exam.id });
}
