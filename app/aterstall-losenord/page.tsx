import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  let user = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-lg mb-8"
      >
        <GraduationCap className="h-6 w-6 text-primary" />
        NO-provplattform
      </Link>

      {user ? (
        <ResetPasswordForm />
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Länken är ogiltig</CardTitle>
            <CardDescription>
              Återställningslänken har gått ut eller redan använts. Begär en ny
              länk för att välja ett nytt lösenord.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/glomt-losenord">Begär ny länk</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
