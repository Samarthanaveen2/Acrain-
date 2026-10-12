// The Map: notes as dots, links as lines, laid out by a small force simulation.
import { findNote, noteLinks, slugify, type Note } from "@/lib/notes";

export type MapNode = {
  id: string;
  title: string;
  /** Missing for ghosts: notes you've linked to but haven't written yet */
  note?: Note;
  x: number;
  y: number;
  degree: number;
};
export type MapEdge = { a: string; b: string };
export type Graph = { nodes: MapNode[]; edges: MapEdge[] };
/** Where you've dragged dots to, by node id */
export type Positions = Record<string, [number, number]>;

export const ghostId = (title: string) => `missing:${slugify(title)}`;

export function buildGraph(notes: Note[]): Graph {
  const nodes = new Map<string, MapNode>();
  const add = (id: string, title: string, note?: Note) => {
    if (!nodes.has(id)) nodes.set(id, { id, title, note, x: 0, y: 0, degree: 0 });
    return nodes.get(id)!;
  };
  notes.forEach((n) => add(n.id, n.title, n));
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  for (const n of notes) {
    for (const t of noteLinks(n)) {
      const hit = findNote(notes, t);
      const target = hit ? nodes.get(hit.id)! : add(ghostId(t), t);
      if (target.id === n.id) continue;
      const key = [n.id, target.id].sort().join("\n");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: n.id, b: target.id });
      nodes.get(n.id)!.degree++;
      target.degree++;
    }
  }
  return { nodes: [...nodes.values()], edges };
}

/** Linked notes pull together, every note pushes the others away. Saved positions stay put. */
export function layout(graph: Graph, saved: Positions): Graph {
  const list = graph.nodes.map((n, i) => {
    const s = saved[n.id];
    const a = i * 2.399963; // golden-angle spiral start, so the layout is the same every time
    const r = 40 * Math.sqrt(i + 1);
    return { ...n, x: s ? s[0] : Math.cos(a) * r, y: s ? s[1] : Math.sin(a) * r, vx: 0, vy: 0, pinned: !!s };
  });
  const byId = new Map(list.map((n) => [n.id, n]));
  // New notes start next to something they link to, so they don't fly in from the spiral
  for (const n of list) {
    if (n.pinned) continue;
    const e = graph.edges.find((e) => (e.a === n.id && byId.get(e.b)?.pinned) || (e.b === n.id && byId.get(e.a)?.pinned));
    const anchor = e && byId.get(e.a === n.id ? e.b : e.a);
    if (anchor) {
      const a = (n.id.length * 1.7) % (Math.PI * 2);
      n.x = anchor.x + Math.cos(a) * 70;
      n.y = anchor.y + Math.sin(a) * 70;
    }
  }
  if (list.every((n) => n.pinned)) return { nodes: list.map(strip), edges: graph.edges };
  const pairs = graph.edges.map((e) => [byId.get(e.a)!, byId.get(e.b)!] as const);
  const steps = 300;
  for (let step = 0; step < steps; step++) {
    const heat = 1 - step / steps;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y || 0.01;
        const f = 24 / (dx * dx + dy * dy);
        a.vx -= dx * f;
        a.vy -= dy * f;
        b.vx += dx * f;
        b.vy += dy * f;
      }
    }
    for (const [a, b] of pairs) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 90) * 0.02;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
    for (const n of list) {
      if (n.pinned) continue;
      n.vx -= n.x * 0.004; // gentle pull to the middle
      n.vy -= n.y * 0.004;
      n.x += n.vx * heat;
      n.y += n.vy * heat;
      n.vx *= 0.6;
      n.vy *= 0.6;
    }
  }
  return { nodes: list.map(strip), edges: graph.edges };
}

function strip(n: MapNode & { vx: number; vy: number; pinned: boolean }): MapNode {
  return { id: n.id, title: n.title, note: n.note, x: n.x, y: n.y, degree: n.degree };
}

export function neighboursOf(graph: Graph, id: string | null) {
  const out = new Set<string>();
  if (!id) return out;
  for (const e of graph.edges) {
    if (e.a === id) out.add(e.b);
    else if (e.b === id) out.add(e.a);
  }
  return out;
}

export const dotRadius = (n: MapNode) => 6 + Math.min(10, Math.sqrt(n.degree) * 3);
