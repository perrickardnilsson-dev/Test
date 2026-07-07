import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LevelBadge } from "@/components/subject-badge";
import { QuestionView } from "@/components/questions/question-view";
import { gradeLevelFromShare } from "@/lib/constants";
import { svarToText } from "@/lib/grading";
import type { Facit, QuestionType, StudentAnswer } from "@/lib/types";

type ResultRow = {
  exam_question_id: string;
  ordning: number;
  max_poang: number;
  fragetyp: QuestionType;
  fragetext: string;
  alternativ: string[] | null;
  facit: Facit;
  svar: StudentAnswer | null;
  poang: number;
  kommentar: string | null;
  ai_niva: string | null;
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  await requireRole("student");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_student_results", {
    p_attempt_id: attemptId,
  });

  if (error || !data) redirect("/elev");
  const rows = (data as ResultRow[]) ?? [];

  const totalScore = rows.reduce((s, r) => s + Number(r.poang), 0);
  const totalMax = rows.reduce((s, r) => s + r.max_poang, 0);
  const share = totalMax ? totalScore / totalMax : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/elev"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Mina prov
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Ditt resultat</CardTitle>
          <CardDescription>
            Läraren har publicerat rättningen av provet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-3xl font-bold">
                {totalScore} / {totalMax} p
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.round(share * 100)}% av maxpoängen
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Betygsnivå:</span>
              <LevelBadge level={gradeLevelFromShare(share) as "E" | "C" | "A"} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rows.map((r) => {
          const full = Number(r.poang) >= r.max_poang;
          const some = Number(r.poang) > 0;
          return (
            <Card key={r.exam_question_id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <QuestionView
                      ordning={r.ordning}
                      fragetext={r.fragetext}
                      fragetyp={r.fragetyp}
                      alternativ={r.alternativ}
                      facit={r.facit}
                      showFacit
                    />
                  </div>
                  <div
                    className={
                      full
                        ? "text-emerald-600 font-bold"
                        : some
                          ? "text-amber-600 font-bold"
                          : "text-red-600 font-bold"
                    }
                  >
                    {Number(r.poang)} / {r.max_poang} p
                  </div>
                </div>

                <div className="rounded-md bg-slate-50 p-3 text-sm">
                  <span className="text-muted-foreground">Ditt svar: </span>
                  <span className="font-medium">
                    {svarToText(r.svar ?? undefined, r.alternativ) ||
                      "(inget svar)"}
                  </span>
                </div>

                {r.kommentar && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-blue-800 mb-1">
                      <MessageSquare className="h-4 w-4" /> Lärarens kommentar
                      {r.ai_niva && <LevelBadge level={r.ai_niva as "E" | "C" | "A"} />}
                    </div>
                    <p className="text-blue-900">{r.kommentar}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
