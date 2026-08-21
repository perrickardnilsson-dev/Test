import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { extractQuestionsFromPdf } from "@/lib/ai/flows";
import type { Subject } from "@/lib/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const { documentId } = await request.json();
  if (!documentId) {
    return NextResponse.json({ error: "documentId saknas" }, { status: 400 });
  }

  const { data: doc } = await supabase
    .from("source_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (!doc || doc.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "Dokumentet hittades inte" },
      { status: 404 },
    );
  }

  const service = createServiceClient();
  await service
    .from("source_documents")
    .update({ status: "tolkar", error_message: null })
    .eq("id", documentId);

  try {
    const { data: file, error: dlError } = await service.storage
      .from("np-pdfs")
      .download(doc.storage_path);
    if (dlError || !file) {
      throw new Error("Kunde inte hämta PDF från lagringen");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const result = await extractQuestionsFromPdf({
      amne: doc.amne as Subject,
      year: doc.year,
      pdfBase64: base64,
    });

    await service
      .from("source_documents")
      .update({ status: "tolkad", extracted: result.fragor })
      .eq("id", documentId);

    return NextResponse.json({ success: true, count: result.fragor.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okänt fel vid tolkning";
    await service
      .from("source_documents")
      .update({ status: "misslyckad", error_message: message })
      .eq("id", documentId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
