import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubjectBadge } from "@/components/subject-badge";
import { EXAM_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { Class, Exam } from "@/lib/types";

const STATUS_VARIANT = {
  utkast: "secondary",
  publicerat: "default",
  rattat: "success",
} as const;

export default async function ProvPage() {
  const supabase = await createClient();
  const { data: exams } = await supabase
    .from("exams")
    .select("*, classes(name, amne, arskurs)")
    .order("created_at", { ascending: false });

  const list =
    (exams as (Exam & { classes: Pick<Class, "name" | "amne" | "arskurs"> })[]) ??
    [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prov</h1>
          <p className="text-muted-foreground">
            Skapa och publicera prov till dina klasser.
          </p>
        </div>
        <Button asChild>
          <Link href="/larare/prov/nytt">
            <Plus className="h-4 w-4" /> Nytt prov
          </Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Inga prov ännu</p>
            <p className="text-sm text-muted-foreground">
              Skapa ett prov genom att blanda frågor från banken med
              AI-genererade.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((e) => (
            <Link key={e.id} href={`/larare/prov/${e.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <div className="font-semibold">{e.titel}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      {e.classes && (
                        <>
                          <SubjectBadge subject={e.classes.amne} />
                          <span>
                            {e.classes.name} · åk {e.classes.arskurs}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={STATUS_VARIANT[e.status]}>
                      {EXAM_STATUS_LABELS[e.status]}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(e.created_at)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
