"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  Download,
  EyeOff,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { LevelBadge } from "@/components/subject-badge";
import { QuestionView } from "@/components/questions/question-view";
import { gradeLevelFromShare, questionTypeLabel } from "@/lib/constants";
import { svarToText } from "@/lib/grading";
import type {
  Answer,
  Attempt,
  Grading,
  Profile,
  StudentAnswer,
} from "@/lib/types";
import type { EQWithBank } from "./page";
import { GradingRow } from "./grading-row";

type AttemptWithProfile = Attempt & {
  profiles: Pick<Profile, "id" | "name" | "email">;
};

export function RattningClient({
  examId,
  examTitle,
  examStatus,
  examQuestions,
  attempts,
  answers,
  gradings,
}: {
  examId: string;
  examTitle: string;
  examStatus: string;
  examQuestions: EQWithBank[];
  attempts: AttemptWithProfile[];
  answers: Answer[];
  gradings: Grading[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [gradingRunning, setGradingRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  // Stabila pseudonymer ("Elev 1", "Elev 2" …) oberoende av namnordning.
  const pseudonyms = useMemo(() => {
    const m = new Map<string, string>();
    [...attempts]
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((a, i) => m.set(a.id, `Elev ${i + 1}`));
    return m;
  }, [attempts]);

  const displayName = (attempt: AttemptWithProfile) =>
    anonymous
      ? (pseudonyms.get(attempt.id) ?? "Elev")
      : attempt.profiles.name;

  const answerByKey = useMemo(() => {
    const m = new Map<string, Answer>();
    answers.forEach((a) => m.set(`${a.attempt_id}:${a.exam_question_id}`, a));
    return m;
  }, [answers]);

  const gradingByAnswer = useMemo(() => {
    const m = new Map<string, Grading>();
    gradings.forEach((g) => m.set(g.answer_id, g));
    return m;
  }, [gradings]);

  const totalMax = examQuestions.reduce((s, eq) => s + eq.poang, 0);

  function pointsFor(attemptId: string, eq: EQWithBank): number {
    const ans = answerByKey.get(`${attemptId}:${eq.id}`);
    if (!ans) return 0;
    const g = gradingByAnswer.get(ans.id);
    if (!g) return 0;
    return g.larare_poang ?? g.auto_poang ?? 0;
  }

  const hasAnyGrading = gradings.length > 0;
  const pendingCount = gradings.filter((g) => g.status === "vantar").length;

  async function runAiGrading() {
    setGradingRunning(true);
    try {
      const res = await fetch(`/api/larare/prov/${examId}/ratta`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Rättning misslyckades",
          description: data.error,
        });
      } else {
        toast({
          variant: "success",
          title: "Rättning klar",
          description: `${data.graded} svar rättade${
            data.aiErrors ? `, ${data.aiErrors} AI-fel` : ""
          }.`,
        });
      }
    } finally {
      setGradingRunning(false);
      router.refresh();
    }
  }

  async function onBulkApprove() {
    setBulkApproving(true);
    const { approveAllPendingGradings } = await import("../../actions");
    const result = await approveAllPendingGradings(examId);
    setBulkApproving(false);
    if ("error" in result && result.error) {
      toast({
        variant: "destructive",
        title: "Fel",
        description: String(result.error),
      });
      return;
    }
    toast({
      variant: "success",
      title: "AI-förslag godkända",
      description: `${result.approved ?? 0} svar godkändes. Justera enskilda svar vid behov.`,
    });
    router.refresh();
  }

  async function onPublish() {
    setPublishing(true);
    const { publishResults } = await import("../../actions");
    const result = await publishResults(examId);
    setPublishing(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({
      variant: "success",
      title: "Resultat publicerat",
      description: "Eleverna kan nu se sina resultat och motiveringar.",
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
        <div className="text-sm">
          {hasAnyGrading ? (
            <span>
              {pendingCount > 0 ? (
                <Badge variant="warning" className="mr-2">
                  {pendingCount} väntar på granskning
                </Badge>
              ) : (
                <Badge variant="success" className="mr-2">
                  Alla granskade
                </Badge>
              )}
              {examStatus === "rattat" && (
                <Badge variant="success">Publicerat</Badge>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">
              Kör AI-rättningen för att komma igång. Flerval rättas automatiskt.
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer mr-2">
            <EyeOff className="h-4 w-4" />
            Anonymisera
            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
          </label>
          <Button
            variant="outline"
            onClick={runAiGrading}
            disabled={gradingRunning}
          >
            {gradingRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Rättar…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Rätta med AI
              </>
            )}
          </Button>
          {pendingCount > 0 && (
            <Button
              variant="outline"
              onClick={onBulkApprove}
              disabled={bulkApproving}
            >
              {bulkApproving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Godkänner…
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4" /> Godkänn alla AI-förslag (
                  {pendingCount})
                </>
              )}
            </Button>
          )}
          <Button
            onClick={onPublish}
            disabled={publishing || !hasAnyGrading}
          >
            <Send className="h-4 w-4" />
            {examStatus === "rattat" ? "Uppdatera resultat" : "Publicera resultat"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="fraga">
        <TabsList>
          <TabsTrigger value="fraga">Rättning per fråga</TabsTrigger>
          <TabsTrigger value="rattning">Rättning per elev</TabsTrigger>
          <TabsTrigger value="resultat">Resultatöversikt</TabsTrigger>
        </TabsList>

        <TabsContent value="fraga" className="space-y-6 pt-4">
          {examQuestions.map((eq) => {
            const isAuto =
              eq.question_bank.fragetyp === "flerval_ett" ||
              eq.question_bank.fragetyp === "flerval_flera";
            const answered = attempts.filter((a) =>
              answerByKey.has(`${a.id}:${eq.id}`),
            );
            return (
              <Card key={eq.id}>
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    <QuestionView
                      ordning={eq.ordning}
                      fragetext={eq.question_bank.fragetext}
                      fragetyp={eq.question_bank.fragetyp}
                      alternativ={eq.question_bank.alternativ}
                      facit={eq.question_bank.facit}
                      bedomningsanvisning={eq.question_bank.bedomningsanvisning}
                      niva={eq.question_bank.niva}
                      poang={eq.poang}
                      bildUrl={eq.question_bank.bild_url}
                    />
                  </CardTitle>
                  <CardDescription>
                    {answered.length} av {attempts.length} elever besvarade
                    frågan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {attempts.map((attempt) => {
                    const ans = answerByKey.get(`${attempt.id}:${eq.id}`);
                    if (!ans) {
                      return (
                        <div
                          key={attempt.id}
                          className="flex items-center justify-between rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
                        >
                          <span>
                            <span className="font-medium text-foreground">
                              {displayName(attempt)}
                            </span>{" "}
                            – inget svar
                          </span>
                          <span>0 / {eq.poang} p</span>
                        </div>
                      );
                    }
                    const grading = gradingByAnswer.get(ans.id);
                    return (
                      <GradingRow
                        key={attempt.id}
                        examId={examId}
                        ordning={eq.ordning}
                        maxPoang={eq.poang}
                        isAuto={isAuto}
                        fragetext={eq.question_bank.fragetext}
                        fragetyp={eq.question_bank.fragetyp}
                        alternativ={eq.question_bank.alternativ}
                        facit={eq.question_bank.facit}
                        bedomningsanvisning={
                          eq.question_bank.bedomningsanvisning
                        }
                        studentText={svarToText(
                          ans.svar as StudentAnswer | undefined,
                          eq.question_bank.alternativ,
                        )}
                        grading={grading}
                        compact
                        studentName={displayName(attempt)}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="rattning" className="space-y-6 pt-4">
          {attempts.map((attempt) => {
            const score = examQuestions.reduce(
              (s, eq) => s + pointsFor(attempt.id, eq),
              0,
            );
            return (
              <Card key={attempt.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>{displayName(attempt)}</CardTitle>
                    <CardDescription>
                      {anonymous ? "dold e-post" : attempt.profiles.email}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {score} / {totalMax} p
                    </div>
                    <LevelBadge
                      level={
                        gradeLevelFromShare(
                          totalMax ? score / totalMax : 0,
                        ) as "E" | "C" | "A"
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {examQuestions.map((eq) => {
                    const ans = answerByKey.get(`${attempt.id}:${eq.id}`);
                    const grading = ans
                      ? gradingByAnswer.get(ans.id)
                      : undefined;
                    const isAuto =
                      eq.question_bank.fragetyp === "flerval_ett" ||
                      eq.question_bank.fragetyp === "flerval_flera";
                    return (
                      <GradingRow
                        key={eq.id}
                        examId={examId}
                        ordning={eq.ordning}
                        maxPoang={eq.poang}
                        isAuto={isAuto}
                        fragetext={eq.question_bank.fragetext}
                        fragetyp={eq.question_bank.fragetyp}
                        alternativ={eq.question_bank.alternativ}
                        facit={eq.question_bank.facit}
                        bedomningsanvisning={
                          eq.question_bank.bedomningsanvisning
                        }
                        studentText={svarToText(
                          ans?.svar as StudentAnswer | undefined,
                          eq.question_bank.alternativ,
                        )}
                        grading={grading}
                        bildUrl={eq.question_bank.bild_url}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="resultat" className="pt-4">
          <ResultatOversikt
            examTitle={examTitle}
            examQuestions={examQuestions}
            attempts={attempts}
            pointsFor={pointsFor}
            totalMax={totalMax}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResultatOversikt({
  examTitle,
  examQuestions,
  attempts,
  pointsFor,
  totalMax,
}: {
  examTitle: string;
  examQuestions: EQWithBank[];
  attempts: AttemptWithProfile[];
  pointsFor: (attemptId: string, eq: EQWithBank) => number;
  totalMax: number;
}) {
  const perStudent = attempts.map((a) => {
    const score = examQuestions.reduce((s, eq) => s + pointsFor(a.id, eq), 0);
    return { attempt: a, score };
  });

  /** Excel-vänlig CSV: BOM, semikolon och decimalkomma (svensk lokal). */
  function exportCsv() {
    const num = (n: number) => String(n).replace(".", ",");
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

    const header = [
      "Elev",
      "E-post",
      ...examQuestions.map((eq) => `Fråga ${eq.ordning} (${eq.poang}p)`),
      "Totalt",
      "Max",
      "Andel %",
      "Nivå",
    ];

    const rows = perStudent.map(({ attempt, score }) => {
      const share = totalMax ? score / totalMax : 0;
      return [
        esc(attempt.profiles.name),
        esc(attempt.profiles.email),
        ...examQuestions.map((eq) => num(pointsFor(attempt.id, eq))),
        num(score),
        num(totalMax),
        num(Math.round(share * 100)),
        gradeLevelFromShare(share),
      ];
    });

    const csv =
      "\uFEFF" +
      [header, ...rows].map((r) => r.join(";")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${examTitle.replace(/[^a-zA-Z0-9åäöÅÄÖ _-]/g, "")} - resultat.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const avg =
    perStudent.length > 0
      ? perStudent.reduce((s, p) => s + p.score, 0) / perStudent.length
      : 0;

  const perQuestion = examQuestions.map((eq) => {
    const total = attempts.reduce((s, a) => s + pointsFor(a.id, eq), 0);
    const maxTotal = eq.poang * Math.max(1, attempts.length);
    const share = maxTotal ? total / maxTotal : 0;
    return { eq, share };
  });
  const hardest = [...perQuestion].sort((a, b) => a.share - b.share);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Exportera CSV (Excel)
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Per elev</CardTitle>
          <CardDescription>
            Snitt: {avg.toFixed(1)} / {totalMax} p
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {perStudent
            .sort((a, b) => b.score - a.score)
            .map(({ attempt, score }) => {
              const share = totalMax ? score / totalMax : 0;
              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span className="font-medium">{attempt.profiles.name}</span>
                  <div className="flex items-center gap-2">
                    <span>
                      {score} / {totalMax} p
                    </span>
                    <LevelBadge
                      level={gradeLevelFromShare(share) as "E" | "C" | "A"}
                    />
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Svåraste frågorna</CardTitle>
          <CardDescription>
            Andel av maxpoäng klassen fick per fråga
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hardest.map(({ eq, share }) => (
            <div key={eq.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">
                  {eq.ordning}. {eq.question_bank.fragetext}
                </span>
                <span className="ml-2 shrink-0 text-muted-foreground">
                  {Math.round(share * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={
                    share < 0.5
                      ? "h-full bg-red-400"
                      : share < 0.75
                        ? "h-full bg-amber-400"
                        : "h-full bg-emerald-400"
                  }
                  style={{ width: `${Math.round(share * 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {questionTypeLabel(eq.question_bank.fragetyp)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
