"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { GRADES, SUBJECTS } from "@/lib/constants";
import { createClass } from "./actions";

export function CreateClassDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amne, setAmne] = useState("");
  const [arskurs, setArskurs] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("amne", amne);
    formData.set("arskurs", arskurs);
    const result = await createClass(formData);
    setLoading(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Kunde inte skapa klass",
        description: result.error,
      });
      return;
    }
    toast({ variant: "success", title: "Klass skapad!" });
    setOpen(false);
    setAmne("");
    setArskurs("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Ny klass
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skapa ny klass</DialogTitle>
          <DialogDescription>
            En unik klasskod genereras automatiskt som eleverna kan använda.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Klassnamn</Label>
            <Input
              id="name"
              name="name"
              placeholder="T.ex. 8A – Fysik"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ämne</Label>
              <Select value={amne} onValueChange={setAmne} required>
                <SelectTrigger>
                  <SelectValue placeholder="Välj ämne" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Årskurs</Label>
              <Select value={arskurs} onValueChange={setArskurs} required>
                <SelectTrigger>
                  <SelectValue placeholder="Välj" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      Årskurs {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !amne || !arskurs}>
              {loading ? "Skapar…" : "Skapa klass"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
