"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("accept_invitation", {
      p_token: token,
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte acceptera inbjudan",
        description: error.message,
      });
      setLoading(false);
      return;
    }
    toast({ variant: "success", title: "Du är nu med i klassen!" });
    router.push("/elev");
    router.refresh();
  }

  return (
    <Button onClick={accept} disabled={loading} className="w-full">
      {loading ? "Går med…" : "Gå med i klassen"}
    </Button>
  );
}
