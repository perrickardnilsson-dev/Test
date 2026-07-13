import Link from "next/link";
import { CheckCircle2, Clock, FileText, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubjectBadge } from "@/components/subject-badge";
import { formatDateTime } from "@/lib/utils";
import type { Attempt, Class, Exam } from "@/lib/types";

type ExamRow = Exam & {
  classes: Pick<Class, "name" | "amne" | "arskurs">;
};

export default async function StudentDashboard() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { data: exams } = await supabase
    .from("exams")
    .select("*, classes(name, amne, arskurs)")
    .in("status", ["publicerat", "rattat"])
    .order("created_at", { ascending: false });

  const examList = (exams as ExamRow[]) ?? [];

  const { data: attempts } = await supabase
    .from("attempts")
    .select("*")
    .eq("student_id", profile.id);
  const attemptMap = new Map(
    ((attempts as Attempt[]) ?? []).map((a) => [a.exam_id, a]),
  );

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Hej {profile.name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">Här är dina tilldelade prov.</p>
      </div>

      {examList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Inga prov just nu</p>
            <p className="text-sm text-muted-foreground">
              När din lärare publicerar ett prov dyker det upp här.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/elev/klasser">Gå med i en klass</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {examList.map((e) => {
            const attempt = attemptMap.get(e.id);
            const submitted = attempt?.inlamnad != null;
            const started = attempt != null;
            const resultsReady = e.status === "rattat";

            const opensAt = e.oppnar ? new Date(e.oppnar).getTime() : null;
            // Förlängd tid för eleven skjuter fram stängningen.
            const closesAt = e.stanger
              ? new Date(e.stanger).getTime() +
                (attempt?.extra_minuter ?? 0) * 60000
              : null;
            const notOpenYet = opensAt != null && opensAt > now;
            const closed = closesAt != null && closesAt < now;

            let statusBadge = (
              <Badge variant="default">Ej påbörjat</Badge>
            );
            if (resultsReady && submitted) {
              statusBadge = <Badge variant="success">Rättat</Badge>;
            } else if (submitted) {
              statusBadge = <Badge variant="secondary">Inlämnat</Badge>;
            } else if (started) {
              statusBadge = <Badge variant="warning">Påbörjat</Badge>;
            } else if (notOpenYet) {
              statusBadge = <Badge variant="secondary">Öppnar snart</Badge>;
            } else if (closed) {
              statusBadge = <Badge variant="secondary">Stängt</Badge>;
            }

            return (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <div className="font-semibold">{e.titel}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                      <SubjectBadge subject={e.classes.amne} />
                      <span>{e.classes.name}</span>
                      {e.tidsgrans_minuter && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {e.tidsgrans_minuter} min
                        </span>
                      )}
                      {e.stanger && <span>· Stänger {formatDateTime(e.stanger)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {statusBadge}
                    {resultsReady && submitted && attempt ? (
                      <Button size="sm" asChild>
                        <Link href={`/elev/resultat/${attempt.id}`}>
                          <CheckCircle2 className="h-4 w-4" /> Se resultat
                        </Link>
                      </Button>
                    ) : submitted ? (
                      <span className="text-xs text-muted-foreground">
                        Väntar på rättning
                      </span>
                    ) : notOpenYet ? (
                      <span className="text-xs text-muted-foreground">
                        Öppnar {formatDateTime(e.oppnar)}
                      </span>
                    ) : closed ? (
                      <span className="text-xs text-muted-foreground">
                        Provet är stängt
                      </span>
                    ) : (
                      <Button size="sm" asChild>
                        <Link href={`/elev/prov/${e.id}`}>
                          <PlayCircle className="h-4 w-4" />
                          {started ? "Fortsätt" : "Starta prov"}
                        </Link>
                      </Button>
                    )}
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
