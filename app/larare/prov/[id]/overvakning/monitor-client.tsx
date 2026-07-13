"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  PenLine,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/lib/utils";
import type { Attempt, Profile } from "@/lib/types";
import { extendAttemptTime, reopenAttempt } from "../../actions";

type Member = {
  student_id: string;
  profiles: Pick<Profile, "id" | "name" | "email">;
};

export function MonitorClient({
  examId,
  tidsgransMinuter,
  questionCount,
  members,
  attempts,
  answeredCount,
}: {
  examId: string;
  tidsgransMinuter: number | null;
  questionCount: number;
  members: Member[];
  attempts: Attempt[];
  answeredCount: Record<string, number>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [extendFor, setExtendFor] = useState<Attempt | null>(null);
  const [extraMinutes, setExtraMinutes] = useState("10");
  const [working, setWorking] = useState(false);

  // Uppdatera vyn automatiskt var tionde sekund under pågående prov.
  useEffect(() => {
    const iv = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(iv);
  }, [router]);

  const attemptByStudent = new Map(attempts.map((a) => [a.student_id, a]));

  const submitted = attempts.filter((a) => a.inlamnad).length;
  const inProgress = attempts.filter((a) => !a.inlamnad).length;
  const notStarted = members.length - attempts.length;

  async function onReopen(attempt: Attempt) {
    setWorking(true);
    const result = await reopenAttempt(examId, attempt.id);
    setWorking(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({
      variant: "success",
      title: "Försöket återöppnat",
      description:
        "Eleven kan fortsätta skriva. Förläng tiden om provet hunnit stänga.",
    });
    router.refresh();
  }

  async function onExtend() {
    if (!extendFor) return;
    setWorking(true);
    const result = await extendAttemptTime(
      examId,
      extendFor.id,
      Number(extraMinutes),
    );
    setWorking(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({
      variant: "success",
      title: "Tiden förlängd",
      description: `Eleven har nu ${extraMinutes} minuter extra.`,
    });
    setExtendFor(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CircleDashed className="h-8 w-8 text-slate-400" />
            <div>
              <div className="text-2xl font-bold">{notStarted}</div>
              <div className="text-sm text-muted-foreground">Ej startat</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PenLine className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">{inProgress}</div>
              <div className="text-sm text-muted-foreground">Skriver nu</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold">{submitted}</div>
              <div className="text-sm text-muted-foreground">Inlämnade</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {members.map((m) => {
            const attempt = attemptByStudent.get(m.student_id);
            const answered = attempt ? (answeredCount[attempt.id] ?? 0) : 0;
            const share = questionCount
              ? Math.round((answered / questionCount) * 100)
              : 0;

            return (
              <div
                key={m.student_id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <div className="font-medium">{m.profiles.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {m.profiles.email}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {attempt ? (
                    <>
                      <div className="w-40">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>
                            {answered} / {questionCount} besvarade
                          </span>
                          <span>{share}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>

                      {attempt.extra_minuter > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />+{attempt.extra_minuter}{" "}
                          min
                        </Badge>
                      )}

                      {attempt.inlamnad ? (
                        <>
                          <Badge variant="success">
                            Inlämnat {formatDateTime(attempt.inlamnad)}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={working}
                            onClick={() => onReopen(attempt)}
                          >
                            <RotateCcw className="h-4 w-4" /> Återöppna
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="warning">Skriver</Badge>
                          {tidsgransMinuter != null && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExtendFor(attempt);
                                setExtraMinutes(
                                  String(attempt.extra_minuter + 10),
                                );
                              }}
                            >
                              <Clock className="h-4 w-4" /> Förläng tid
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <Badge variant="secondary">Ej startat</Badge>
                  )}
                </div>
              </div>
            );
          })}
          {members.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Inga elever i klassen ännu.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={extendFor != null}
        onOpenChange={(open) => !open && setExtendFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Förläng tid för eleven</DialogTitle>
            <DialogDescription>
              Extra minuter läggs på elevens tidsgräns
              {tidsgransMinuter ? ` (ordinarie ${tidsgransMinuter} min)` : ""} och
              skjuter fram provets stängningstid för just den här eleven.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={extraMinutes}
              onChange={(e) => setExtraMinutes(e.target.value)}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">
              minuter extra totalt
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendFor(null)}>
              Avbryt
            </Button>
            <Button onClick={onExtend} disabled={working}>
              {working ? "Sparar…" : "Förläng tid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
