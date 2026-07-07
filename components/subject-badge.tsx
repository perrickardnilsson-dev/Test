import { Badge } from "@/components/ui/badge";
import { subjectLabel } from "@/lib/constants";
import type { Level, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUBJECT_STYLES: Record<Subject, string> = {
  biologi: "bg-emerald-100 text-emerald-800",
  fysik: "bg-sky-100 text-sky-800",
  kemi: "bg-violet-100 text-violet-800",
  teknik: "bg-amber-100 text-amber-800",
};

export function SubjectBadge({ subject }: { subject: Subject }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        SUBJECT_STYLES[subject],
      )}
    >
      {subjectLabel(subject)}
    </span>
  );
}

const LEVEL_STYLES: Record<Level, string> = {
  E: "bg-slate-100 text-slate-700",
  C: "bg-blue-100 text-blue-700",
  A: "bg-purple-100 text-purple-700",
};

export function LevelBadge({ level }: { level: Level }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold",
        LEVEL_STYLES[level],
      )}
    >
      {level}
    </span>
  );
}

export { Badge };
