"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import type { Exam, ExamDisplayMode } from "@/lib/types";
import { updateExamSettings } from "../actions";

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function ExamSettingsForm({ exam }: { exam: Exam }) {
  const router = useRouter();
  const { toast } = useToast();
  const [titel, setTitel] = useState(exam.titel);
  const [instruktioner, setInstruktioner] = useState(exam.instruktioner ?? "");
  const [visningslage, setVisningslage] = useState<ExamDisplayMode>(
    exam.visningslage,
  );
  const [tidsgrans, setTidsgrans] = useState(
    exam.tidsgrans_minuter ? String(exam.tidsgrans_minuter) : "",
  );
  const [oppnar, setOppnar] = useState(toLocalInput(exam.oppnar));
  const [stanger, setStanger] = useState(toLocalInput(exam.stanger));
  const [slumpaFragor, setSlumpaFragor] = useState(exam.slumpa_fragor);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const result = await updateExamSettings(exam.id, {
      titel: titel.trim(),
      instruktioner: instruktioner.trim() || null,
      visningslage,
      tidsgrans_minuter: tidsgrans ? Number(tidsgrans) : null,
      oppnar: oppnar ? new Date(oppnar).toISOString() : null,
      stanger: stanger ? new Date(stanger).toISOString() : null,
      slumpa_fragor: slumpaFragor,
    });
    setSaving(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Fel", description: result.error });
      return;
    }
    toast({ variant: "success", title: "Inställningar sparade" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provinställningar</CardTitle>
        <CardDescription>
          Tidsfönster, tidsgräns och hur frågorna visas för eleverna.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input value={titel} onChange={(e) => setTitel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Visningsläge</Label>
            <Select
              value={visningslage}
              onValueChange={(v) => setVisningslage(v as ExamDisplayMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en_fraga">En fråga i taget</SelectItem>
                <SelectItem value="alla">Alla frågor på en sida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Instruktioner</Label>
          <Textarea
            value={instruktioner}
            onChange={(e) => setInstruktioner(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Tidsgräns (minuter)</Label>
            <Input
              type="number"
              min={1}
              placeholder="Ingen gräns"
              value={tidsgrans}
              onChange={(e) => setTidsgrans(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Öppnar</Label>
            <Input
              type="datetime-local"
              value={oppnar}
              onChange={(e) => setOppnar(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Stänger</Label>
            <Input
              type="datetime-local"
              value={stanger}
              onChange={(e) => setStanger(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center justify-between rounded-lg border p-3 cursor-pointer">
          <div>
            <div className="text-sm font-medium">
              Slumpa frågeordningen per elev
            </div>
            <div className="text-xs text-muted-foreground">
              Varje elev får frågorna i sin egen ordning – försvårar fusk när
              elever sitter bredvid varandra.
            </div>
          </div>
          <Switch checked={slumpaFragor} onCheckedChange={setSlumpaFragor} />
        </label>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} variant="outline">
            <Save className="h-4 w-4" />
            {saving ? "Sparar…" : "Spara inställningar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
