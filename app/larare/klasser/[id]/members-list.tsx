"use client";

import { useRouter } from "next/navigation";
import { Trash2, UserRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { Profile } from "@/lib/types";
import { removeMember } from "../actions";

type Member = {
  student_id: string;
  joined_at: string;
  profiles: Pick<Profile, "id" | "name" | "email">;
};

export function MembersList({
  classId,
  members,
}: {
  classId: string;
  members: Member[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function remove(studentId: string) {
    const result = await removeMember(classId, studentId);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({ title: "Elev borttagen från klassen" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Elever ({members.length})</CardTitle>
        <CardDescription>Elever som gått med i klassen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Inga elever har gått med ännu. Dela klasskoden eller skicka
            inbjudningar.
          </p>
        ) : (
          members.map((m) => (
            <div
              key={m.student_id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                  <UserRound className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <div className="font-medium">{m.profiles?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {m.profiles?.email}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(m.student_id)}
                title="Ta bort elev"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
