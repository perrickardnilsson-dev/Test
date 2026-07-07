import type { Level, QuestionType, Subject } from "@/lib/types";
import { subjectLabel } from "@/lib/constants";

const JSON_QUESTION_FORMAT = `
Varje fråga i "fragor"-listan ska ha exakt dessa fält:
- "fragetyp": en av "flerval_ett", "flerval_flera", "kortsvar", "fritext"
- "fragetext": själva frågan (svenska)
- "alternativ": lista med svarsalternativ för flervalsfrågor, annars null
- "facit": objekt beroende på frågetyp:
    flerval_ett  -> {"typ":"flerval_ett","korrekt_index": <0-baserat index>}
    flerval_flera-> {"typ":"flerval_flera","korrekta_index":[<index>,...]}
    kortsvar     -> {"typ":"kortsvar","godkanda_svar":["...","..."]}
    fritext      -> {"typ":"fritext","exempelsvar":"..."}
- "bedomningsanvisning": för fritext en matris med E/C/A-beskrivning, annars null
- "niva": "E", "C" eller "A"
- "arskurs": heltal 7, 8 eller 9
- "centralt_innehall": arbetsområde enligt Lgr22
- "poang": heltal, maxpoäng för frågan (flerval ofta 1–2, fritext 3–6)

Svara ENDAST med ett JSON-objekt på formen {"fragor":[ ... ]}. Ingen extra text.`;

export const EXTRACTION_SYSTEM = `Du är ett expertstöd för NO-lärare i svensk grundskola. Din uppgift är att tolka text från gamla frisläppta nationella prov och extrahera frågorna till strukturerad JSON. Du hittar aldrig på innehåll som inte finns i texten. Om facit eller bedömningsanvisning saknas i texten, gör en rimlig tolkning och markera det tydligt i bedömningsanvisningen. All text ska vara på svenska.`;

export function extractionPrompt(opts: {
  amne: Subject;
  year: number | null;
  pdfText: string;
}): string {
  return `Nedan följer text som extraherats ur ett frisläppt nationellt prov i ${subjectLabel(
    opts.amne,
  )}${opts.year ? `, år ${opts.year}` : ""}.

Extrahera alla provfrågor du kan identifiera. För flervalsfrågor, lista alla alternativ. För frågor med facit i texten, använd det. Bedöm rimlig nivå (E/C/A), årskurs (7–9) och poäng.

${JSON_QUESTION_FORMAT}

--- PROVTEXT ---
${opts.pdfText}
--- SLUT PROVTEXT ---`;
}

export const GENERATION_SYSTEM = `Du är ett expertstöd som skapar prov­frågor i samma stil som svenska nationella prov i NO för högstadiet. Frågorna ska vara pedagogiskt korrekta, tydliga och följa Lgr22. Du skapar frågor på angiven nivå och för angivet centralt innehåll. All text på svenska.`;

export function generationPrompt(opts: {
  amne: Subject;
  arskurs: number;
  centralt_innehall: string;
  niva: Level;
  fragetyper: QuestionType[];
  antal: number;
  exempel: string[];
}): string {
  const exempelText =
    opts.exempel.length > 0
      ? `\n\nHär är exempel på befintliga frågor i frågebanken (härma stil och svårighetsgrad, men skapa NYA frågor):\n${opts.exempel
          .map((e, i) => `Exempel ${i + 1}: ${e}`)
          .join("\n")}`
      : "";

  return `Skapa ${opts.antal} nya provfrågor i ${subjectLabel(opts.amne)} för årskurs ${
    opts.arskurs
  }.
Centralt innehåll (Lgr22): ${opts.centralt_innehall}
Svårighetsnivå: ${opts.niva}
Tillåtna frågetyper: ${opts.fragetyper.join(", ")}

Variera frågetyperna bland de tillåtna. Frågorna ska hålla nationell-prov-kvalitet.${exempelText}

${JSON_QUESTION_FORMAT}`;
}

export const GRADING_SYSTEM = `Du är en erfaren NO-lärare i svensk grundskola som rättar elevsvar rättvist och konsekvent enligt bedömningsanvisningar och kunskapskrav (E/C/A). Du är generös nog att belöna korrekt förståelse även om formuleringen är enkel, men kräver att sakinnehållet stämmer. Motiveringen ska vara kort, konkret och på svenska, riktad till läraren.`;

export function gradingPrompt(opts: {
  fragetext: string;
  maxPoang: number;
  facit: string;
  bedomningsanvisning: string | null;
  elevsvar: string;
}): string {
  return `Rätta följande elevsvar.

FRÅGA: ${opts.fragetext}
MAXPOÄNG: ${opts.maxPoang}
FACIT/EXEMPELSVAR: ${opts.facit}
${
  opts.bedomningsanvisning
    ? `BEDÖMNINGSANVISNING (E/C/A): ${opts.bedomningsanvisning}`
    : ""
}

ELEVENS SVAR: ${opts.elevsvar || "(inget svar)"}

Föreslå poäng (0 till ${opts.maxPoang}, halva poäng tillåtna), en nivå (E/C/A eller null om inget svar) och en kort motivering.

Svara ENDAST med JSON på formen:
{"poang": <tal>, "niva": "E"|"C"|"A"|null, "motivering": "..."}`;
}
