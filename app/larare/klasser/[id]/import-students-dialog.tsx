"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { importInvitations } from "../actions";

const EMAIL_RE = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/;

/** Plockar ut e-postadresser ur inklistrad text, en elev per rad. */
function parseEmails(raw: string): { emails: string[]; invalidLines: number } {
  const emails: string[] = [];
  let invalidLines = 0;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = line.match(EMAIL_RE);
    if (match) emails.push(match[0].toLowerCase());
    else invalidLines++;
  }
  return { emails: Array.from(new Set(emails)), invalidLines };
}

export function ImportStudentsDialog({ classId }: { classId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [working, setWorking] = useState(false);

  const parsed = useMemo(() => parseEmails(raw), [raw]);

  async function onImport() {
    setWorking(true);
    const result = await importInvitations(classId, parsed.emails);
    setWorking(false);
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Importen misslyckades",
        description: result.error,
      });
      return;
    }
    const parts = [`${result.created} inbjudningar skapade`];
    if (result.skipped) {
      parts.push(`${result.skipped} hoppades över (redan inbjudna/medlemmar)`);
    }
    if (result.emailsSent) parts.push(`${result.emailsSent} mejl skickade`);
    toast({
      variant: "success",
      title: "Elevlistan importerad",
      description: parts.join(" · "),
    });
    setRaw("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Importera elevlista
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importera elevlista</DialogTitle>
            <DialogDescription>
              Klistra in en lista med en elev per rad – t.ex. kopierad direkt
              från Excel eller ditt elevregister. Adresserna hittas automatiskt
              oavsett om raden innehåller namn, kommatecken eller
              tabbavgränsning.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={10}
            placeholder={`Anna Andersson, anna.andersson@skola.se\nOscar Berg\toscar.berg@skola.se\nleila.hassan@skola.se`}
            className="font-mono text-sm"
          />

          <div className="text-sm text-muted-foreground">
            {parsed.emails.length > 0 ? (
              <span className="text-foreground font-medium">
                {parsed.emails.length} e-postadresser hittade
              </span>
            ) : (
              "Inga e-postadresser hittade ännu."
            )}
            {parsed.invalidLines > 0 &&
              ` · ${parsed.invalidLines} rader utan giltig adress ignoreras`}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button
              onClick={onImport}
              disabled={working || parsed.emails.length === 0}
            >
              {working
                ? "Importerar…"
                : `Bjud in ${parsed.emails.length} elever`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
