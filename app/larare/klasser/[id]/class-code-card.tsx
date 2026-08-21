"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ClassCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Klasskod</CardTitle>
        <CardDescription>
          Elever anger den här koden vid registrering för att gå med.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg border bg-slate-50 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest">
            {code}
          </div>
          <Button variant="outline" size="icon" onClick={copy} title="Kopiera">
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
