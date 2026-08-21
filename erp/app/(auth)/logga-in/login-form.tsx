"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/core/auth/client";
import { Button } from "@/core/ui/components/button";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({
      email,
      password,
    });
    setPending(false);
    if (err) {
      setError(err.message ?? "Kunde inte logga in");
      return;
    }
    router.push("/skapa-organisation");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        <Label htmlFor="password">Lösenord</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Loggar in…" : "Logga in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Inget konto?{" "}
        <Link href="/registrera" className="text-primary underline-offset-4 hover:underline">
          Skapa konto
        </Link>
      </p>
    </form>
  );
}
