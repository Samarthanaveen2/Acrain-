// The Playground: one endless board of boxes, stickies, text, ink and arrows.
// Positions are in board units; the camera turns them into screen pixels.

export type Colour = "paper" | "ink" | "gold" | "green" | "blue" | "red";
export const COLOURS: Colour[] = ["paper", "ink", "gold", "green", "blue", "red"];

/** Fill, border and text for each colour */
export const PAINT: Record<Colour, { fill: string; edge: string; side: string; text: string }> = {
  paper: { fill: "#fbf8ea", edge: "#111", side: "#e6e0c6", text: "#111" },
  ink: { fill: "#111", edge: "#111", side: "#4a4a46", text: "#fffff8" },
  gold: { fill: "#ecc65e", edge: "#6b4f12", side: "#b48a26", text: "#2b1f04" },
  green: { fill: "#d9eadf", edge: "#2a623d", side: "#a9cbb4", text: "#14321e" },
  blue: { fill: "#dce7ef", edge: "#31566f", side: "#a9c2d1", text: "#16283a" },
  red: { fill: "#f6dedb", edge: "#8b0000", side: "#e0aaa4", text: "#4a0b0b" },
};
export const STICKY: Record<Colour, string> = {
  paper: "#f4efd8",
  ink: "#2b2b28",
  gold: "#f7e08a",
  green: "#cfe8c8",
  blue: "#cfe1f2",
  red: "#f6cfcf",
};

type Base = { id: string };
export type BoxShape = Base & { type: "box"; x: number; y: number; w: number; h: number; text: string; colour: Colour; note?: string };
export type StickyShape = Base & { type: "sticky"; x: number; y: number; w: number; h: number; text: string; colour: Colour };
export type TextShape = Base & { type: "text"; x: number; y: number; w: number; h: number; text: string; size: "s" | "m" | "l" };
export type InkShape = Base & { type: "ink"; points: [number, number, number][]; colour: string; size: number; pen?: boolean };
export const INKS = ["#111", "#2a623d", "#31566f", "#c77400", "#8b0000"];
export type End = { shape: string } | { x: number; y: number };
export type ArrowShape = Base & { type: "arrow"; from: End; to: End; label?: string };
export type Shape = BoxShape | StickyShape | TextShape | InkShape | ArrowShape;
export type Framed = BoxShape | StickyShape | TextShape;

export type Board = { shapes: Shape[]; updated?: string };
export type Rect = { x: number; y: number; w: number; h: number };

export const GAP = 8; // space between stacked slabs (room for the slab's thick side)
export const TEXT_SIZE = { s: 15, m: 20, l: 30 };

export const newId = () => Math.random().toString(36).slice(2, 10);
export const isFramed = (s: Shape): s is Framed => s.type === "box" || s.type === "sticky" || s.type === "text";

