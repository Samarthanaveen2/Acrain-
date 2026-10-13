// Stacks: how something in the world actually works, as layers that sit on other layers.
// The top layer is the thing you see (Starbucks, Zomato); below it, everything it wraps.

export type Margin = "thin" | "medium" | "fat";
export type Threat = "safe" | "at-risk" | "being-eaten";

export type Layer = {
  id: string;
  /** null for the top of the stack */
  parent: string | null;
  name: string;
  /** How this layer works, in your words */
  how?: string;
  /** Who's in this layer: "Maersk, MSC, CMA CGM" */
  players?: string;
  /** How much of the money this layer keeps */
  margin?: Margin;
  /** Only a few players: power and fragility sit here */
  choke?: boolean;
  /** Could AI / open source / copying make this layer cheap? */
  threat?: Threat;
  threatBy?: string;
  /** I could enter here */
  plugIn?: boolean;
  plugHow?: string;
  /** Title of a note with deeper thinking */
  note?: string;
};

export type Stack = { id: string; title: string; created: string; updated: string; layers: Layer[] };

export const LENSES = [
  { key: "all", label: "All", question: "" },
  { key: "money", label: "Money", question: "Which layers keep the most money? Mark each layer thin, medium or fat." },
  { key: "choke", label: "Chokepoints", question: "Which layers have only a few players? Mark them as chokepoints." },
  { key: "eaten", label: "Eaten next", question: "Which layers could AI, open source or copying make cheap?" },
  { key: "plug", label: "Plug in", question: "Where could you enter this stack? What would it take?" },
] as const;
export type Lens = (typeof LENSES)[number]["key"];

export const MARGIN_COLOUR: Record<Margin, string> = { fat: "#2a623d", medium: "#c77400", thin: "#9a9a90" };
export const THREAT_COLOUR: Record<Threat, string> = { safe: "#2a623d", "at-risk": "#c77400", "being-eaten": "#8b0000" };
export const THREAT_LABEL: Record<Threat, string> = { safe: "Safe", "at-risk": "At risk", "being-eaten": "Being eaten" };

export const newId = () => Math.random().toString(36).slice(2, 10);

export function children(stack: Stack, id: string | null) {
  return stack.layers.filter((l) => l.parent === id);
}

export function top(stack: Stack) {
  return stack.layers.find((l) => l.parent === null);
}

/** The layer and everything under it */
export function subtree(stack: Stack, id: string): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const l of stack.layers) {
      if (l.parent && out.has(l.parent) && !out.has(l.id)) {
        out.add(l.id);
        grew = true;
      }
    }
  }
  return out;
}

export function depthOf(stack: Stack, id: string) {
  let d = 0;
  let l = stack.layers.find((x) => x.id === id);
  while (l?.parent) {
    d++;
    l = stack.layers.find((x) => x.id === l!.parent);
  }
  return d;
}

export function maxDepth(stack: Stack) {
  return stack.layers.reduce((m, l) => Math.max(m, depthOf(stack, l.id)), 0);
}

export const touch = (stack: Stack, layers: Layer[]): Stack => ({ ...stack, layers, updated: new Date().toISOString() });

export function addLayer(stack: Stack, parent: string | null, name: string): { stack: Stack; id: string } {
  const id = newId();
  return { stack: touch(stack, [...stack.layers, { id, parent, name }]), id };
}

export function updateLayer(stack: Stack, id: string, patch: Partial<Layer>): Stack {
  return touch(
    stack,
    stack.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
  );
}

export function removeLayer(stack: Stack, id: string): Stack {
  const gone = subtree(stack, id);
  return touch(
    stack,
    stack.layers.filter((l) => !gone.has(l.id)),
  );
}

/** A new stack with its top layer named after it */
export function newStack(title: string, existing: Stack[]): Stack {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "stack";
  let id = base;
  for (let i = 2; existing.some((s) => s.id === id); i++) id = `${base}-${i}`;
  const now = new Date().toISOString();
  return { id, title: title.trim(), created: now, updated: now, layers: [{ id: newId(), parent: null, name: title.trim() }] };
}

/** "Cloud servers" and "cloud server" count as the same layer */
export const layerKey = (l: Layer) =>
  (l.note ? `note:${l.note}` : l.name)
    .toLowerCase()
    .replace(/[^a-z0-9: ]+/g, " ")
    .replace(/s\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

export type Shared = { key: string; name: string; places: { stack: Stack; layer: Layer }[] };

/** Layers that show up under more than one stack: what lots of the world runs on */
export function sharedLayers(stacks: Stack[]): Shared[] {
  const by = new Map<string, Shared>();
  for (const stack of stacks) {
    for (const layer of stack.layers) {
      if (!layer.parent || !layer.name.trim()) continue;
      const key = layerKey(layer);
      const entry = by.get(key) ?? { key, name: layer.name, places: [] };
      if (!entry.places.some((p) => p.stack.id === stack.id)) entry.places.push({ stack, layer });
      by.set(key, entry);
    }
  }
  return [...by.values()].filter((s) => s.places.length > 1).sort((a, b) => b.places.length - a.places.length || a.name.localeCompare(b.name));
}

/** Other stacks that share this layer */
export function alsoIn(stacks: Stack[], stack: Stack, layer: Layer) {
  if (!layer.parent) return [];
  const key = layerKey(layer);
  return stacks.flatMap((s) => (s.id === stack.id ? [] : s.layers.filter((l) => l.parent && layerKey(l) === key).map((l) => ({ stack: s, layer: l }))));
}

/** Does this layer light up under the lens? */
export function inLens(layer: Layer, lens: Lens) {
  if (lens === "money") return !!layer.margin;
  if (lens === "choke") return !!layer.choke;
  if (lens === "eaten") return !!layer.threat && layer.threat !== "safe";
  if (lens === "plug") return !!layer.plugIn;
  return true;
}

/** One line that sums up what a lens shows, made only from what you marked */
export function lensReadout(stack: Stack, lens: Lens): string {
  const names = (ls: Layer[]) => ls.map((l) => l.name).join(", ");
  if (lens === "money") {
    const fat = stack.layers.filter((l) => l.margin === "fat");
    const thin = stack.layers.filter((l) => l.margin === "thin");
    if (!fat.length && !thin.length) return "";
    return [fat.length ? `Money pools at ${names(fat)}` : "", thin.length ? `squeezed: ${names(thin)}` : ""].filter(Boolean).join(" · ");
  }
  if (lens === "choke") {
    const c = stack.layers.filter((l) => l.choke);
    return c.length ? `${c.length} ${c.length === 1 ? "chokepoint" : "chokepoints"}: ${names(c)}` : "";
  }
  if (lens === "eaten") {
    const e = stack.layers.filter((l) => l.threat === "being-eaten");
    const r = stack.layers.filter((l) => l.threat === "at-risk");
    if (!e.length && !r.length) return "";
    return [e.length ? `Being eaten: ${names(e)}` : "", r.length ? `at risk: ${names(r)}` : ""].filter(Boolean).join(" · ");
  }
  if (lens === "plug") {
    const p = stack.layers.filter((l) => l.plugIn);
    return p.length ? `You could enter at ${names(p)}` : "";
  }
  return "";
}

/** Stack layers that link to a note, for the note's "In stacks" list */
export function layersForNote(stacks: Stack[], title: string) {
  const t = title.trim().toLowerCase();
  return stacks.flatMap((s) => s.layers.filter((l) => l.note?.trim().toLowerCase() === t).map((layer) => ({ stack: s, layer })));
}
