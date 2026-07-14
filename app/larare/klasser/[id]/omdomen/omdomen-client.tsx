"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ClipboardCopy,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/lib/utils";
import { saveStudentReport } from "../../actions";

type Student = { id: string; name: string; email: string };
type SavedReport = { innehall: string; updatedAt: string };

type ReportDraft = {
  styrkor: string[];
  utvecklingsomraden: string[];
  nasta_steg: string[];
  omdome: string;
};

function draftToText(draft: ReportDraft): string {
  const bullets = (items: string[]) =>
    items.map((s) => `• ${s}`).join("\n");
  return `${draft.omdome}

Styrkor:
${bullets(draft.styrkor)}

Utvecklingsområden:
${bullets(draft.utvecklingsomraden)}

Nästa steg:
${bullets(draft.nasta_steg)}`;
}

export function OmdomenClient({
  classId,
  students,
  initialReports,
  hasGradedExams,
}: {
  classId: string;
  students: Student[];
  initialReports: Record<string, SavedReport>;
  hasGradedExams: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      students.map((s) => [s.id, initialReports[s.id]?.innehall ?? ""]),
    ),
  );
  const [generating, setGenerating] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function onGenerate(student: Student) {
    setGenerating(student.id);
    try {
      const res = await fetch("/api/larare/omdome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, studentId: student.id }),
      });
      const data = (await res.json()) as {
        draft?: ReportDraft;
        error?: string;
      };
      if (!res.ok || !data.draft) {
        toast({
          variant: "destructive",
          title: "Kunde inte generera utkast",
          description: data.error ?? "Okänt fel",
        });
        return;
      }
      setTexts((prev) => ({ ...prev, [student.id]: draftToText(data.draft!) }));
      toast({
        variant: "success",
        title: `Utkast klart för ${student.name.split(" ")[0]}`,
        description: "Läs igenom, redigera och spara.",
      });
    } finally {
      setGenerating(null);
    }
  }

  async function onSave(student: Student) {
    const text = texts[student.id]?.trim();
    if (!text) return;
    setSaving(student.id);
    const result = await saveStudentReport(classId, student.id, text);
    setSaving(null);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({ variant: "success", title: "Omdömet sparat" });
    router.refresh();
  }

  function onCopy(student: Student) {
    const text = texts[student.id];
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(student.id);
    setTimeout(() => setCopied(null), 2000);
  }

  function onCopyAll() {
    const parts = students
      .filter((s) => texts[s.id]?.trim())
      .map((s) => `=== ${s.name} ===\n\n${texts[s.id].trim()}`);
    if (parts.length === 0) {
      toast({ title: "Inga omdömen att kopiera ännu" });
      return;
    }
    navigator.clipboard.writeText(parts.join("\n\n\n"));
    toast({
      variant: "success",
      title: `${parts.length} omdömen kopierade`,
      description: "Klistra in i valfritt dokument eller system.",
    });
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Inga elever i klassen ännu.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onCopyAll}>
          <ClipboardCopy className="h-4 w-4" /> Kopiera alla
        </Button>
      </div>

      {students.map((student) => {
        const saved = initialReports[student.id];
        const text = texts[student.id] ?? "";
        const dirty = text.trim() !== (saved?.innehall ?? "").trim();

        return (
          <Card key={student.id}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3">
              <div>
                <div className="font-semibold">{student.name}</div>
                <div className="text-sm text-muted-foreground">
                  {student.email}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {saved && !dirty && (
                  <Badge variant="secondary">
                    Sparat {formatDateTime(saved.updatedAt)}
                  </Badge>
                )}
                {dirty && text.trim() && (
                  <Badge variant="warning">Osparade ändringar</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {text ? (
                <Textarea
                  value={text}
                  onChange={(e) =>
                    setTexts((prev) => ({
                      ...prev,
                      [student.id]: e.target.value,
                    }))
                  }
                  rows={12}
                  className="font-normal"
                />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Inget omdöme ännu – generera ett AI-utkast utifrån elevens
                  provresultat.
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerate(student)}
                  disabled={generating != null || !hasGradedExams}
                  title={
                    hasGradedExams
                      ? undefined
                      : "Det behövs minst ett rättat prov i klassen"
                  }
                >
                  {generating === student.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Genererar…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {text ? "Generera nytt utkast" : "Generera AI-utkast"}
                    </>
                  )}
                </Button>
                {text.trim() && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onSave(student)}
                      disabled={saving === student.id || !dirty}
                    >
                      <Save className="h-4 w-4" />
                      {saving === student.id ? "Sparar…" : "Spara"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopy(student)}
                    >
                      {copied === student.id ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />{" "}
                          Kopierat
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="h-4 w-4" /> Kopiera
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
