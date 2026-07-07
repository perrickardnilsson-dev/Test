"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LevelBadge } from "@/components/subject-badge";
import { useToast } from "@/components/ui/use-toast";
import { QuestionView } from "@/components/questions/question-view";
import type { Facit, Grading, QuestionType } from "@/lib/types";
import { updateGrading } from "../../actions";

export function GradingRow({
  examId,
  ordning,
  maxPoang,
  isAuto,
  fragetext,
  fragetyp,
  alternativ,
  facit,
  bedomningsanvisning,
  studentText,
  grading,
}: {
  examId: string;
  ordning: number;
  maxPoang: number;
  isAuto: boolean;
  fragetext: string;
  fragetyp: QuestionType;
  alternativ: string[] | null;
  facit: Facit;
  bedomningsanvisning: string | null;
  studentText: string;
  grading: Grading | undefined;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const initialPoints =
    grading?.larare_poang ??
    grading?.auto_poang ??
    grading?.ai_forslag_poang ??
    0;
  const [poang, setPoang] = useState<number>(initialPoints);
  const [kommentar, setKommentar] = useState(grading?.larare_kommentar ?? "");
  const [saving, setSaving] = useState(false);
  const approved = grading?.status === "godkand";

  async function save(status: "vantar" | "godkand") {
    if (!grading) {
      toast({
        variant: "destructive",
        title: "Kör AI-rättningen först",
      });
      return;
    }
    setSaving(true);
    const result = await updateGrading(examId, grading.id, {
      larare_poang: Math.min(maxPoang, Math.max(0, poang)),
      larare_kommentar: kommentar.trim() || null,
      status,
    });
    setSaving(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    router.refresh();
  }

  if (isAuto) {
    const correct = (grading?.auto_poang ?? 0) >= maxPoang;
    return (
      <div className="rounded-lg border p-4">
        <QuestionView
          ordning={ordning}
          fragetext={fragetext}
          fragetyp={fragetyp}
          alternativ={alternativ}
          facit={facit}
          showFacit
        />
        <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
          <span>
            Elevens svar:{" "}
            <span className="font-medium">{studentText || "(inget svar)"}</span>
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={correct ? "success" : "destructive"}>
              {correct ? "Rätt" : "Fel"}
            </Badge>
            <span className="font-medium">
              {grading?.auto_poang ?? 0} / {maxPoang} p
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <QuestionView
        ordning={ordning}
        fragetext={fragetext}
        fragetyp={fragetyp}
        alternativ={alternativ}
        facit={facit}
        bedomningsanvisning={bedomningsanvisning}
        showFacit
      />

      <div className="rounded-md bg-slate-50 p-3 text-sm">
        <div className="font-medium text-muted-foreground mb-1">
          Elevens svar
        </div>
        <p className="whitespace-pre-wrap">{studentText || "(inget svar)"}</p>
      </div>

      {grading?.ai_motivering ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-blue-800 mb-1">
            <Bot className="h-4 w-4" /> AI-förslag: {grading.ai_forslag_poang} /{" "}
            {maxPoang} p
            {grading.ai_niva && <LevelBadge level={grading.ai_niva} />}
          </div>
          <p className="text-blue-900">{grading.ai_motivering}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Inget AI-förslag ännu – kör AI-rättningen.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Poäng (max {maxPoang})
          </label>
          <Input
            type="number"
            min={0}
            max={maxPoang}
            step={0.5}
            value={poang}
            onChange={(e) => setPoang(Number(e.target.value))}
            className="w-24"
          />
        </div>
        <div className="flex-1 space-y-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">
            Kommentar till eleven (valfritt)
          </label>
          <Textarea
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            rows={2}
          />
        </div>
        <div className="flex flex-col gap-2">
          {approved ? (
            <Badge variant="success" className="justify-center py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Godkänd
            </Badge>
          ) : (
            <Badge variant="warning" className="justify-center py-1.5">
              Väntar
            </Badge>
          )}
          <Button
            size="sm"
            onClick={() => save("godkand")}
            disabled={saving || !grading}
          >
            <Check className="h-4 w-4" /> Godkänn
          </Button>
        </div>
      </div>
    </div>
  );
}
