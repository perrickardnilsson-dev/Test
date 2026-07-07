import { generateStructured } from "@/lib/ai/client";
import {
  EXTRACTION_SYSTEM,
  GENERATION_SYSTEM,
  GRADING_SYSTEM,
  extractionPrompt,
  generationPrompt,
  gradingPrompt,
} from "@/lib/ai/prompts";
import {
  extractionResultSchema,
  generatedQuestionsSchema,
  gradingSuggestionSchema,
  type ExtractionResult,
  type GeneratedQuestions,
  type GradingSuggestion,
} from "@/lib/ai/schemas";
import type { Level, QuestionType, Subject } from "@/lib/types";

export async function extractQuestionsFromText(opts: {
  amne: Subject;
  year: number | null;
  pdfText: string;
}): Promise<ExtractionResult> {
  return generateStructured({
    system: EXTRACTION_SYSTEM,
    prompt: extractionPrompt(opts),
    schema: extractionResultSchema,
    maxTokens: 8192,
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
