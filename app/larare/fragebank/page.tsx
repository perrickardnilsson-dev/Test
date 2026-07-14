import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SourceDocument } from "@/lib/types";
import { QuestionsClient, type QuestionWithOwner } from "./questions-client";
import { DocumentsClient } from "./documents-client";

export default async function FragebankPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  const [{ data: questions }, { data: documents }] = await Promise.all([
    supabase
      .from("question_bank")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("source_documents")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Frågebank</h1>
        <p className="text-muted-foreground">
          Hantera frågor och tolka gamla nationella prov till frågebanken.
        </p>
      </div>

      <Tabs defaultValue="fragor">
        <TabsList>
          <TabsTrigger value="fragor">Frågor</TabsTrigger>
          <TabsTrigger value="dokument">Nationella prov (PDF)</TabsTrigger>
        </TabsList>
        <TabsContent value="fragor" className="pt-4">
          <QuestionsClient
            questions={(questions as unknown as QuestionWithOwner[]) ?? []}
            currentUserId={profile.id}
            inSchool={profile.school_id != null}
          />
        </TabsContent>
        <TabsContent value="dokument" className="pt-4">
          <DocumentsClient
            documents={(documents as SourceDocument[]) ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
