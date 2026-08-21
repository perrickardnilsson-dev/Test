/**
 * Artikelstruktur (BOM) — rena funktioner utan DB.
 *
 * Low-level code, cirkeldetektering, trädvy och explosion av fantomer.
 */

export type BomEdge = {
  parentPartId: string;
  componentPartId: string;
  quantityPer: number;
  scrapPercent: number;
  position?: number;
};

export type BomTreeNode = {
  partId: string;
  quantityPer: number;
  scrapPercent: number;
  effectiveQuantity: number;
  depth: number;
  isPhantom: boolean;
  children: BomTreeNode[];
};

export class BomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BomError";
  }
}

/** Effektiv kvantitet inkl. spill: qty / (1 - scrap/100). */
export function effectiveQuantityPer(
  quantityPer: number,
  scrapPercent: number,
): number {
  if (quantityPer < 0) {
    throw new BomError("Kvantitet per får inte vara negativ");
  }
  if (scrapPercent < 0 || scrapPercent >= 100) {
    throw new BomError("Spillprocent måste vara mellan 0 och 99.99");
  }
  return quantityPer / (1 - scrapPercent / 100);
}

/**
 * Beräkna low-level code: djupaste nivå varje artikel förekommer på.
 * LLC 0 = toppnivå (färdigvara). Högre = djupare komponent.
 */
export function calculateLowLevelCodes(
  partIds: string[],
  edges: BomEdge[],
): Record<string, number> {
  detectCircularBom(edges);

  const codes: Record<string, number> = {};
  for (const id of partIds) {
    codes[id] = 0;
  }
  for (const e of edges) {
    if (!(e.parentPartId in codes)) codes[e.parentPartId] = 0;
    if (!(e.componentPartId in codes)) codes[e.componentPartId] = 0;
  }

  let changed = true;
  let guard = 0;
  while (changed) {
    changed = false;
    guard += 1;
    if (guard > partIds.length + edges.length + 10) {
      throw new BomError("Kunde inte konvergera low-level code");
    }
    for (const e of edges) {
      const next = (codes[e.parentPartId] ?? 0) + 1;
      if (next > (codes[e.componentPartId] ?? 0)) {
        codes[e.componentPartId] = next;
        changed = true;
      }
    }
  }

  return codes;
}

/**
 * DFS-cirkeldetektering. Kastar BomError med tydligt meddelande.
 */
export function detectCircularBom(edges: BomEdge[]): void {
  const children = new Map<string, string[]>();
  for (const e of edges) {
    const list = children.get(e.parentPartId) ?? [];
    list.push(e.componentPartId);
    children.set(e.parentPartId, list);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): void {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      const cycleStart = stack.indexOf(node);
      const cycle = [...stack.slice(cycleStart), node].join(" → ");
      throw new BomError(`Cirkulär struktur upptäckt: ${cycle}`);
    }
    visiting.add(node);
    stack.push(node);
    for (const child of children.get(node) ?? []) {
      dfs(child);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const parent of children.keys()) {
    dfs(parent);
  }
}

export type PartTypeLookup = Record<
  string,
  "purchased" | "manufactured" | "phantom" | "service"
>;

/**
 * Bygg träd för en toppartikel. Fantomnoder markeras men barn behålls.
 */
export function buildBomTree(
  rootPartId: string,
  edges: BomEdge[],
  partTypes: PartTypeLookup,
  maxDepth = 20,
): BomTreeNode {
  detectCircularBom(edges);

  const byParent = new Map<string, BomEdge[]>();
  for (const e of edges) {
    const list = byParent.get(e.parentPartId) ?? [];
    list.push(e);
    byParent.set(e.parentPartId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  function walk(partId: string, depth: number): BomTreeNode {
    if (depth > maxDepth) {
      throw new BomError(`BOM-djup överskrider ${maxDepth} nivåer`);
    }
    const type = partTypes[partId] ?? "purchased";
    const children: BomTreeNode[] = [];
    for (const e of byParent.get(partId) ?? []) {
      const child = walk(e.componentPartId, depth + 1);
      children.push({
        ...child,
        quantityPer: e.quantityPer,
        scrapPercent: e.scrapPercent,
        effectiveQuantity: effectiveQuantityPer(e.quantityPer, e.scrapPercent),
      });
    }
    return {
      partId,
      quantityPer: 1,
      scrapPercent: 0,
      effectiveQuantity: 1,
      depth,
      isPhantom: type === "phantom",
      children,
    };
  }

  return walk(rootPartId, 0);
}

export type ExplodedComponent = {
  partId: string;
  quantity: number;
  /** Sann om komponenten själv är fantom (ska inte planeras). */
  isPhantom: boolean;
};

/**
 * Spräng en nivå. Fantomkomponenter sprängs vidare (multiplicerat)
 * och ingår inte själva i resultatet.
 */
export function explodeBomLevel(
  parentPartId: string,
  parentQuantity: number,
  edges: BomEdge[],
  partTypes: PartTypeLookup,
): ExplodedComponent[] {
  detectCircularBom(edges);

  const byParent = new Map<string, BomEdge[]>();
  for (const e of edges) {
    const list = byParent.get(e.parentPartId) ?? [];
    list.push(e);
    byParent.set(e.parentPartId, list);
  }

  const result: ExplodedComponent[] = [];

  function explode(partId: string, qty: number, depth: number): void {
    if (depth > 30) {
      throw new BomError("BOM-explosion för djup");
    }
    for (const e of byParent.get(partId) ?? []) {
      const componentQty =
        qty * effectiveQuantityPer(e.quantityPer, e.scrapPercent);
      const type = partTypes[e.componentPartId] ?? "purchased";
      if (type === "phantom") {
        explode(e.componentPartId, componentQty, depth + 1);
      } else {
        result.push({
          partId: e.componentPartId,
          quantity: componentQty,
          isPhantom: false,
        });
      }
    }
  }

  explode(parentPartId, parentQuantity, 0);

  // Aggregera samma komponent
  const aggregated = new Map<string, number>();
  for (const row of result) {
    aggregated.set(row.partId, (aggregated.get(row.partId) ?? 0) + row.quantity);
  }
  return [...aggregated.entries()].map(([partId, quantity]) => ({
    partId,
    quantity,
    isPhantom: false,
  }));
}
