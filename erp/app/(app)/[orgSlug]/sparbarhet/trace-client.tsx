"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";
import {
  seedRecallDemoAction,
  traceGenealogyAction,
} from "@/modules/inventory/actions";

type TraceNode = {
  kind: "batch" | "serial";
  id: string;
  label: string;
  partNumber?: string;
  partDescription?: string;
  depth: number;
  quantity?: number;
  children: TraceNode[];
};

type TraceResult = {
  tree: TraceNode;
  summary: { headline: string };
  edgeCount: number;
};

type Props = {
  orgSlug: string;
};

function TreeNode({ node }: { node: TraceNode }) {
  const kindLabel = node.kind === "batch" ? "Batch" : "Individ";
  return (
    <li className="my-1">
      <span className="font-mono text-xs">
        {kindLabel} {node.label}
      </span>
      {node.partNumber ? (
        <span className="ml-2 text-muted-foreground">
          · {node.partNumber}
          {node.partDescription ? ` — ${node.partDescription}` : ""}
        </span>
      ) : null}
      {node.quantity != null ? (
        <span className="ml-2 text-xs text-muted-foreground">
          (qty {node.quantity})
        </span>
      ) : null}
      {node.children.length > 0 ? (
        <ul className="ml-4 list-disc border-l border-border pl-3">
          {node.children.map((child) => (
            <TreeNode key={`${child.kind}:${child.id}`} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function TraceClient({ orgSlug }: Props) {
  const router = useRouter();
  const [batchNumber, setBatchNumber] = React.useState("");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [direction, setDirection] = React.useState<"backward" | "forward">(
    "backward",
  );
  const [result, setResult] = React.useState<TraceResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [seedPending, setSeedPending] = React.useState(false);
  const [seedMessage, setSeedMessage] = React.useState<string | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const data = await traceGenealogyAction(orgSlug, {
        batchNumber: batchNumber || undefined,
        serialNumber: serialNumber || undefined,
        direction,
      });
      setResult(data as TraceResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spåra");
    } finally {
      setPending(false);
    }
  }

  async function onSeedDemo() {
    setSeedPending(true);
    setSeedMessage(null);
    setError(null);
    try {
      const res = await seedRecallDemoAction(orgSlug);
      setSeedMessage(res.message);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte ladda demo",
      );
    } finally {
      setSeedPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={direction === "backward" ? "default" : "secondary"}
            onClick={() => setDirection("backward")}
          >
            Bakåt
          </Button>
          <Button
            type="button"
            variant={direction === "forward" ? "default" : "secondary"}
            onClick={() => setDirection("forward")}
          >
            Framåt
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onSeedDemo}
          disabled={seedPending}
        >
          {seedPending ? "Laddar…" : "Ladda återkallningsdemo"}
        </Button>
      </div>

      {seedMessage ? (
        <p className="text-sm text-[hsl(152_45%_32%)]">{seedMessage}</p>
      ) : null}

      <form
        onSubmit={onSearch}
        className="space-y-4 rounded-lg border border-border p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="trace-batch">Batchnummer</Label>
            <Input
              id="trace-batch"
              value={batchNumber}
              onChange={(e) => {
                setBatchNumber(e.target.value);
                if (e.target.value) setSerialNumber("");
              }}
              className="font-mono"
              placeholder="B-RAW-4471"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trace-serial">Serienummer</Label>
            <Input
              id="trace-serial"
              value={serialNumber}
              onChange={(e) => {
                setSerialNumber(e.target.value);
                if (e.target.value) setBatchNumber("");
              }}
              className="font-mono"
              placeholder="SN-FG-001"
            />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          className="w-full"
          disabled={pending || (!batchNumber && !serialNumber)}
        >
          {pending ? "Söker…" : "Spåra"}
        </Button>
      </form>

      {result ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">{result.summary.headline}</p>
          <p className="text-xs text-muted-foreground">
            {result.edgeCount} koppling(ar)
          </p>
          <ul className="list-disc pl-4 text-sm">
            <TreeNode node={result.tree} />
          </ul>
        </div>
      ) : null}
    </div>
  );
}
