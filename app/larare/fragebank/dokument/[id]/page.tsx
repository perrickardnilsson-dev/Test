import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SubjectBadge } from "@/components/subject-badge";
import type { ExtractedQuestion, SourceDocument, Subject } from "@/lib/types";
import { ReviewClient } from "./review-client";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("source_documents")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const doc = data as SourceDocument;
  const extracted = (doc.extracted as ExtractedQuestion[]) ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/larare/fragebank"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tillbaka till frågebanken
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <SubjectBadge subject={doc.amne as Subject} />
        </div>
        <p className="text-muted-foreground">
          Granska frågorna AI tolkade ur provet. Justera vid behov och godkänn
          de du vill spara i frågebanken.
        </p>
      </div>

      <ReviewClient
        documentId={doc.id}
        amne={doc.amne as Subject}
        initial={extracted}
      />
    </div>
  );
}
