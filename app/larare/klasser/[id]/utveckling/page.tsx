import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubjectBadge } from "@/components/subject-badge";
import { gradeLevelFromShare } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { Class, Exam, Profile } from "@/lib/types";

type StudentCell = { share: number; score: number; max: number } | null;

const GRADE_STYLES: Record<string, string> = {
  A: "bg-purple-100 text-purple-700",
  C: "bg-blue-100 text-blue-700",
  E: "bg-slate-100 text-slate-700",
  F: "bg-red-100 text-red-700",
};

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold",
        GRADE_STYLES[grade] ?? GRADE_STYLES.E,
      )}
    >
      {grade}
    </span>
  );
}

export default async function ProgressPage({
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

  const [{ data: membersData }, { data: examsData }] = await Promise.all([
    supabase
      .from("class_members")
      .select("student_id, profiles(id, name, email)")
      .eq("class_id", id),
    supabase
      .from("exams")
      .select("*")
      .eq("class_id", id)
      .eq("status", "rattat")
      .order("created_at"),
  ]);

  const members =
    (membersData as unknown as {
      student_id: string;
      profiles: Pick<Profile, "id" | "name" | "email">;
    }[]) ?? [];
  const exams = (examsData as Exam[]) ?? [];

  // Hämta frågor, försök, svar och rättningar för alla rättade prov.
  const examIds = exams.map((e) => e.id);

  const [{ data: eqData }, { data: attemptsData }] = examIds.length
    ? await Promise.all([
        supabase
          .from("exam_questions")
          .select("id, exam_id, poang, question_bank(centralt_innehall)")
          .in("exam_id", examIds),
        supabase
          .from("attempts")
          .select("id, exam_id, student_id")
          .in("exam_id", examIds)
          .not("inlamnad", "is", null),
      ])
    : [{ data: [] }, { data: [] }];

  const eqs =
    (eqData as unknown as {
      id: string;
      exam_id: string;
      poang: number;
      question_bank: { centralt_innehall: string };
    }[]) ?? [];
  const attempts =
    (attemptsData as { id: string; exam_id: string; student_id: string }[]) ??
    [];

  const attemptIds = attempts.map((a) => a.id);
  const { data: answersData } = attemptIds.length
    ? await supabase
        .from("answers")
        .select("id, attempt_id, exam_question_id")
        .in("attempt_id", attemptIds)
    : { data: [] };
  const answers =
    (answersData as {
      id: string;
      attempt_id: string;
      exam_question_id: string;
    }[]) ?? [];

  const answerIds = answers.map((a) => a.id);
  const { data: gradingsData } = answerIds.length
    ? await supabase
        .from("gradings")
        .select("answer_id, auto_poang, larare_poang")
        .in("answer_id", answerIds)
    : { data: [] };
  const gradings =
    (gradingsData as {
      answer_id: string;
      auto_poang: number | null;
      larare_poang: number | null;
    }[]) ?? [];

  // Index för snabb uppslagning.
  const gradingByAnswer = new Map(gradings.map((g) => [g.answer_id, g]));
  const answerByKey = new Map(
    answers.map((a) => [`${a.attempt_id}:${a.exam_question_id}`, a]),
  );
  const eqsByExam = new Map<string, typeof eqs>();
  for (const eq of eqs) {
    const list = eqsByExam.get(eq.exam_id) ?? [];
    list.push(eq);
    eqsByExam.set(eq.exam_id, list);
  }
  const attemptByStudentExam = new Map(
    attempts.map((a) => [`${a.student_id}:${a.exam_id}`, a]),
  );

  function pointsForAnswer(attemptId: string, eqId: string): number {
    const ans = answerByKey.get(`${attemptId}:${eqId}`);
    if (!ans) return 0;
    const g = gradingByAnswer.get(ans.id);
    return Number(g?.larare_poang ?? g?.auto_poang ?? 0);
  }

  // Matris: elev × prov.
  const matrix: { student: (typeof members)[number]; cells: StudentCell[] }[] =
    members.map((m) => ({
      student: m,
      cells: exams.map((exam) => {
        const attempt = attemptByStudentExam.get(
          `${m.student_id}:${exam.id}`,
        );
        if (!attempt) return null;
        const qs = eqsByExam.get(exam.id) ?? [];
        const max = qs.reduce((s, q) => s + q.poang, 0);
        const score = qs.reduce(
          (s, q) => s + pointsForAnswer(attempt.id, q.id),
          0,
        );
        return { share: max ? score / max : 0, score, max };
      }),
    }));

  // Per centralt innehåll (över alla rättade prov).
  const perContent = new Map<string, { earned: number; max: number }>();
  for (const exam of exams) {
    const qs = eqsByExam.get(exam.id) ?? [];
    const examAttempts = attempts.filter((a) => a.exam_id === exam.id);
    for (const q of qs) {
      const ci = q.question_bank?.centralt_innehall ?? "Övrigt";
      const entry = perContent.get(ci) ?? { earned: 0, max: 0 };
      for (const attempt of examAttempts) {
        entry.earned += pointsForAnswer(attempt.id, q.id);
        entry.max += q.poang;
      }
      perContent.set(ci, entry);
    }
  }
  const contentRows = Array.from(perContent.entries())
    .filter(([, v]) => v.max > 0)
    .map(([ci, v]) => ({ ci, share: v.earned / v.max }))
    .sort((a, b) => a.share - b.share);

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
          <h1 className="text-2xl font-bold">Utveckling: {klass.name}</h1>
          <SubjectBadge subject={klass.amne} />
        </div>
        <p className="text-muted-foreground">
          Resultat över tid för {exams.length} rättade prov.
        </p>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Inga rättade prov ännu</p>
            <p className="text-sm text-muted-foreground">
              När du publicerat rättningen för ett prov visas utvecklingen här.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Kunskapsluckor per arbetsområde</CardTitle>
              <CardDescription>
                Klassens andel av maxpoäng per centralt innehåll, över alla
                rättade prov. Svagaste områdena först – bra underlag för
                repetition.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {contentRows.map(({ ci, share }) => (
                <div key={ci} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex-1">{ci}</span>
                    <span className="ml-2 shrink-0 text-muted-foreground">
                      {Math.round(share * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full",
                        share < 0.5
                          ? "bg-red-400"
                          : share < 0.75
                            ? "bg-amber-400"
                            : "bg-emerald-400",
                      )}
                      style={{ width: `${Math.round(share * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultat per elev och prov</CardTitle>
              <CardDescription>
                Andel av maxpoäng per prov, i kronologisk ordning.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium">Elev</th>
                    {exams.map((e) => (
                      <th key={e.id} className="py-2 px-2 font-medium">
                        <Link
                          href={`/larare/prov/${e.id}/rattning`}
                          className="hover:text-primary"
                          title={e.titel}
                        >
                          <div className="max-w-[140px] truncate">
                            {e.titel}
                          </div>
                          <div className="text-xs font-normal text-muted-foreground">
                            {formatDate(e.created_at)}
                          </div>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map(({ student, cells }) => (
                    <tr key={student.student_id} className="border-b">
                      <td className="py-2 pr-4 font-medium whitespace-nowrap">
                        {student.profiles.name}
                      </td>
                      {cells.map((cell, i) => (
                        <td key={i} className="py-2 px-2">
                          {cell ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "font-medium",
                                  cell.share >= 0.7
                                    ? "text-emerald-700"
                                    : cell.share >= 0.5
                                      ? "text-amber-700"
                                      : "text-red-700",
                                )}
                              >
                                {Math.round(cell.share * 100)}%
                              </span>
                              <GradeBadge
                                grade={gradeLevelFromShare(cell.share)}
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
