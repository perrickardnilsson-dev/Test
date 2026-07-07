import { z } from "zod";

export const questionTypeSchema = z.enum([
  "flerval_ett",
  "flerval_flera",
  "kortsvar",
  "fritext",
]);

export const levelSchema = z.enum(["E", "C", "A"]);

export const facitSchema = z.discriminatedUnion("typ", [
  z.object({ typ: z.literal("flerval_ett"), korrekt_index: z.number().int() }),
  z.object({
    typ: z.literal("flerval_flera"),
    korrekta_index: z.array(z.number().int()),
  }),
  z.object({
    typ: z.literal("kortsvar"),
    godkanda_svar: z.array(z.string()).min(1),
  }),
  z.object({ typ: z.literal("fritext"), exempelsvar: z.string() }),
]);

export const extractedQuestionSchema = z.object({
  fragetyp: questionTypeSchema,
  fragetext: z.string().min(1),
  alternativ: z.array(z.string()).nullable(),
  facit: facitSchema,
  bedomningsanvisning: z.string().nullable(),
  niva: levelSchema,
  arskurs: z.number().int().min(7).max(9),
  centralt_innehall: z.string(),
  poang: z.number().int().min(1),
});

export const extractionResultSchema = z.object({
  fragor: z.array(extractedQuestionSchema),
});

export const generatedQuestionsSchema = z.object({
  fragor: z.array(extractedQuestionSchema),
});

export const gradingSuggestionSchema = z.object({
  poang: z.number().min(0),
  niva: levelSchema.nullable(),
  motivering: z.string().min(1),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;
export type GeneratedQuestions = z.infer<typeof generatedQuestionsSchema>;
export type GradingSuggestion = z.infer<typeof gradingSuggestionSchema>;
