export type Role = "teacher" | "student";

export type Subject = "biologi" | "fysik" | "kemi" | "teknik";

export type QuestionType =
  | "flerval_ett"
  | "flerval_flera"
  | "kortsvar"
  | "fritext";

export type Level = "E" | "C" | "A";

export type QuestionSource = "np" | "ai_genererad" | "egen";

export type ExamStatus = "utkast" | "publicerat" | "rattat";

export type ExamDisplayMode = "en_fraga" | "alla";

export type DocumentStatus = "uppladdad" | "tolkar" | "tolkad" | "misslyckad";

export type InvitationStatus = "vantar" | "accepterad";

export type GradingStatus = "vantar" | "godkand";

/** Facit-format per frågetyp (lagras som JSONB). */
export type Facit =
  | { typ: "flerval_ett"; korrekt_index: number }
  | { typ: "flerval_flera"; korrekta_index: number[] }
  | { typ: "kortsvar"; godkanda_svar: string[] }
  | { typ: "fritext"; exempelsvar: string };

/** Elevens svar (lagras som JSONB). */
export type StudentAnswer = {
  valda_index?: number[];
  text?: string;
};

export interface Profile {
  id: string;
  role: Role;
  name: string;
  email: string;
  school_id: string | null;
  /** false för OAuth-användare som ännu inte valt roll. */
  onboarded: boolean;
  created_at: string;
}

/** Ämneslag/skola för delad frågebank mellan lärare. */
export interface School {
  id: string;
  name: string;
  school_code: string;
  created_at: string;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  amne: Subject;
  arskurs: number;
  class_code: string;
  created_at: string;
}

export interface ClassMember {
  class_id: string;
  student_id: string;
  joined_at: string;
}

export interface Invitation {
  id: string;
  class_id: string;
  email: string;
  token: string;
  status: InvitationStatus;
  created_at: string;
}

export interface SourceDocument {
  id: string;
  teacher_id: string;
  title: string;
  amne: Subject;
  year: number | null;
  storage_path: string;
  status: DocumentStatus;
  extracted: ExtractedQuestion[] | null;
  error_message: string | null;
  created_at: string;
}

/** Fråga extraherad ur PDF, före godkännande. */
export interface ExtractedQuestion {
  fragetyp: QuestionType;
  fragetext: string;
  alternativ: string[] | null;
  facit: Facit;
  bedomningsanvisning: string | null;
  niva: Level;
  arskurs: number;
  centralt_innehall: string;
  poang: number;
  bild_url?: string | null;
}

export interface QuestionBankItem {
  id: string;
  owner_id: string | null;
  amne: Subject;
  arskurs: number;
  centralt_innehall: string;
  fragetyp: QuestionType;
  fragetext: string;
  alternativ: string[] | null;
  facit: Facit;
  bedomningsanvisning: string | null;
  niva: Level;
  kalla: QuestionSource;
  source_document_id: string | null;
  poang: number;
  bild_url: string | null;
  delad: boolean;
  created_at: string;
}

export interface Exam {
  id: string;
  class_id: string;
  teacher_id: string;
  titel: string;
  instruktioner: string | null;
  visningslage: ExamDisplayMode;
  tidsgrans_minuter: number | null;
  oppnar: string | null;
  stanger: string | null;
  status: ExamStatus;
  slumpa_fragor: boolean;
  created_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  ordning: number;
  poang: number;
}

export interface Attempt {
  id: string;
  exam_id: string;
  student_id: string;
  startad: string;
  inlamnad: string | null;
  extra_minuter: number;
  fokus_tapp: number;
}

export interface Answer {
  id: string;
  attempt_id: string;
  exam_question_id: string;
  svar: StudentAnswer;
  updated_at: string;
}

export interface Grading {
  id: string;
  answer_id: string;
  auto_poang: number | null;
  ai_forslag_poang: number | null;
  ai_niva: Level | null;
  ai_motivering: string | null;
  larare_poang: number | null;
  larare_kommentar: string | null;
  status: GradingStatus;
  updated_at: string;
}
