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
import { useToast } from "@/components/ui/use-toast";
import { GoogleButton, OrDivider } from "@/components/google-button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const invalidLink = searchParams.get("fel") === "ogiltig-lank";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Inloggning misslyckades",
        description: "Kontrollera e-post och lösenord.",
      });
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    let dest = searchParams.get("next");
    if (!dest && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      dest = profile?.role === "teacher" ? "/larare" : "/elev";
    }
    router.push(dest || "/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Logga in</CardTitle>
        <CardDescription>
          Ange dina uppgifter för att komma till din arbetsyta.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {invalidLink && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Länken var ogiltig eller har gått ut. Logga in eller begär en ny
              återställningslänk via &quot;Glömt lösenord?&quot;.
            </p>
          )}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Lösenord</Label>
              <Link
                href="/glomt-losenord"
                className="text-xs text-primary hover:underline"
              >
                Glömt lösenord?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loggar in…" : "Logga in"}
          </Button>
          <OrDivider />
          <GoogleButton next={searchParams.get("next") ?? "/"} />
          <p className="text-sm text-muted-foreground text-center">
            Har du inget konto?{" "}
            <Link href="/registrera" className="text-primary hover:underline">
              Registrera dig
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
