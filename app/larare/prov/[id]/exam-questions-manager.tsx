"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuestionView } from "@/components/questions/question-view";
import { useToast } from "@/components/ui/use-toast";
import { sourceLabel } from "@/lib/constants";
import type { QuestionBankItem } from "@/lib/types";
import type { ExamQuestionWithBank } from "./page";
import {
  addExamQuestion,
  removeExamQuestion,
  updateExamQuestionPoints,
} from "../actions";

export function ExamQuestionsManager({
  examId,
  isDraft,
  questions,
  availableQuestions,
}: {
  examId: string;
  isDraft: boolean;
  questions: ExamQuestionWithBank[];
  availableQuestions: QuestionBankItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAvailable = availableQuestions.filter(
    (q) =>
      !search ||
      q.fragetext.toLowerCase().includes(search.toLowerCase()) ||
      q.centralt_innehall.toLowerCase().includes(search.toLowerCase()),
  );

  async function onRemove(eqId: string) {
    const result = await removeExamQuestion(examId, eqId);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    router.refresh();
  }

  async function onAdd(questionId: string) {
    const result = await addExamQuestion(examId, questionId);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({ title: "Fråga tillagd" });
    router.refresh();
  }

  async function onPoints(eqId: string, poang: number) {
    await updateExamQuestionPoints(examId, eqId, poang);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Frågor i provet</CardTitle>
          <CardDescription>
            {isDraft
              ? "Förhandsgranska, byt ut eller lägg till frågor innan publicering."
              : "Provet är publicerat och kan inte längre redigeras."}
          </CardDescription>
        </div>
        {isDraft && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" /> Lägg till från banken
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Lägg till fråga</DialogTitle>
                <DialogDescription>
                  Välj en fråga från din frågebank i samma ämne.
                </DialogDescription>
              </DialogHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Sök fråga…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[50vh] space-y-3 overflow-y-auto">
                {filteredAvailable.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Inga fler frågor i banken.
                  </p>
                ) : (
                  filteredAvailable.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <QuestionView
                          fragetext={q.fragetext}
                          fragetyp={q.fragetyp}
                          alternativ={q.alternativ}
                          facit={q.facit}
                          niva={q.niva}
                          poang={q.poang}
                          centralt_innehall={q.centralt_innehall}
                          showFacit={false}
                          bildUrl={q.bild_url}
                        />
                      </div>
                      <Button size="sm" onClick={() => onAdd(q.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Provet innehåller inga frågor ännu.
          </p>
        ) : (
          questions.map((eq) => (
            <div key={eq.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <QuestionView
                    ordning={eq.ordning}
                    fragetext={eq.question_bank.fragetext}
                    fragetyp={eq.question_bank.fragetyp}
                    alternativ={eq.question_bank.alternativ}
                    facit={eq.question_bank.facit}
                    bedomningsanvisning={eq.question_bank.bedomningsanvisning}
                    niva={eq.question_bank.niva}
                    centralt_innehall={eq.question_bank.centralt_innehall}
                    bildUrl={eq.question_bank.bild_url}
                  />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">
                    {sourceLabel(eq.question_bank.kalla)}
                  </Badge>
                  {isDraft ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          value={eq.poang}
                          onChange={(e) =>
                            onPoints(eq.id, Number(e.target.value))
                          }
                          className="w-16 h-8"
                        />
                        <span className="text-xs text-muted-foreground">p</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(eq.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm font-medium">{eq.poang} p</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
