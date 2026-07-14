import type { Facit, StudentAnswer } from "@/lib/types";

/**
 * Automatisk rättning av flervalsfrågor. Returnerar poäng (allt-eller-inget)
 * eller null om frågetypen inte kan rättas automatiskt.
 */
export function autoScore(
  facit: Facit,
  svar: StudentAnswer | undefined,
  maxPoang: number,
): number | null {
  if (facit.typ === "flerval_ett") {
    const valt = svar?.valda_index ?? [];
    return valt.length === 1 && valt[0] === facit.korrekt_index
      ? maxPoang
      : 0;
  }
  if (facit.typ === "flerval_flera") {
    const valt = [...(svar?.valda_index ?? [])].sort((a, b) => a - b);
    const ratt = [...facit.korrekta_index].sort((a, b) => a - b);
    const lika =
      valt.length === ratt.length && valt.every((v, i) => v === ratt[i]);
    return lika ? maxPoang : 0;
  }
  return null;
}

/** Kortsvar kan snabbrättas mot facit innan AI tillfrågas. */
export function quickMatchKortsvar(
  facit: Facit,
  svar: StudentAnswer | undefined,
): boolean | null {
  if (facit.typ !== "kortsvar") return null;
  const text = (svar?.text ?? "").trim().toLowerCase();
  if (!text) return false;
  return facit.godkanda_svar.some(
    (g) => g.trim().toLowerCase() === text,
  );
}

/** Bygger en läsbar facit-sträng till AI-rättningen. */
export function facitToText(facit: Facit): string {
  switch (facit.typ) {
    case "kortsvar":
      return `Godkända svar: ${facit.godkanda_svar.join(" / ")}`;
    case "fritext":
      return facit.exempelsvar;
    default:
      return "";
  }
}

export function svarToText(
  svar: StudentAnswer | undefined,
  alternativ: string[] | null,
): string {
  if (!svar) return "";
  if (svar.text) return svar.text;
  if (svar.valda_index && alternativ) {
    return svar.valda_index.map((i) => alternativ[i]).join(", ");
  }
  return "";
}
