"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
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
import { subjectLabel } from "@/lib/constants";
import type { Class } from "@/lib/types";
import { duplicateExam } from "../actions";

export function DuplicateExamDialog({
  examId,
  currentClassId,
  currentSubject,
  classes,
}: {
  examId: string;
  currentClassId: string;
  currentSubject: string;
  classes: Pick<Class, "id" | "name" | "amne" | "arskurs">[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState(currentClassId);
  const [loading, setLoading] = useState(false);

  const target = classes.find((c) => c.id === targetId);
  const differentSubject = target && target.amne !== currentSubject;

  async function onDuplicate() {
    setLoading(true);
    const result = await duplicateExam(examId, targetId);
    setLoading(false);
    if (result.error || !result.examId) {
      toast({
        variant: "destructive",
        title: "Kunde inte duplicera provet",
        description: result.error,
      });
      return;
    }
    toast({
      variant: "success",
      title: "Provet duplicerat",
      description:
        "Kopian är ett utkast – justera tidsfönstret och publicera när du är redo.",
    });
    setOpen(false);
    router.push(`/larare/prov/${result.examId}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Copy className="h-4 w-4" /> Duplicera
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicera prov</DialogTitle>
          <DialogDescription>
            Skapar en kopia som nytt utkast med samma frågor. Tidsfönstret
            nollställs – perfekt för parallellklasser eller nästa läsår.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Till klass</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({subjectLabel(c.amne)}, åk {c.arskurs})
                  {c.id === currentClassId ? " – nuvarande" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {differentSubject && (
            <p className="text-xs text-amber-700">
              Obs: klassen har ett annat ämne än provet – frågorna följer med
              oförändrade.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={onDuplicate} disabled={loading}>
            {loading ? "Duplicerar…" : "Duplicera"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
