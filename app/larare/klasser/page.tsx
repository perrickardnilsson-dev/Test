import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SubjectBadge } from "@/components/subject-badge";
import type { Class } from "@/lib/types";
import { CreateClassDialog } from "./create-class-dialog";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*, class_members(count)")
    .order("created_at");

  const classList = (classes as (Class & {
    class_members: { count: number }[];
  })[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Klasser</h1>
          <p className="text-muted-foreground">
            Skapa klasser och bjud in dina elever.
          </p>
        </div>
        <CreateClassDialog />
      </div>

      {classList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Inga klasser ännu</p>
            <p className="text-sm text-muted-foreground">
              Skapa din första klass för att komma igång.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classList.map((c) => (
            <Link key={c.id} href={`/larare/klasser/${c.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="font-semibold text-lg">{c.name}</div>
                    <SubjectBadge subject={c.amne} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Årskurs {c.arskurs}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {c.class_members?.[0]?.count ?? 0} elever
                    </span>
                    <span className="font-mono font-medium">
                      {c.class_code}
                    </span>
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
