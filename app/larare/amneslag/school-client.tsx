"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Plus, UsersRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createSchool, joinSchool, leaveSchool } from "./actions";

export function CreateOrJoinSchool() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);

  async function onCreate() {
    if (!name.trim()) return;
    setWorking(true);
    const result = await createSchool(name);
    setWorking(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({
      variant: "success",
      title: "Ämneslag skapat!",
      description: "Dela koden med kollegorna så att de kan gå med.",
    });
    router.refresh();
  }

  async function onJoin() {
    if (!code.trim()) return;
    setWorking(true);
    const result = await joinSchool(code);
    setWorking(false);
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
      title: `Du är nu med i ${result.schoolName ?? "ämneslaget"}!`,
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Skapa ett ämneslag
          </CardTitle>
          <CardDescription>
            Starta ett ämneslag för din skola och bjud in kollegorna med koden
            du får.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="school-name">Namn</Label>
            <Input
              id="school-name"
              placeholder='T.ex. "NO-laget Björkskolan"'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={onCreate} disabled={working || !name.trim()}>
            {working ? "Skapar…" : "Skapa ämneslag"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" /> Gå med i ett ämneslag
          </CardTitle>
          <CardDescription>
            Har en kollega redan skapat ett ämneslag? Ange koden här.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="school-code">Kod</Label>
            <Input
              id="school-code"
              placeholder="T.ex. A1B2C3D4"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono tracking-widest"
            />
          </div>
          <Button
            variant="outline"
            onClick={onJoin}
            disabled={working || !code.trim()}
          >
            {working ? "Går med…" : "Gå med"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function SchoolCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kod till ämneslaget</CardTitle>
        <CardDescription>
          Kollegor anger den här koden på sin ämneslagssida för att gå med.
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

export function LeaveSchoolButton({ schoolName }: { schoolName: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  async function onLeave() {
    setWorking(true);
    const result = await leaveSchool();
    setWorking(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({ title: "Du har lämnat ämneslaget" });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full text-destructive"
        onClick={() => setOpen(true)}
      >
        <LogOut className="h-4 w-4" /> Lämna ämneslaget
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lämna {schoolName}?</DialogTitle>
            <DialogDescription>
              Dina delade frågor slutar synas för kollegorna, och du ser inte
              längre deras. Prov som redan skapats påverkas inte. Du kan gå med
              igen med koden när som helst.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={onLeave} disabled={working}>
              {working ? "Lämnar…" : "Lämna ämneslaget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
