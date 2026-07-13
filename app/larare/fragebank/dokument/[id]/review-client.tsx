"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { QuestionView } from "@/components/questions/question-view";
import {
  QuestionEditor,
  type EditableQuestion,
} from "@/components/questions/question-editor";
import type { ExtractedQuestion, Subject } from "@/lib/types";
import { approveExtractedQuestions } from "../../actions";

type Row = { q: EditableQuestion; selected: boolean; editing: boolean };

export function ReviewClient({
  documentId,
  amne,
  initial,
}: {
  documentId: string;
  amne: Subject;
  initial: ExtractedQuestion[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>(
    initial.map((q) => ({ q, selected: true, editing: false })),
  );
  const [saving, setSaving] = useState(false);

  const selectedCount = rows.filter((r) => r.selected).length;

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function remove(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function approve() {
    const chosen = rows.filter((r) => r.selected).map((r) => r.q);
    if (chosen.length === 0) {
      toast({ variant: "destructive", title: "Välj minst en fråga" });
      return;
    }
    setSaving(true);
    const result = await approveExtractedQuestions(documentId, chosen);
    setSaving(false);
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Kunde inte spara",
        description: result.error,
      });
      return;
    }
    toast({
      variant: "success",
      title: "Frågor sparade",
      description: `${result.count} frågor lades till i frågebanken.`,
    });
    router.push("/larare/fragebank");
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Inga frågor att granska.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm">
          <span className="font-medium">{selectedCount}</span> av {rows.length}{" "}
          frågor valda
        </div>
        <Button onClick={approve} disabled={saving || selectedCount === 0}>
          <CheckCircle2 className="h-4 w-4" />
          {saving ? "Sparar…" : `Godkänn ${selectedCount} frågor`}
        </Button>
      </div>

      {rows.map((row, i) => (
        <Card key={i} className={row.selected ? "" : "opacity-60"}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={row.selected}
                onCheckedChange={(c) => update(i, { selected: !!c })}
                className="mt-1"
              />
              <div className="flex-1 space-y-3">
                {row.editing ? (
                  <QuestionEditor
                    value={row.q}
                    onChange={(q) => update(i, { q })}
                  />
                ) : (
                  <QuestionView
                    fragetext={row.q.fragetext}
                    fragetyp={row.q.fragetyp}
                    alternativ={row.q.alternativ}
                    facit={row.q.facit}
                    bedomningsanvisning={row.q.bedomningsanvisning}
                    niva={row.q.niva}
                    poang={row.q.poang}
                    centralt_innehall={row.q.centralt_innehall}
                    bildUrl={row.q.bild_url}
                  />
                )}
                <Separator />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => update(i, { editing: !row.editing })}
                  >
                    {row.editing ? (
                      <>
                        <ChevronUp className="h-4 w-4" /> Klar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" /> Redigera
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" /> Ta bort
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
