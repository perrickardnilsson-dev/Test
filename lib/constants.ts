import type {
  ExamStatus,
  Level,
  QuestionSource,
  QuestionType,
  Subject,
} from "@/lib/types";

export const SUBJECTS: { value: Subject; label: string; short: string }[] = [
  { value: "biologi", label: "Biologi", short: "Bi" },
  { value: "fysik", label: "Fysik", short: "Fy" },
  { value: "kemi", label: "Kemi", short: "Ke" },
  { value: "teknik", label: "Teknik", short: "Tk" },
];

export const GRADES = [7, 8, 9] as const;

export const LEVELS: { value: Level; label: string; description: string }[] = [
  { value: "E", label: "E-nivå", description: "Grundläggande kunskaper" },
  { value: "C", label: "C-nivå", description: "Goda kunskaper" },
  { value: "A", label: "A-nivå", description: "Mycket goda kunskaper" },
];

export const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  description: string;
}[] = [
  {
    value: "flerval_ett",
    label: "Flerval (ett rätt svar)",
    description: "Eleven väljer ett alternativ",
  },
  {
    value: "flerval_flera",
    label: "Flerval (flera rätta svar)",
    description: "Eleven väljer ett eller flera alternativ",
  },
  {
    value: "kortsvar",
    label: "Kortsvar",
    description: "Kort svar som rättas med AI mot facit",
  },
  {
    value: "fritext",
    label: "Fritext/resonemang",
    description: "Längre svar med AI-förslag och lärargranskning",
  },
];

export const SOURCES: { value: QuestionSource; label: string }[] = [
  { value: "np", label: "Nationellt prov" },
  { value: "ai_genererad", label: "AI-genererad" },
  { value: "egen", label: "Egen fråga" },
];

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  utkast: "Utkast",
  publicerat: "Publicerat",
  rattat: "Rättat",
};

export function subjectLabel(subject: Subject): string {
  return SUBJECTS.find((s) => s.value === subject)?.label ?? subject;
}

export function questionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function sourceLabel(source: QuestionSource): string {
  return SOURCES.find((s) => s.value === source)?.label ?? source;
}

/** Enkel betygsnivå utifrån andel av maxpoäng (förenklad modell). */
export function gradeLevelFromShare(share: number): string {
  if (share >= 0.85) return "A";
  if (share >= 0.7) return "C";
  if (share >= 0.5) return "E";
  return "F";
}
