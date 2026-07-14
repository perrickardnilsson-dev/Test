"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { GoogleButton, OrDivider } from "@/components/google-button";
import type { Role } from "@/lib/types";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const initialRole: Role =
    searchParams.get("roll") === "student" ? "student" : "teacher";
  const inviteToken = searchParams.get("token") ?? "";
  const inviteEmail = searchParams.get("epost") ?? "";

  const [role, setRole] = useState<Role>(inviteToken ? "student" : initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const next = role === "teacher" ? "/larare" : "/elev";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, name },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });

    if (error || !data.user) {
      toast({
        variant: "destructive",
        title: "Registrering misslyckades",
        description: error?.message ?? "Försök igen.",
      });
      setLoading(false);
      return;
    }

    // Om e-postbekräftelse är avstängd finns redan en session – anslut till klass.
    if (role === "student") {
      if (inviteToken) {
        await supabase.rpc("accept_invitation", { p_token: inviteToken });
      } else if (classCode.trim()) {
        const { error: joinError } = await supabase.rpc(
          "join_class_with_code",
          { p_code: classCode.trim() },
        );
        if (joinError) {
          toast({
            variant: "destructive",
            title: "Kunde inte gå med i klassen",
            description: joinError.message,
          });
        }
      }
    }

    if (data.session) {
      toast({ variant: "success", title: "Kontot är skapat!" });
      router.push(role === "teacher" ? "/larare" : "/elev");
      router.refresh();
    } else {
      toast({
        title: "Kontrollera din e-post",
        description:
          "Vi har skickat en bekräftelselänk. Bekräfta och logga sedan in.",
      });
      router.push("/logga-in");
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Skapa konto</CardTitle>
        <CardDescription>
          {inviteToken
            ? "Du har blivit inbjuden till en klass. Skapa ditt elevkonto nedan."
            : "Välj om du är lärare eller elev."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {!inviteToken && (
            <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="teacher">Lärare</TabsTrigger>
                <TabsTrigger value="student">Elev</TabsTrigger>
              </TabsList>
              <TabsContent value="student" className="pt-4">
                <div className="space-y-2">
                  <Label htmlFor="classCode">Klasskod (valfritt)</Label>
                  <Input
                    id="classCode"
                    placeholder="T.ex. FY8A3K"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Du kan även gå med i en klass senare.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              type="email"
              required
              readOnly={!!inviteEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Lösenord</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Skapar konto…" : "Skapa konto"}
          </Button>
          <OrDivider />
          <GoogleButton />
          <p className="text-xs text-muted-foreground text-center">
            Med Google väljer du roll (lärare/elev) direkt efter inloggningen.
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Har du redan ett konto?{" "}
            <Link href="/logga-in" className="text-primary hover:underline">
              Logga in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
