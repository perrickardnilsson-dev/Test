import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import type { Class } from "@/lib/types";
import { NewExamForm } from "./new-exam-form";

export default async function NewExamPage({
  searchParams,
}: {
  searchParams: Promise<{ klass?: string }>;
}) {
  const { klass } = await searchParams;
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .order("created_at");

  const classList = (classes as Class[]) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/larare/prov"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Alla prov
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Nytt prov</h1>
        <p className="text-muted-foreground">
          Välj klass och innehåll. Provet blandar frågor från din frågebank med
          nygenererade AI-frågor i nationell-prov-stil.
        </p>
      </div>

      {classList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Du behöver skapa en klass först.
            </p>
            <Link
              href="/larare/klasser"
              className="text-primary hover:underline text-sm"
            >
              Gå till klasser
            </Link>
          </CardContent>
        </Card>
      ) : (
        <NewExamForm classes={classList} defaultClassId={klass} />
      )}
    </div>
  );
}
