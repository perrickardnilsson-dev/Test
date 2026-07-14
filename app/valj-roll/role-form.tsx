"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { Role } from "@/lib/types";
import { completeOnboarding } from "./actions";

export function RoleForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState(initialName);
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await completeOnboarding(role, name, classCode);
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Något gick fel",
        description: result.error,
      });
      setLoading(false);
      return;
    }
    if (result.joinWarning) {
      toast({
        variant: "destructive",
        title: "Kunde inte gå med i klassen",
        description: `${result.joinWarning} Du kan ange klasskoden igen inne i appen.`,
      });
    } else {
      toast({ variant: "success", title: "Välkommen!" });
    }
    router.push(result.dest ?? "/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Nästan klart!</CardTitle>
        <CardDescription>
          Välj om du är lärare eller elev så att du hamnar i rätt arbetsyta.
          Valet kan inte ändras senare.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Elev</TabsTrigger>
              <TabsTrigger value="teacher">Lärare</TabsTrigger>
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
                  Har du fått en klasskod av din lärare? Ange den här – annars
                  kan du gå med i en klass senare.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sparar…" : "Fortsätt"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
