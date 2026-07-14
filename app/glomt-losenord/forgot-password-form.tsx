"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/aterstall-losenord`,
    });
    setLoading(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte skicka länken",
        description: error.message,
      });
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <MailCheck className="h-10 w-10 text-emerald-600" />
          <p className="font-medium">Kolla din e-post</p>
          <p className="text-sm text-muted-foreground">
            Om det finns ett konto för <strong>{email}</strong> har vi skickat
            en länk för att välja ett nytt lösenord.
          </p>
          <Button variant="outline" asChild className="mt-2">
            <Link href="/logga-in">Tillbaka till inloggningen</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Glömt lösenord?</CardTitle>
        <CardDescription>
          Ange din e-postadress så skickar vi en länk för att välja ett nytt
          lösenord.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Skickar…" : "Skicka återställningslänk"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            <Link href="/logga-in" className="text-primary hover:underline">
              Tillbaka till inloggningen
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
