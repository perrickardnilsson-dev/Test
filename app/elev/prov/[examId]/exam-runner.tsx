"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type {
  ExamDisplayMode,
  QuestionType,
  StudentAnswer,
} from "@/lib/types";
import { saveAnswer, submitAttempt } from "@/app/elev/actions";

export type RunnerQuestion = {
  examQuestionId: string;
  ordning: number;
  poang: number;
  fragetyp: QuestionType;
  fragetext: string;
  alternativ: string[] | null;
  bildUrl: string | null;
};

type SaveState = "idle" | "saving" | "saved";

export function ExamRunner({
  exam,
  attemptId,
  startedAt,
  extraMinutes = 0,
  questions,
  initialAnswers,
}: {
  exam: {
    id: string;
    titel: string;
    instruktioner: string | null;
    visningslage: ExamDisplayMode;
    tidsgrans_minuter: number | null;
  };
  attemptId: string;
  startedAt: string;
  extraMinutes?: number;
  questions: RunnerQuestion[];
  initialAnswers: Record<string, StudentAnswer>;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [answers, setAnswers] =
    useState<Record<string, StudentAnswer>>(initialAnswers);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [current, setCurrent] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const submittedRef = useRef(false);

  const deadline = exam.tidsgrans_minuter
    ? new Date(startedAt).getTime() +
      (exam.tidsgrans_minuter + extraMinutes) * 60000
    : null;

  const doSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      // Vänta in ev. pågående sparningar.
      await new Promise((r) => setTimeout(r, 300));
      const result = await submitAttempt(attemptId);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Kunde inte lämna in",
          description: result.error,
        });
        submittedRef.current = false;
        setSubmitting(false);
        return;
      }
      toast({
        variant: "success",
        title: auto ? "Tiden är slut – provet lämnades in" : "Provet inlämnat!",
      });
      router.push("/elev");
      router.refresh();
    },
    [attemptId, router, toast],
  );

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) void doSubmit(true);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [deadline, doSubmit]);

  function persist(examQuestionId: string, svar: StudentAnswer) {
    setSaveState("saving");
    if (timers.current[examQuestionId]) {
      clearTimeout(timers.current[examQuestionId]);
    }
    timers.current[examQuestionId] = setTimeout(async () => {
      const result = await saveAnswer(attemptId, examQuestionId, svar);
      setSaveState(result.error ? "idle" : "saved");
      if (!result.error) setTimeout(() => setSaveState("idle"), 1500);
    }, 600);
  }

  function setAnswer(examQuestionId: string, svar: StudentAnswer) {
    setAnswers((prev) => ({ ...prev, [examQuestionId]: svar }));
    persist(examQuestionId, svar);
  }

  const answeredCount = questions.filter((q) => {
    const a = answers[q.examQuestionId];
    return (
      a && ((a.valda_index && a.valda_index.length > 0) || (a.text && a.text.trim()))
    );
  }).length;

  const oneAtATime = exam.visningslage === "en_fraga";
  const visible = oneAtATime ? [questions[current]].filter(Boolean) : questions;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div>
          <h1 className="text-xl font-bold">{exam.titel}</h1>
          <div className="text-sm text-muted-foreground">
            {answeredCount} av {questions.length} besvarade
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          {remaining != null && <Timer seconds={remaining} />}
        </div>
      </div>

      {exam.instruktioner && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {exam.instruktioner}
          </CardContent>
        </Card>
      )}

      <Progress value={(answeredCount / Math.max(1, questions.length)) * 100} />

      {visible.map((q) => (
        <QuestionInput
          key={q.examQuestionId}
          question={q}
          answer={answers[q.examQuestionId]}
          onChange={(svar) => setAnswer(q.examQuestionId, svar)}
          totalQuestions={questions.length}
        />
      ))}

      {oneAtATime ? (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Föregående
          </Button>
          <span className="text-sm text-muted-foreground">
            Fråga {current + 1} / {questions.length}
          </span>
          {current < questions.length - 1 ? (
            <Button
              onClick={() =>
                setCurrent((c) => Math.min(questions.length - 1, c + 1))
              }
            >
              Nästa <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)}>
              <Send className="h-4 w-4" /> Lämna in
            </Button>
          )}
        </div>
      ) : (
        <div className="flex justify-end">
          <Button size="lg" onClick={() => setConfirmOpen(true)}>
            <Send className="h-4 w-4" /> Lämna in prov
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lämna in provet?</DialogTitle>
            <DialogDescription>
              Du har besvarat {answeredCount} av {questions.length} frågor. När
              du lämnat in kan du inte ändra dina svar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Fortsätt med provet
            </Button>
            <Button onClick={() => doSubmit(false)} disabled={submitting}>
              {submitting ? "Lämnar in…" : "Lämna in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sparar…
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <Check className="h-3.5 w-3.5" /> Sparat
      </span>
    );
  return <span className="text-xs text-muted-foreground">Autosparar</span>;
}

function Timer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const low = seconds < 300;
  return (
    <Badge variant={low ? "destructive" : "secondary"} className="gap-1">
      <Clock className="h-3.5 w-3.5" />
      {m}:{String(s).padStart(2, "0")}
    </Badge>
  );
}

function QuestionInput({
  question,
  answer,
  onChange,
  totalQuestions,
}: {
  question: RunnerQuestion;
  answer: StudentAnswer | undefined;
  onChange: (svar: StudentAnswer) => void;
  totalQuestions: number;
}) {
  const valda = answer?.valda_index ?? [];

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Fråga {question.ordning} av {totalQuestions}
          </span>
          <span>
            {question.poang} {question.poang === 1 ? "poäng" : "poäng"}
          </span>
        </div>
        <p className="text-lg font-medium">{question.fragetext}</p>

        {question.bildUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.bildUrl}
            alt="Bild till frågan"
            className="max-h-80 rounded-lg border"
          />
        )}

        {question.fragetyp === "flerval_ett" && question.alternativ && (
          <RadioGroup
            value={valda.length ? String(valda[0]) : ""}
            onValueChange={(v) => onChange({ valda_index: [Number(v)] })}
          >
            {question.alternativ.map((alt, i) => (
              <label
                key={i}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-slate-50"
              >
                <RadioGroupItem value={String(i)} />
                <span>{alt}</span>
              </label>
            ))}
          </RadioGroup>
        )}

        {question.fragetyp === "flerval_flera" && question.alternativ && (
          <div className="space-y-2">
            {question.alternativ.map((alt, i) => {
              const checked = valda.includes(i);
              return (
                <label
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-slate-50",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const next = c
                        ? [...valda, i].sort((a, b) => a - b)
                        : valda.filter((x) => x !== i);
                      onChange({ valda_index: next });
                    }}
                  />
                  <span>{alt}</span>
                </label>
              );
            })}
          </div>
        )}

        {question.fragetyp === "kortsvar" && (
          <Input
            value={answer?.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Ditt svar…"
          />
        )}

        {question.fragetyp === "fritext" && (
          <Textarea
            value={answer?.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Skriv ditt resonemang här…"
            rows={6}
          />
        )}
      </CardContent>
    </Card>
  );
}
