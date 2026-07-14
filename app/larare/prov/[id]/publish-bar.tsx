"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";
import { deleteExam, publishExam } from "../actions";

export function PublishBar({
  examId,
  questionCount,
}: {
  examId: string;
  questionCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function onPublish() {
    setPublishing(true);
    const result = await publishExam(examId);
    setPublishing(false);
    setConfirmOpen(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({
      variant: "success",
      title: "Provet är publicerat!",
      description: "Eleverna i klassen kan nu se och göra provet.",
    });
    router.refresh();
  }

  async function onDelete() {
    const result = await deleteExam(examId);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    router.push("/larare/prov");
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/90 backdrop-blur">
      <div className="container flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {questionCount} frågor · Kontrollera innehållet innan du publicerar.
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Radera utkast
          </Button>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button disabled={questionCount === 0}>
                <Send className="h-4 w-4" /> Publicera till klassen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publicera provet?</DialogTitle>
                <DialogDescription>
                  När provet publicerats kan eleverna göra det inom tidsfönstret.
                  Frågorna kan inte längre redigeras efter publicering.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={onPublish} disabled={publishing}>
                  {publishing ? "Publicerar…" : "Publicera"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
