import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SubjectBadge } from "@/components/subject-badge";
import type { Class } from "@/lib/types";
import { JoinClassCard } from "./join-class-card";

export default async function StudentClassesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_members")
    .select("class_id, classes(id, name, amne, arskurs)")
    .order("joined_at", { ascending: false });

  const classes =
    (data as unknown as {
      class_id: string;
      classes: Pick<Class, "id" | "name" | "amne" | "arskurs">;
    }[]) ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Mina klasser</h1>
        <p className="text-muted-foreground">
          Gå med i en ny klass med en klasskod från din lärare.
        </p>
      </div>

      <JoinClassCard />

      <div className="space-y-3">
        {classes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Du är inte med i någon klass</p>
              <p className="text-sm text-muted-foreground">
                Ange en klasskod ovan för att gå med.
              </p>
            </CardContent>
          </Card>
        ) : (
          classes.map((c) => (
            <Card key={c.class_id}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <div className="font-semibold">{c.classes.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Årskurs {c.classes.arskurs}
                  </div>
                </div>
                <SubjectBadge subject={c.classes.amne} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
