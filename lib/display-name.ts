/** Förnamn för hälsningar – kraschar inte om namn saknas. */
export function firstName(name: string | null | undefined): string {
  if (!name?.trim()) return "du";
  return name.trim().split(/\s+/)[0] ?? "du";
}