/** The rectangle a shape covers */
export function bounds(s: Shape, all: Shape[] = []): Rect | null {
  if (isFramed(s)) return { x: s.x, y: s.y, w: s.w, h: s.h };
  if (s.type === "ink") {
    if (!s.points.length) return null;
    const xs = s.points.map((p) => p[0]);
    const ys = s.points.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  const a = endPoint(s.from, s.to, all);
  const b = endPoint(s.to, s.from, all);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

export function boardBounds(shapes: Shape[]): Rect | null {
  const rs = shapes.map((s) => bounds(s, shapes)).filter((r): r is Rect => !!r);
  if (!rs.length) return null;
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
}

const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Where a line from a rectangle's centre towards a point leaves the rectangle */
export function edgePoint(r: Rect, toward: { x: number; y: number }, pad = 4) {
  const c = centre(r);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (!dx && !dy) return c;
  const hw = r.w / 2 + pad;
  const hh = r.h / 2 + pad;
  const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

/** An arrow end in board units: on the edge of the shape it's attached to, or a free point */
export function endPoint(end: End, other: End, all: Shape[]): { x: number; y: number } {
  if ("x" in end) return end;
  const s = all.find((x) => x.id === end.shape);
  const r = s && isFramed(s) ? bounds(s) : null;
  if (!r) return { x: 0, y: 0 };
  let toward: { x: number; y: number };
  if ("x" in other) toward = other;
  else {
    const o = all.find((x) => x.id === other.shape);
    const or = o && isFramed(o) ? bounds(o) : null;
    toward = or ? centre(or) : centre(r);
  }
  return edgePoint(r, toward);
}

/**
 * Stacking: a box dragged close to another box's top or bottom edge sits flush against it.
 * Returns the adjusted rectangle and the box it snapped to.
 */
export function snapStack(shapes: Shape[], movingId: string, r: Rect, tolerance: number): { rect: Rect; to: string | null } {
  let best: { rect: Rect; to: string; d: number } | null = null;
  for (const o of shapes) {
    if (o.type !== "box" || o.id === movingId) continue;
    const overlap = Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x);
    if (overlap < Math.min(r.w, o.w) * 0.3) continue;
    const below = o.y + o.h + GAP; // r sits under o
    const above = o.y - GAP - r.h; // r sits on top of o
    for (const y of [below, above]) {
      const d = Math.abs(r.y - y);
      if (d < tolerance && (!best || d < best.d)) {
        let x = r.x;
        if (Math.abs(r.x - o.x) < tolerance) x = o.x;
        else if (Math.abs(r.x + r.w - (o.x + o.w)) < tolerance) x = o.x + o.w - r.w;
        else if (Math.abs(r.x + r.w / 2 - (o.x + o.w / 2)) < tolerance) x = o.x + o.w / 2 - r.w / 2;
        best = { rect: { ...r, x, y }, to: o.id, d };
      }
    }
  }
  return best ? { rect: best.rect, to: best.to } : { rect: r, to: null };
}

/** The box sitting flush under this one, if any */
function boxBelow(shapes: Shape[], b: BoxShape): BoxShape | undefined {
  return shapes.find(
    (o): o is BoxShape =>
      o.type === "box" && o.id !== b.id && Math.abs(o.y - (b.y + b.h + GAP)) < 1 && Math.min(o.x + o.w, b.x + b.w) - Math.max(o.x, b.x) > 0,
  );
}

/** A new slab at the bottom of this box's stack, the same width */
export function addUnder(shapes: Shape[], id: string): { shapes: Shape[]; id: string } | null {
  let b = shapes.find((s): s is BoxShape => s.id === id && s.type === "box");
  if (!b) return null;
  for (let next = boxBelow(shapes, b); next; next = boxBelow(shapes, b)) b = next;
  const nb: BoxShape = { id: newId(), type: "box", x: b.x, y: b.y + b.h + GAP, w: b.w, h: Math.min(b.h, 72), text: "", colour: "paper" };
  return { shapes: [...shapes, nb], id: nb.id };
}

export function duplicate(shapes: Shape[], id: string): { shapes: Shape[]; id: string } | null {
  const s = shapes.find((x) => x.id === id);
  if (!s || !isFramed(s)) return null;
  const copy = { ...s, id: newId(), x: s.x + 24, y: s.y + 24 } as Shape;
  return { shapes: [...shapes, copy], id: copy.id };
}

export const bringFront = (shapes: Shape[], id: string) => [...shapes.filter((s) => s.id !== id), ...shapes.filter((s) => s.id === id)];
export const sendBack = (shapes: Shape[], id: string) => [...shapes.filter((s) => s.id === id), ...shapes.filter((s) => s.id !== id)];

/** Removes a shape, and any arrow attached to it */
/** Removes a shape. Connections attached to it stay, with that end left loose where the shape's edge was. */
export function remove(shapes: Shape[], id: string): Shape[] {
  return detachFrom(shapes, id).filter((s) => s.id !== id);
}

/** Lets go of a shape: any connection end attached to it becomes a loose point in the same place */
export function detachFrom(shapes: Shape[], id: string): Shape[] {
  return shapes.map((s) => {
    if (s.type !== "arrow") return s;
    const fromHere = "shape" in s.from && s.from.shape === id;
    const toHere = "shape" in s.to && s.to.shape === id;
    if (!fromHere && !toHere) return s;
    return {
      ...s,
      from: fromHere ? endPoint(s.from, s.to, shapes) : s.from,
      to: toHere ? endPoint(s.to, s.from, shapes) : s.to,
    };
  });
}

export function patch(shapes: Shape[], id: string, p: Partial<Shape>): Shape[] {
  return shapes.map((s) => (s.id === id ? ({ ...s, ...p } as Shape) : s));
}

// ---- Undo / redo ----
export type History = { past: Shape[][]; future: Shape[][] };
export const LIMIT = 100;
export function record(h: History, before: Shape[]): History {
  return { past: [...h.past, before].slice(-LIMIT), future: [] };
}
export function undo(h: History, now: Shape[]): { h: History; shapes: Shape[] } | null {
  if (!h.past.length) return null;
  return { h: { past: h.past.slice(0, -1), future: [now, ...h.future] }, shapes: h.past[h.past.length - 1] };
}
export function redo(h: History, now: Shape[]): { h: History; shapes: Shape[] } | null {
  if (!h.future.length) return null;
  return { h: { past: [...h.past, now], future: h.future.slice(1) }, shapes: h.future[0] };
}

/** Boxes linked to a note, for the note's "On the board" list */
export function boxesForNote(shapes: Shape[], title: string) {
  const t = title.trim().toLowerCase();
  return shapes.filter((s): s is BoxShape => s.type === "box" && s.note?.trim().toLowerCase() === t);
}

// ---- Canvases: many boards, one per topic (some belong to a note) ----
export type Canvas = { id: string; title: string; /** id of the note it belongs to */ note?: string; shapes: Shape[]; created: string; updated: string };

export function newCanvas(title: string, existing: Canvas[], note?: string): Canvas {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "canvas";
  let id = base;
  for (let i = 2; existing.some((c) => c.id === id); i++) id = `${base}-${i}`;
  const now = new Date().toISOString();
  return { id, title: title.trim() || "Untitled canvas", ...(note ? { note } : {}), shapes: [], created: now, updated: now };
}

/** A note's canvas is called whatever the note is called now */
export function canvasTitle(c: Canvas, notes: { id: string; title: string }[]) {
  const n = c.note ? notes.find((x) => x.id === c.note) : undefined;
  return n?.title || c.title;
}

/** Boxes linked to a note, on every canvas */
export function boxesForNoteEverywhere(canvases: Canvas[], title: string) {
  return canvases.flatMap((canvas) => boxesForNote(canvas.shapes, title).map((box) => ({ canvas, box })));
}

/** Every box stacked flush under this one (or on top of it), nearest first */
export function stackChain(shapes: Shape[], id: string, dir: "below" | "above"): BoxShape[] {
  const out: BoxShape[] = [];
  let cur = shapes.find((s): s is BoxShape => s.id === id && s.type === "box");
  while (cur) {
    const c: BoxShape = cur;
    const next = shapes.find(
      (o): o is BoxShape =>
        o.type === "box" &&
        o.id !== c.id &&
        !out.includes(o as BoxShape) &&
        Math.abs(dir === "below" ? o.y - (c.y + c.h + GAP) : o.y + o.h + GAP - c.y) < 1 &&
        Math.min(o.x + o.w, c.x + c.w) - Math.max(o.x, c.x) > 0,
    );
    if (next) out.push(next);
    cur = next;
  }
  return out;
}
