import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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

function matchesContent(q: QuestionBankItem, areas: string[]): boolean {
  return areas.some(
    (ci) =>
      q.centralt_innehall.toLowerCase().includes(ci.toLowerCase()) ||
      ci.toLowerCase().includes(q.centralt_innehall.toLowerCase()),
  );
}

function pickBankQuestions(
  bank: QuestionBankItem[],
  areas: string[],
  arskurs: number,
  count: number,
): QuestionBankItem[] {
  if (count <= 0 || bank.length === 0) return [];

  const gradeMatch = bank.filter((q) => Math.abs(q.arskurs - arskurs) <= 1);
  const pool = gradeMatch.length > 0 ? gradeMatch : bank;

  const matched = pool.filter((q) => matchesContent(q, areas));
  const rest = pool.filter((q) => !matched.includes(q));
  const ordered = shuffle([...matched, ...rest]);

  return ordered.slice(0, count);
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
  const warnings: string[] = [];

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

  const service = createServiceClient();
  const chosenQuestionIds: string[] = [];

  // 1. Välj bankfrågor (service-klient så RLS inte döljer seed-frågor).
  if (body.antal_bank > 0) {
    const { data: bank, error: bankErr } = await service
      .from("question_bank")
      .select("*")
      .eq("amne", amne)
      .in("fragetyp", body.fragetyper);

    if (bankErr) {
      return NextResponse.json({ error: bankErr.message }, { status: 500 });
    }

    const picked = pickBankQuestions(
      (bank as QuestionBankItem[]) ?? [],
      body.centralt_innehall,
      arskurs,
      body.antal_bank,
    );
    chosenQuestionIds.push(...picked.map((q) => q.id));

    if (picked.length < body.antal_bank) {
      warnings.push(
        `Hittade bara ${picked.length} av ${body.antal_bank} begärda bankfrågor i ${amne}.`,
      );
    }
  }

  // 2. Generera AI-frågor och spara i frågebanken.
  if (body.antal_ai > 0) {
    const { data: examples } = await service
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
        bild_url: null,
      }));

      if (rows.length > 0) {
        const { data: inserted, error: insErr } = await service
          .from("question_bank")
          .insert(rows)
          .select("id");
        if (insErr) throw new Error(insErr.message);
        chosenQuestionIds.push(
          ...(inserted ?? []).map((r: { id: string }) => r.id),
        );
      }

      if (rows.length < body.antal_ai) {
        warnings.push(
          `AI genererade bara ${rows.length} av ${body.antal_ai} begärda frågor.`,
        );
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "AI-generering misslyckades";
      warnings.push(message);
      if (chosenQuestionIds.length === 0) {
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  const uniqueQuestionIds = Array.from(new Set(chosenQuestionIds));

  if (uniqueQuestionIds.length === 0) {
    return NextResponse.json(
      { error: "Inga frågor kunde väljas. Justera urvalet och försök igen." },
      { status: 400 },
    );
  }

  if (uniqueQuestionIds.length < chosenQuestionIds.length) {
    warnings.push("Dubblettfrågor togs bort innan provet skapades.");
  }

  // 3. Skapa provet (utkast) och koppla frågorna i blandad ordning.
  const { data: exam, error: examErr } = await service
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

  const { data: pointsRows } = await service
    .from("question_bank")
    .select("id, poang")
    .in("id", uniqueQuestionIds);
  const pointsMap = new Map(
    (pointsRows ?? []).map((r: { id: string; poang: number }) => [
      r.id,
      r.poang,
    ]),
  );

  const examQuestions = shuffle(uniqueQuestionIds).map((qid, i) => ({
    exam_id: exam.id,
    question_id: qid,
    ordning: i + 1,
    poang: pointsMap.get(qid) ?? 1,
  }));

  const { error: eqErr } = await service
    .from("exam_questions")
    .insert(examQuestions);
  if (eqErr) {
    return NextResponse.json({ error: eqErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    examId: exam.id,
    questionCount: examQuestions.length,
    bankCount: Math.min(body.antal_bank, uniqueQuestionIds.length),
    aiCount: Math.max(0, uniqueQuestionIds.length - body.antal_bank),
    warnings,
  });
}
