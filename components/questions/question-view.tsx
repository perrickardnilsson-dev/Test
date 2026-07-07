import { Check } from "lucide-react";
import { LevelBadge } from "@/components/subject-badge";
import { Badge } from "@/components/ui/badge";
import { questionTypeLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Facit, QuestionType } from "@/lib/types";

export function QuestionView({
  fragetext,
  fragetyp,
  alternativ,
  facit,
  bedomningsanvisning,
  niva,
  poang,
  centralt_innehall,
  showFacit = true,
  ordning,
}: {
  fragetext: string;
  fragetyp: QuestionType;
  alternativ: string[] | null;
  facit?: Facit;
  bedomningsanvisning?: string | null;
  niva?: string;
  poang?: number;
  centralt_innehall?: string;
  showFacit?: boolean;
  ordning?: number;
}) {
  const correctSingle =
    facit?.typ === "flerval_ett" ? facit.korrekt_index : null;
  const correctMulti =
    facit?.typ === "flerval_flera" ? facit.korrekta_index : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{questionTypeLabel(fragetyp)}</Badge>
        {niva && <LevelBadge level={niva as "E" | "C" | "A"} />}
        {typeof poang === "number" && (
          <span className="text-muted-foreground">{poang} p</span>
        )}
        {centralt_innehall && (
          <span className="text-muted-foreground truncate">
            · {centralt_innehall}
          </span>
        )}
      </div>

      <p className="font-medium">
        {typeof ordning === "number" && (
          <span className="text-muted-foreground mr-2">{ordning}.</span>
        )}
        {fragetext}
      </p>

      {alternativ && alternativ.length > 0 && (
        <ul className="space-y-1">
          {alternativ.map((alt, i) => {
            const isCorrect =
              showFacit &&
              (correctSingle === i || correctMulti.includes(i));
            return (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
                  isCorrect
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-transparent bg-slate-50",
                )}
              >
                {isCorrect && (
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
                <span>{alt}</span>
              </li>
            );
          })}
        </ul>
      )}

      {showFacit && facit?.typ === "kortsvar" && (
        <div className="text-sm">
          <span className="text-muted-foreground">Godkända svar: </span>
          {facit.godkanda_svar.join(", ")}
        </div>
      )}

      {showFacit && facit?.typ === "fritext" && (
        <div className="rounded-md bg-slate-50 p-3 text-sm">
          <div className="font-medium text-muted-foreground mb-1">
            Exempelsvar
          </div>
          <p>{facit.exempelsvar}</p>
        </div>
      )}

      {showFacit && bedomningsanvisning && (
        <div className="rounded-md border border-dashed p-3 text-sm">
          <div className="font-medium text-muted-foreground mb-1">
            Bedömningsanvisning
          </div>
          <p className="whitespace-pre-wrap">{bedomningsanvisning}</p>
        </div>
      )}
    </div>
  );
}
