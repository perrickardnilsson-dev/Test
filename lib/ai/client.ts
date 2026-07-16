import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/** Standardmodell – kan överstyras med ANTHROPIC_MODEL i miljövariabler. */
export const MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY saknas i miljövariablerna");
  }
  if (!cached) {
    cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cached;
}

/** Plockar ut första JSON-blocket ur en textsträng. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.search(/[[{]/);
  if (firstBrace === -1) return text.trim();
  const lastBrace = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  return text.slice(firstBrace, lastBrace + 1).trim();
}

/**
 * Anropar Claude och validerar svaret mot ett zod-schema. Vid ogiltig JSON
 * görs nya försök där felmeddelandet skickas tillbaka till modellen.
 */
export async function generateStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  retries?: number;
  /** Bifogad PDF (base64) som Claude tolkar direkt. */
  pdfBase64?: string;
}): Promise<T> {
  const {
    system,
    prompt,
    schema,
    maxTokens = 4096,
    retries = 2,
    pdfBase64,
  } = opts;
  const anthropic = getAnthropic();

  let lastError = "";
  const firstContent: Anthropic.ContentBlockParam[] = [
    { type: "text", text: prompt },
  ];
  if (pdfBase64) {
    firstContent.unshift({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBase64,
      },
    });
  }
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: firstContent },
  ];

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      messages.push({
        role: "user",
        content: `Ditt förra svar kunde inte tolkas som giltig JSON enligt schemat. Fel: ${lastError}. Svara ENDAST med giltig JSON, inga förklaringar.`,
      });
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    messages.push({ role: "assistant", content: raw });

    try {
      const parsed = JSON.parse(extractJson(raw));
      const result = schema.safeParse(parsed);
      if (result.success) return result.data;
      lastError = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Okänt JSON-fel";
    }
  }

  throw new Error(`Kunde inte få giltig JSON från AI: ${lastError}`);
}
