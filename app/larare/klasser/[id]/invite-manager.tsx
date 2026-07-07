"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Mail, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import type { Invitation } from "@/lib/types";
import { createInvitation, deleteInvitation } from "../actions";

export function InviteManager({
  classId,
  invitations,
}: {
  classId: string;
  invitations: Invitation[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  function inviteUrl(token: string) {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/inbjudan/${token}`;
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createInvitation(classId, email);
    setLoading(false);
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Kunde inte skapa inbjudan",
        description: result.error,
      });
      return;
    }
    toast({
      variant: "success",
      title: "Inbjudan skapad",
      description: "Kopiera länken och skicka till eleven.",
    });
    setEmail("");
    router.refresh();
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(inviteUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  async function remove(id: string) {
    const result = await deleteInvitation(id, classId);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-postinbjudningar</CardTitle>
        <CardDescription>
          Skapa en länk per elev. Länken går till registreringen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={invite} className="flex gap-2">
          <Input
            type="email"
            placeholder="elev@skola.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} size="icon">
            <Mail className="h-4 w-4" />
          </Button>
        </form>

        <div className="space-y-2">
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga inbjudningar ännu.
            </p>
          ) : (
            invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{inv.email}</div>
                  <Badge
                    variant={
                      inv.status === "accepterad" ? "success" : "secondary"
                    }
                    className="mt-1"
                  >
                    {inv.status === "accepterad" ? "Accepterad" : "Väntar"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {inv.status !== "accepterad" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyLink(inv.token)}
                      title="Kopiera länk"
                    >
                      {copiedToken === inv.token ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(inv.id)}
                    title="Ta bort"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
