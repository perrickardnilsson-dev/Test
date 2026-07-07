"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GRADES, LEVELS, QUESTION_TYPES } from "@/lib/constants";
import type {
  ExtractedQuestion,
  Facit,
  Level,
  QuestionType,
} from "@/lib/types";

export type EditableQuestion = ExtractedQuestion;

function defaultFacit(type: QuestionType): Facit {
  switch (type) {
    case "flerval_ett":
      return { typ: "flerval_ett", korrekt_index: 0 };
    case "flerval_flera":
      return { typ: "flerval_flera", korrekta_index: [] };
    case "kortsvar":
      return { typ: "kortsvar", godkanda_svar: [""] };
    case "fritext":
      return { typ: "fritext", exempelsvar: "" };
  }
}

export function emptyQuestion(): EditableQuestion {
  return {
    fragetyp: "flerval_ett",
    fragetext: "",
    alternativ: ["", "", "", ""],
    facit: { typ: "flerval_ett", korrekt_index: 0 },
    bedomningsanvisning: null,
    niva: "E",
    arskurs: 8,
    centralt_innehall: "",
    poang: 1,
  };
}

export function QuestionEditor({
  value,
  onChange,
}: {
  value: EditableQuestion;
  onChange: (q: EditableQuestion) => void;
}) {
  const isFlerval =
    value.fragetyp === "flerval_ett" || value.fragetyp === "flerval_flera";

  function setType(type: QuestionType) {
    const nextIsFlerval =
      type === "flerval_ett" || type === "flerval_flera";
    onChange({
      ...value,
      fragetyp: type,
      alternativ: nextIsFlerval
        ? value.alternativ && value.alternativ.length > 0
          ? value.alternativ
          : ["", "", "", ""]
        : null,
      facit: defaultFacit(type),
      bedomningsanvisning:
        type === "fritext" ? value.bedomningsanvisning ?? "" : null,
    });
  }

  function setAlternativ(index: number, text: string) {
    const next = [...(value.alternativ ?? [])];
    next[index] = text;
    onChange({ ...value, alternativ: next });
  }

  function addAlternativ() {
    onChange({ ...value, alternativ: [...(value.alternativ ?? []), ""] });
  }

  function removeAlternativ(index: number) {
    const next = (value.alternativ ?? []).filter((_, i) => i !== index);
    let facit = value.facit;
    if (facit.typ === "flerval_ett" && facit.korrekt_index >= next.length) {
      facit = { typ: "flerval_ett", korrekt_index: 0 };
    } else if (facit.typ === "flerval_flera") {
      facit = {
        typ: "flerval_flera",
        korrekta_index: facit.korrekta_index
          .filter((i) => i !== index)
          .map((i) => (i > index ? i - 1 : i)),
      };
    }
    onChange({ ...value, alternativ: next, facit });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label>Frågetyp</Label>
          <Select
            value={value.fragetyp}
            onValueChange={(v) => setType(v as QuestionType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nivå</Label>
          <Select
            value={value.niva}
            onValueChange={(v) => onChange({ ...value, niva: v as Level })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Årskurs</Label>
            <Select
              value={String(value.arskurs)}
              onValueChange={(v) =>
                onChange({ ...value, arskurs: Number(v) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    Åk {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Poäng</Label>
            <Input
              type="number"
              min={1}
              value={value.poang}
              onChange={(e) =>
                onChange({ ...value, poang: Math.max(1, Number(e.target.value)) })
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Centralt innehåll (Lgr22)</Label>
        <Input
          value={value.centralt_innehall}
          onChange={(e) =>
            onChange({ ...value, centralt_innehall: e.target.value })
          }
          placeholder="T.ex. Energiformer och energiomvandlingar"
        />
      </div>

      <div className="space-y-2">
        <Label>Frågetext</Label>
        <Textarea
          value={value.fragetext}
          onChange={(e) => onChange({ ...value, fragetext: e.target.value })}
          rows={3}
        />
      </div>

      {isFlerval && (
        <div className="space-y-2">
          <Label>Svarsalternativ (markera rätt svar)</Label>
          <div className="space-y-2">
            {value.fragetyp === "flerval_ett" ? (
              <RadioGroup
                value={String(
                  value.facit.typ === "flerval_ett"
                    ? value.facit.korrekt_index
                    : 0,
                )}
                onValueChange={(v) =>
                  onChange({
                    ...value,
                    facit: { typ: "flerval_ett", korrekt_index: Number(v) },
                  })
                }
              >
                {(value.alternativ ?? []).map((alt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <RadioGroupItem value={String(i)} />
                    <Input
                      value={alt}
                      onChange={(e) => setAlternativ(i, e.target.value)}
                      placeholder={`Alternativ ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAlternativ(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              (value.alternativ ?? []).map((alt, i) => {
                const selected =
                  value.facit.typ === "flerval_flera" &&
                  value.facit.korrekta_index.includes(i);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(c) => {
                        const current =
                          value.facit.typ === "flerval_flera"
                            ? value.facit.korrekta_index
                            : [];
                        const next = c
                          ? [...current, i].sort((a, b) => a - b)
                          : current.filter((x) => x !== i);
                        onChange({
                          ...value,
                          facit: {
                            typ: "flerval_flera",
                            korrekta_index: next,
                          },
                        });
                      }}
                    />
                    <Input
                      value={alt}
                      onChange={(e) => setAlternativ(i, e.target.value)}
                      placeholder={`Alternativ ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAlternativ(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAlternativ}
          >
            <Plus className="h-4 w-4" /> Lägg till alternativ
          </Button>
        </div>
      )}

      {value.fragetyp === "kortsvar" && (
        <div className="space-y-2">
          <Label>Godkända svar (ett per rad)</Label>
          <Textarea
            value={
              value.facit.typ === "kortsvar"
                ? value.facit.godkanda_svar.join("\n")
                : ""
            }
            onChange={(e) =>
              onChange({
                ...value,
                facit: {
                  typ: "kortsvar",
                  godkanda_svar: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
            rows={3}
            placeholder={"DNA\ndeoxiribonukleinsyra"}
          />
        </div>
      )}

      {value.fragetyp === "fritext" && (
        <div className="space-y-2">
          <Label>Exempelsvar / facit</Label>
          <Textarea
            value={
              value.facit.typ === "fritext" ? value.facit.exempelsvar : ""
            }
            onChange={(e) =>
              onChange({
                ...value,
                facit: { typ: "fritext", exempelsvar: e.target.value },
              })
            }
            rows={3}
          />
        </div>
      )}

      {value.fragetyp === "fritext" && (
        <div className="space-y-2">
          <Label>Bedömningsanvisning (E/C/A)</Label>
          <Textarea
            value={value.bedomningsanvisning ?? ""}
            onChange={(e) =>
              onChange({ ...value, bedomningsanvisning: e.target.value })
            }
            rows={3}
            placeholder="E: ... C: ... A: ..."
          />
        </div>
      )}
    </div>
  );
}
