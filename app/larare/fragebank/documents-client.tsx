"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubjectBadge } from "@/components/subject-badge";
import { useToast } from "@/components/ui/use-toast";
import { SUBJECTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { DocumentStatus, SourceDocument, Subject } from "@/lib/types";
import { createSourceDocument, deleteDocument } from "./actions";

const STATUS_META: Record<
  DocumentStatus,
  { label: string; variant: "secondary" | "success" | "warning" | "destructive" }
> = {
  uppladdad: { label: "Uppladdad", variant: "secondary" },
  tolkar: { label: "Tolkar…", variant: "warning" },
  tolkad: { label: "Tolkad", variant: "success" },
  misslyckad: { label: "Misslyckad", variant: "destructive" },
};

export function DocumentsClient({
  documents,
}: {
  documents: SourceDocument[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [amne, setAmne] = useState<Subject | "">("");
  const [year, setYear] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function onUpload() {
    if (!file || !amne || !title.trim()) {
      toast({ variant: "destructive", title: "Fyll i titel, ämne och PDF" });
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    const path = `${user.id}/${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("np-pdfs")
      .upload(path, file, { contentType: "application/pdf" });

    if (upErr) {
      toast({
        variant: "destructive",
        title: "Uppladdning misslyckades",
        description: upErr.message,
      });
      setUploading(false);
      return;
    }

    const result = await createSourceDocument({
      title: title.trim(),
      amne,
      year: year ? Number(year) : null,
      storage_path: path,
    });

    if (result.error || !result.id) {
      toast({
        variant: "destructive",
        title: "Fel",
        description: result.error,
      });
      setUploading(false);
      return;
    }

    setOpen(false);
    setUploading(false);
    setTitle("");
    setAmne("");
    setYear("");
    setFile(null);
    toast({
      title: "PDF uppladdad",
      description: "AI tolkar provet – det kan ta en stund.",
    });
    router.refresh();

    // Starta tolkning i bakgrunden.
    fetch("/api/larare/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: result.id }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          toast({
            variant: "destructive",
            title: "Tolkning misslyckades",
            description: data.error,
          });
        } else {
          toast({
            variant: "success",
            title: "Prov tolkat",
            description: `${data.count} frågor hittades – granska och godkänn.`,
          });
        }
        router.refresh();
      })
      .catch(() => router.refresh());
  }

  async function onDelete(doc: SourceDocument) {
    const result = await deleteDocument(doc.id, doc.storage_path);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({ title: "Dokument borttaget" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Ladda upp <strong>frisläppta</strong> gamla nationella prov. Endast du
          kan se dina uppladdade filer.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4" /> Ladda upp PDF
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ladda upp nationellt prov</DialogTitle>
              <DialogDescription>
                Ladda upp en PDF av ett frisläppt nationellt prov. AI extraherar
                frågorna som du sedan granskar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="T.ex. NP Fysik åk 9 – 2013"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ämne</Label>
                  <Select
                    value={amne}
                    onValueChange={(v) => setAmne(v as Subject)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj ämne" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>År (valfritt)</Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2013"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>PDF-fil</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Laddar upp…
                  </>
                ) : (
                  "Ladda upp och tolka"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Inga uppladdade prov</p>
            <p className="text-sm text-muted-foreground">
              Ladda upp ett frisläppt nationellt prov för att bygga din
              frågebank.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => {
            const meta = STATUS_META[doc.status];
            const count = doc.extracted?.length ?? 0;
            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{doc.title}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <SubjectBadge subject={doc.amne as Subject} />
                        {doc.year && <span>{doc.year}</span>}
                        <span>· {formatDate(doc.created_at)}</span>
                      </div>
                      {doc.status === "misslyckad" && doc.error_message && (
                        <p className="text-xs text-destructive mt-1">
                          {doc.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.status === "tolkar" && (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    )}
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    {doc.status === "tolkad" && (
                      <Button size="sm" asChild>
                        <Link href={`/larare/fragebank/dokument/${doc.id}`}>
                          Granska {count} frågor
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
