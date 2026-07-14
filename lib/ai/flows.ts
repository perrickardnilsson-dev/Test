import { generateStructured } from "@/lib/ai/client";
import {
  EXTRACTION_SYSTEM,
  GENERATION_SYSTEM,
  GRADING_SYSTEM,
  REPORT_SYSTEM,
  extractionPrompt,
  generationPrompt,
  gradingPrompt,
  reportPrompt,
} from "@/lib/ai/prompts";
import {
  extractionResultSchema,
  generatedQuestionsSchema,
  gradingSuggestionSchema,
  reportDraftSchema,
  type ExtractionResult,
  type GeneratedQuestions,
  type GradingSuggestion,
  type ReportDraft,
} from "@/lib/ai/schemas";
import type { Level, QuestionType, Subject } from "@/lib/types";

export async function extractQuestionsFromPdf(opts: {
  amne: Subject;
  year: number | null;
  pdfBase64: string;
}): Promise<ExtractionResult> {
  return generateStructured({
    system: EXTRACTION_SYSTEM,
    prompt: extractionPrompt({
      amne: opts.amne,
      year: opts.year,
      pdfText:
        "Provet bifogas som PDF-dokument. Läs hela dokumentet noggrant.",
    }),
    schema: extractionResultSchema,
    maxTokens: 8192,
    pdfBase64: opts.pdfBase64,
  });
}

export async function generateQuestions(opts: {
  amne: Subject;
  arskurs: number;
  centralt_innehall: string;
  niva: Level;
  fragetyper: QuestionType[];
  antal: number;
  exempel: string[];
}): Promise<GeneratedQuestions> {
  return generateStructured({
    system: GENERATION_SYSTEM,
    prompt: generationPrompt(opts),
    schema: generatedQuestionsSchema,
    maxTokens: 8192,
  });
}

export async function gradeFreeText(opts: {
  fragetext: string;
  maxPoang: number;
  facit: string;
  bedomningsanvisning: string | null;
  elevsvar: string;
}): Promise<GradingSuggestion> {
  return generateStructured({
    system: GRADING_SYSTEM,
    prompt: gradingPrompt(opts),
    schema: gradingSuggestionSchema,
    maxTokens: 1024,
  });
}

export async function generateReportDraft(opts: {
  elevnamn: string;
  amne: Subject;
  arskurs: number;
  provrader: string[];
  omradesrader: string[];
}): Promise<ReportDraft> {
  return generateStructured({
    system: REPORT_SYSTEM,
    prompt: reportPrompt(opts),
    schema: reportDraftSchema,
    maxTokens: 2048,
  });
}
