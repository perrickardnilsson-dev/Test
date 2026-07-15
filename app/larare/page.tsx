import Link from "next/link";
import { FileText, Library, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubjectBadge } from "@/components/subject-badge";
import { EXAM_STATUS_LABELS } from "@/lib/constants";
import { firstName } from "@/lib/display-name";
import type { Class, Exam } from "@/lib/types";

export default async function TeacherDashboard() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  const [{ data: classes }, { data: exams }, { count: questionCount }] =
    await Promise.all([
      supabase.from("classes").select("*").order("created_at"),
      supabase
        .from("exams")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("question_bank")
        .select("*", { count: "exact", head: true }),
    ]);

  const classList = (classes as Class[]) ?? [];
  const examList = (exams as Exam[]) ?? [];

  const stats = [
    { label: "Klasser", value: classList.length, icon: Users, href: "/larare/klasser" },
    {
      label: "Frågor i banken",
      value: questionCount ?? 0,
      icon: Library,
      href: "/larare/fragebank",
    },
    { label: "Prov", value: examList.length, icon: FileText, href: "/larare/prov" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Hej {firstName(profile.name)}!</h1>
        <p className="text-muted-foreground">
          Här är en översikt över din arbetsyta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Dina klasser</CardTitle>
              <CardDescription>Klasser du undervisar</CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href="/larare/klasser">
                <Plus className="h-4 w-4" /> Ny klass
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {classList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Du har inga klasser ännu. Skapa din första klass för att bjuda
                in elever.
              </p>
            ) : (
              classList.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/larare/klasser/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Årskurs {c.arskurs} · Kod {c.class_code}
                    </div>
                  </div>
                  <SubjectBadge subject={c.amne} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Senaste prov</CardTitle>
            <CardDescription>Utkast och publicerade prov</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {examList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inga prov ännu. Skapa ett prov från frågebanken.
              </p>
            ) : (
              examList.map((e) => (
                <Link
                  key={e.id}
                  href={`/larare/prov/${e.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50"
                >
                  <div className="font-medium">{e.titel}</div>
                  <span className="text-xs text-muted-foreground">
                    {EXAM_STATUS_LABELS[e.status]}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
