import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { subjectLabel } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Subject } from "@/lib/types";
import { AcceptInvitation } from "./accept-invitation";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_invitation_info", {
    p_token: token,
  });
  const info = Array.isArray(data) ? data[0] : null;
  const profile = await getProfile();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-lg mb-8"
      >
        <GraduationCap className="h-6 w-6 text-primary" />
        NO-provplattform
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inbjudan till klass</CardTitle>
          <CardDescription>
            {info
              ? "Du har blivit inbjuden att gå med i en klass."
              : "Inbjudan kunde inte hittas eller har upphört."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {info ? (
            <>
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="font-semibold text-lg">{info.class_name}</div>
                <div className="text-sm text-muted-foreground">
                  {subjectLabel(info.amne as Subject)} · Årskurs{" "}
                  {info.arskurs}
                </div>
                <div className="mt-2 text-sm">Inbjuden: {info.email}</div>
              </div>

              {info.status === "accepterad" ? (
                <p className="text-sm text-emerald-700">
                  Inbjudan är redan accepterad.
                </p>
              ) : profile ? (
                profile.role === "student" ? (
                  <AcceptInvitation token={token} />
                ) : (
                  <p className="text-sm text-destructive">
                    Du är inloggad som lärare. Logga in med ett elevkonto för
                    att acceptera inbjudan.
                  </p>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link
                      href={`/registrera?roll=student&token=${token}&epost=${encodeURIComponent(
                        info.email,
                      )}`}
                    >
                      Skapa elevkonto och gå med
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/logga-in?next=/inbjudan/${token}`}>
                      Jag har redan ett konto
                    </Link>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Till startsidan</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
