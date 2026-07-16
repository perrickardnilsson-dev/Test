"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { LEVELS, QUESTION_TYPES, subjectLabel } from "@/lib/constants";
import { CENTRALT_INNEHALL } from "@/lib/lgr22";
import type { Class, Level, QuestionType, Subject } from "@/lib/types";

export function NewExamForm({
  classes,
  defaultClassId,
}: {
  classes: Class[];
  defaultClassId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [classId, setClassId] = useState(defaultClassId ?? classes[0]?.id ?? "");
  const [titel, setTitel] = useState("");
  const [instruktioner, setInstruktioner] = useState("");
  const [niva, setNiva] = useState<Level>("E");
  const [content, setContent] = useState<string[]>([]);
  const [types, setTypes] = useState<QuestionType[]>([
    "flerval_ett",
    "kortsvar",
    "fritext",
  ]);
  const [antalBank, setAntalBank] = useState(4);
  const [antalAi, setAntalAi] = useState(4);
  const [loading, setLoading] = useState(false);

  const selectedClass = classes.find((c) => c.id === classId);
  const availableContent = useMemo(
    () =>
      selectedClass ? CENTRALT_INNEHALL[selectedClass.amne as Subject] : [],
    [selectedClass],
  );

  function toggleContent(ci: string) {
    setContent((prev) =>
      prev.includes(ci) ? prev.filter((x) => x !== ci) : [...prev, ci],
    );
  }

  function toggleType(t: QuestionType) {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  async function onGenerate() {
    if (!classId || !titel.trim()) {
      toast({ variant: "destructive", title: "Ange klass och titel" });
      return;
    }
    if (content.length === 0) {
      toast({
        variant: "destructive",
        title: "Välj minst ett arbetsområde",
      });
      return;
    }
    if (types.length === 0) {
      toast({ variant: "destructive", title: "Välj minst en frågetyp" });
      return;
    }
    if (antalBank + antalAi === 0) {
      toast({ variant: "destructive", title: "Provet behöver minst en fråga" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/larare/prov/generera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          titel: titel.trim(),
          instruktioner: instruktioner.trim() || null,
          centralt_innehall: content,
          niva,
          fragetyper: types,
          antal_bank: antalBank,
          antal_ai: antalAi,
        }),
      });
      const data = await res.json();
      const warnings = (data.warnings as string[] | undefined) ?? [];
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Kunde inte skapa provet",
          description: data.error,
        });
        setLoading(false);
        return;
      }
      toast({
        variant: warnings?.length ? "default" : "success",
        title: "Prov skapat",
        description:
          warnings?.length > 0
            ? `${data.questionCount ?? ""} frågor lades till. ${warnings.join(" ")}`
            : `${data.questionCount ?? ""} frågor lades till. Förhandsgranska innan du publicerar.`,
      });
      router.push(`/larare/prov/${data.examId}`);
    } catch {
      toast({ variant: "destructive", title: "Ett fel uppstod" });
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grunduppgifter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Klass</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Välj klass" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({subjectLabel(c.amne)}, åk {c.arskurs})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="T.ex. Prov: Energi och energiomvandlingar"
            />
          </div>
          <div className="space-y-2">
            <Label>Instruktioner till eleverna (valfritt)</Label>
            <Textarea
              value={instruktioner}
              onChange={(e) => setInstruktioner(e.target.value)}
              placeholder="T.ex. Motivera dina svar. Hjälpmedel: miniräknare."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Innehåll och nivå</CardTitle>
          <CardDescription>
            Centralt innehåll enligt Lgr22 för {" "}
            {selectedClass ? subjectLabel(selectedClass.amne) : "ämnet"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Arbetsområden</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {availableContent.map((ci) => (
                <label
                  key={ci}
                  className="flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-slate-50"
                >
                  <Checkbox
                    checked={content.includes(ci)}
                    onCheckedChange={() => toggleContent(ci)}
                    className="mt-0.5"
                  />
                  <span>{ci}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Svårighetsnivå</Label>
            <Select value={niva} onValueChange={(v) => setNiva(v as Level)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label} – {l.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Frågetyper</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUESTION_TYPES.map((t) => (
                <label
                  key={t.value}
                  className="flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-slate-50"
                >
                  <Checkbox
                    checked={types.includes(t.value)}
                    onCheckedChange={() => toggleType(t.value)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">{t.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Antal frågor</CardTitle>
          <CardDescription>
            Blanda riktiga frågor från banken med nygenererade AI-frågor.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Från frågebanken (NP + egna)</Label>
            <Input
              type="number"
              min={0}
              value={antalBank}
              onChange={(e) => setAntalBank(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div className="space-y-2">
            <Label>AI-genererade</Label>
            <Input
              type="number"
              min={0}
              value={antalAi}
              onChange={(e) => setAntalAi(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={onGenerate} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Genererar prov…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generera prov
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
