"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function GoogleButton({ next = "/" }: { next?: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Google-inloggning misslyckades",
        description: error.message,
      });
      setLoading(false);
    }
    // Vid lyckat anrop skickas webbläsaren vidare till Google.
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={loading}
    >
      <GoogleLogo />
      {loading ? "Öppnar Google…" : "Fortsätt med Google"}
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase text-muted-foreground">eller</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
