"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Pencil, Trash2, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubjectBadge } from "@/components/subject-badge";
import { QuestionView } from "@/components/questions/question-view";
import { useToast } from "@/components/ui/use-toast";
import { SUBJECTS, sourceLabel } from "@/lib/constants";
import type { QuestionBankItem, Subject } from "@/lib/types";
import { QuestionDialog } from "./question-dialog";
import { deleteQuestion } from "./actions";
import { toggleQuestionShared } from "../amneslag/actions";

export type QuestionWithOwner = QuestionBankItem & {
  profiles: { name: string } | null;
};

export function QuestionsClient({
  questions,
  currentUserId,
  inSchool,
}: {
  questions: QuestionWithOwner[];
  currentUserId: string;
  inSchool: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState<string>("alla");

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (subject !== "alla" && q.amne !== subject) return false;
      if (
        search &&
        !q.fragetext.toLowerCase().includes(search.toLowerCase()) &&
        !q.centralt_innehall.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [questions, search, subject]);

  async function onDelete(id: string) {
    const result = await deleteQuestion(id);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({ title: "Fråga borttagen" });
    router.refresh();
  }

  async function onToggleShared(q: QuestionWithOwner) {
    const result = await toggleQuestionShared(q.id, !q.delad);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({
      title: q.delad
        ? "Frågan delas inte längre"
        : "Frågan delas med ämneslaget",
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Sök fråga eller arbetsområde…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alla">Alla ämnen</SelectItem>
              {SUBJECTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <QuestionDialog mode="create" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Library className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Inga frågor</p>
            <p className="text-sm text-muted-foreground">
              Skapa en egen fråga eller tolka ett nationellt prov.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((q) => {
            const isOwn = q.owner_id === currentUserId;
            const isColleague = q.owner_id != null && !isOwn;
            return (
              <Card key={q.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <QuestionView
                        fragetext={q.fragetext}
                        fragetyp={q.fragetyp}
                        alternativ={q.alternativ}
                        facit={q.facit}
                        bedomningsanvisning={q.bedomningsanvisning}
                        niva={q.niva}
                        poang={q.poang}
                        centralt_innehall={q.centralt_innehall}
                        bildUrl={q.bild_url}
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <SubjectBadge subject={q.amne as Subject} />
                        <span className="text-muted-foreground">
                          Åk {q.arskurs} · {sourceLabel(q.kalla)}
                        </span>
                        {isOwn && q.delad && (
                          <Badge variant="secondary" className="gap-1">
                            <UsersRound className="h-3 w-3" /> Delas med
                            ämneslaget
                          </Badge>
                        )}
                        {isColleague && (
                          <Badge variant="secondary" className="gap-1">
                            <UsersRound className="h-3 w-3" /> Delad av{" "}
                            {q.profiles?.name ?? "kollega"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {isOwn ? (
                        <>
                          <QuestionDialog
                            mode="edit"
                            question={q}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(q.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          {(inSchool || q.delad) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onToggleShared(q)}
                              title={
                                q.delad
                                  ? "Sluta dela med ämneslaget"
                                  : "Dela med ämneslaget"
                              }
                            >
                              <UsersRound
                                className={
                                  q.delad
                                    ? "h-4 w-4 text-primary"
                                    : "h-4 w-4 text-muted-foreground"
                                }
                              />
                            </Button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {isColleague ? "Kollegas" : "Exempel"}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
