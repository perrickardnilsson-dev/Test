"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  QuestionEditor,
  emptyQuestion,
  type EditableQuestion,
} from "@/components/questions/question-editor";
import { SUBJECTS } from "@/lib/constants";
import type { QuestionBankItem, Subject } from "@/lib/types";
import { saveQuestion } from "./actions";

export function QuestionDialog({
  mode,
  question,
  trigger,
}: {
  mode: "create" | "edit";
  question?: QuestionBankItem;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amne, setAmne] = useState<Subject | "">(
    (question?.amne as Subject) ?? "",
  );
  const [q, setQ] = useState<EditableQuestion>(
    question
      ? {
          fragetyp: question.fragetyp,
          fragetext: question.fragetext,
          alternativ: question.alternativ,
          facit: question.facit,
          bedomningsanvisning: question.bedomningsanvisning,
          niva: question.niva,
          arskurs: question.arskurs,
          centralt_innehall: question.centralt_innehall,
          poang: question.poang,
        }
      : emptyQuestion(),
  );

  async function onSave() {
    if (!amne) {
      toast({ variant: "destructive", title: "Välj ett ämne" });
      return;
    }
    if (!q.fragetext.trim()) {
      toast({ variant: "destructive", title: "Frågetext saknas" });
      return;
    }
    setLoading(true);
    const result = await saveQuestion(
      { ...q, amne, kalla: question?.kalla ?? "egen" },
      question?.id,
    );
    setLoading(false);
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Kunde inte spara",
        description: result.error,
      });
      return;
    }
    toast({ variant: "success", title: "Fråga sparad" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" /> Ny fråga
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Ny fråga" : "Redigera fråga"}
          </DialogTitle>
          <DialogDescription>
            Egna frågor sparas i din frågebank och kan användas i prov.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ämne</Label>
            <Select value={amne} onValueChange={(v) => setAmne(v as Subject)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Välj ämne" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <QuestionEditor value={q} onChange={setQ} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={onSave} disabled={loading}>
            {loading ? "Sparar…" : "Spara fråga"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
