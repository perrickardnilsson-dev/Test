import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SubjectBadge } from "@/components/subject-badge";
import type { Class, Profile } from "@/lib/types";
import { OmdomenClient } from "./omdomen-client";

export default async function OmdomenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: klassData } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();
  if (!klassData) notFound();
  const klass = klassData as Class;

  const [{ data: membersData }, { data: reportsData }, { count: examCount }] =
    await Promise.all([
      supabase
        .from("class_members")
        .select("student_id, profiles(id, name, email)")
        .eq("class_id", id),
      supabase
        .from("student_reports")
        .select("student_id, innehall, updated_at")
        .eq("class_id", id),
      supabase
        .from("exams")
        .select("*", { count: "exact", head: true })
        .eq("class_id", id)
        .eq("status", "rattat"),
    ]);

  const members = (
    (membersData as unknown as {
      student_id: string;
      profiles: Pick<Profile, "id" | "name" | "email">;
    }[]) ?? []
  ).sort((a, b) => a.profiles.name.localeCompare(b.profiles.name, "sv"));

  const reports =
    (reportsData as {
      student_id: string;
      innehall: string;
      updated_at: string;
    }[]) ?? [];

  return (
    <div className="space-y-6">
      <Link
        href={`/larare/klasser/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tillbaka till klassen
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Omdömen: {klass.name}</h1>
          <SubjectBadge subject={klass.amne} />
        </div>
        <p className="text-muted-foreground">
          AI-utkast till omdömesunderlag utifrån {examCount ?? 0} rättade prov.
          Utkasten bygger enbart på provresultaten – granska, redigera och
          komplettera med din egen helhetsbild innan de används.
        </p>
      </div>

      <OmdomenClient
        classId={id}
        students={members.map((m) => m.profiles)}
        initialReports={Object.fromEntries(
          reports.map((r) => [
            r.student_id,
            { innehall: r.innehall, updatedAt: r.updated_at },
          ]),
        )}
        hasGradedExams={(examCount ?? 0) > 0}
      />
    </div>
  );
}
