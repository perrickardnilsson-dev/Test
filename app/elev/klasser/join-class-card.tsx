"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { joinClass } from "../actions";

export function JoinClassCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    const result = await joinClass(code.trim());
    setLoading(false);
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Kunde inte gå med",
        description: result.error,
      });
      return;
    }
    toast({
      variant: "success",
      title: "Du är med i klassen!",
      description: result.className,
    });
    setCode("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gå med i klass</CardTitle>
        <CardDescription>Ange klasskoden du fått av din lärare.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onJoin} className="flex gap-2">
          <Input
            placeholder="T.ex. FY8A3K"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono tracking-widest"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Går med…" : "Gå med"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
