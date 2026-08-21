/**
 * Spårbarhetsdomän — rena funktioner utan DB.
 *
 * Genealogi: förbrukad batch/individ → producerad batch/individ.
 * Traversering i båda riktningarna sker i service-lagret med WITH RECURSIVE;
 * här byggs sammanfattning och validering.
 */

export type TraceabilityMode = "none" | "batch" | "serial";

export type GenealogyNodeKind = "batch" | "serial";

export type GenealogyNodeRef = {
  kind: GenealogyNodeKind;
  id: string;
  label: string;
  partNumber?: string;
  partDescription?: string;
};

export type GenealogyTreeNode = GenealogyNodeRef & {
  depth: number;
  quantity?: number;
  children: GenealogyTreeNode[];
};

export type TraceImpactSummary = {
  rootLabel: string;
  direction: "backward" | "forward";
  batchCount: number;
  serialCount: number;
  manufacturingOrderRefs: string[];
  /** Kort svensk sammanfattning för UI / återkallning. */
  headline: string;
};

export class TraceabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TraceabilityError";
  }
}

/**
 * Kräv batch/serie enligt artikelns spårbarhetsläge.
 */
export function assertTraceabilityRequirement(
  mode: TraceabilityMode,
  opts: { batchId?: string | null; serialUnitId?: string | null; quantity: number },
): void {
  if (mode === "batch" && !opts.batchId) {
    throw new TraceabilityError("Batch krävs för denna artikel");
  }
  if (mode === "serial") {
    if (!opts.serialUnitId) {
      throw new TraceabilityError("Serienummer krävs för denna artikel");
    }
    if (opts.quantity !== 1) {
      throw new TraceabilityError(
        "Serieartikel måste bokföras med antal 1 per serienummer",
      );
    }
  }
}

export type FlatGenealogyEdge = {
  consumedBatchId: string | null;
  consumedSerialId: string | null;
  producedBatchId: string | null;
  producedSerialId: string | null;
  quantity: number;
  manufacturingOrderRef: string | null;
  depth: number;
};

function nodeKey(kind: GenealogyNodeKind, id: string): string {
  return `${kind}:${id}`;
}

/**
 * Bygger ett träd från platta rekursiva rader (från WITH RECURSIVE).
 * `root` är startnoden; `direction` styr om edges följs bakåt eller framåt.
 */
export function buildGenealogyTree(
  root: GenealogyNodeRef,
  edges: FlatGenealogyEdge[],
  direction: "backward" | "forward",
  labels: Map<string, GenealogyNodeRef>,
): GenealogyTreeNode {
  const childrenByParent = new Map<string, GenealogyTreeNode[]>();

  for (const edge of edges) {
    const consumed =
      edge.consumedBatchId != null
        ? nodeKey("batch", edge.consumedBatchId)
        : edge.consumedSerialId != null
          ? nodeKey("serial", edge.consumedSerialId)
          : null;
    const produced =
      edge.producedBatchId != null
        ? nodeKey("batch", edge.producedBatchId)
        : edge.producedSerialId != null
          ? nodeKey("serial", edge.producedSerialId)
          : null;
    if (!consumed || !produced) continue;

    const parentKey = direction === "forward" ? consumed : produced;
    const childKey = direction === "forward" ? produced : consumed;
    const childRef = labels.get(childKey);
    if (!childRef) continue;

    const list = childrenByParent.get(parentKey) ?? [];
    list.push({
      ...childRef,
      depth: edge.depth,
      quantity: edge.quantity,
      children: [],
    });
    childrenByParent.set(parentKey, list);
  }

  function attach(node: GenealogyTreeNode): GenealogyTreeNode {
    const kids = childrenByParent.get(nodeKey(node.kind, node.id)) ?? [];
    return {
      ...node,
      children: kids.map(attach),
    };
  }

  return attach({ ...root, depth: 0, children: [] });
}

/**
 * Sammanfattar påverkansområde för återkallning / bakåtspårning.
 */
export function summarizeTraceImpact(
  rootLabel: string,
  direction: "backward" | "forward",
  edges: FlatGenealogyEdge[],
  labels: Map<string, GenealogyNodeRef>,
): TraceImpactSummary {
  const batchIds = new Set<string>();
  const serialIds = new Set<string>();
  const moRefs = new Set<string>();

  for (const edge of edges) {
    for (const id of [edge.consumedBatchId, edge.producedBatchId]) {
      if (id) batchIds.add(id);
    }
    for (const id of [edge.consumedSerialId, edge.producedSerialId]) {
      if (id) serialIds.add(id);
    }
    if (edge.manufacturingOrderRef) moRefs.add(edge.manufacturingOrderRef);
  }

  // Räkna inte root om den finns i labels-mappen som batch/serial
  const batchCount = batchIds.size;
  const serialCount = serialIds.size;
  const moList = [...moRefs];

  let headline: string;
  if (direction === "forward") {
    headline = `${rootLabel} ingår i ${batchCount} batch(er) och ${serialCount} individ(er)`;
    if (moList.length > 0) {
      headline += ` via ${moList.length} tillverkningsorder`;
    }
    headline += ".";
  } else {
    headline = `${rootLabel} spåras bakåt till ${batchCount} batch(er) och ${serialCount} individ(er)`;
    if (moList.length > 0) {
      headline += ` via ${moList.length} tillverkningsorder`;
    }
    headline += ".";
  }

  // labels unused except future extension
  void labels;

  return {
    rootLabel,
    direction,
    batchCount,
    serialCount,
    manufacturingOrderRefs: moList,
    headline,
  };
}
