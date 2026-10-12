"use client";

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import { colourOf, dotRadius, hull, neighboursOf, type Graph } from "@/lib/map";

type View = { x: number; y: number; k: number };
export type MapHandle = { fit: (animate?: boolean) => void; centreOn: (id: string) => void };

const MIN_K = 0.3;
const MAX_K = 4;
const TAP = 6; // px a finger can wander and still count as a tap
const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));

/**
 * A pinch-zoom canvas: one finger pans (or drags a dot), two fingers zoom.
 * `bottomInset` is the height covered by the peek card, so centring keeps the dot visible.
 */
export default function MapCanvas({
  graph,
  selected,
  onSelect,
  onMove,
  bottomInset = 0,
  colours,
  theme = null,
  halos = [],
  onLink,
  onLongPress,
  ref,
}: {
  graph: Graph;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  bottomInset?: number;
  /** Tag → colour */
  colours: Map<string, string>;
  /** A tag to highlight, or null for everything */
  theme?: string | null;
  /** Soft areas drawn behind groups of dots */
  halos?: { key: string; colour: string; ids: string[] }[];
  /** Dragged from the picked note's ＋ handle onto another dot */
  onLink?: (from: string, to: string) => void;
  /** Held a finger on empty space; world coordinates */
  onLongPress?: (x: number, y: number) => void;
  ref?: Ref<MapHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const viewRef = useRef<View | null>(null);
  const anim = useRef(0);
  // Dots being dragged right now (not saved until the finger lifts)
  const [moved, setMoved] = useState<Record<string, [number, number]>>({});

  useLayoutEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const apply = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);

  const animateTo = useCallback(
    (to: View) => {
      cancelAnimationFrame(anim.current);
      const from = viewRef.current ?? to;
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / 320);
        const e = 1 - Math.pow(1 - p, 3);
        apply({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e });
        if (p < 1) anim.current = requestAnimationFrame(step);
      };
      anim.current = requestAnimationFrame(step);
    },
    [apply],
  );

  const pos = useCallback(
    (id: string) => {
      const m = moved[id];
      if (m) return { x: m[0], y: m[1] };
      const n = graph.nodes.find((n) => n.id === id);
      return n ? { x: n.x, y: n.y } : null;
    },
    [graph, moved],
  );

  const fitView = useCallback((): View | null => {
    if (!size.w || !graph.nodes.length) return null;
    const xs = graph.nodes.map((n) => n.x);
    const ys = graph.nodes.map((n) => n.y);
    const pad = 50;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad + 16;
    const k = clampK(Math.min(size.w / (maxX - minX), size.h / (maxY - minY), 1.6));
    return { k, x: size.w / 2 - ((minX + maxX) / 2) * k, y: size.h / 2 - ((minY + maxY) / 2) * k };
  }, [graph, size]);

  // First time the canvas has a size: show everything
  useEffect(() => {
    if (!viewRef.current) {
      const v = fitView();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the first view depends on the measured size
      if (v) apply(v);
    }
  }, [fitView, apply]);

  const centreOn = useCallback(
    (id: string) => {
      const p = pos(id);
      const v = viewRef.current;
      if (!p || !v) return;
      const k = Math.max(v.k, 0.9);
      const visibleH = Math.max(120, size.h - bottomInset);
      animateTo({ k, x: size.w / 2 - p.x * k, y: visibleH / 2 - p.y * k });
    },
    [pos, size, bottomInset, animateTo],
  );

  // A newly picked dot glides to the middle of the space above the peek card
  const centreRef = useRef(centreOn);
  useEffect(() => {
    centreRef.current = centreOn;
  });
  useEffect(() => {
    if (selected) centreRef.current(selected);
  }, [selected, bottomInset]);

  useImperativeHandle(
    ref,
    () => ({
      fit: (animate = true) => {
        const v = fitView();
        if (!v) return;
        if (animate) animateTo(v);
        else apply(v);
      },
      centreOn,
    }),
    [fitView, animateTo, apply, centreOn],
  );

  // ---- Gestures ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    kind: "none" | "pan" | "dot" | "pinch" | "link";
    node?: string;
    start: { x: number; y: number };
    view: View;
    nodeStart?: { x: number; y: number };
    dist?: number;
    mid?: { x: number; y: number };
    movedFar: boolean;
  } | null>(null);

  // The line you're pulling out of a note to link it, in map coordinates
  const [rubber, setRubber] = useState<{ from: string; x: number; y: number; over?: string } | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toWorld = (q: { x: number; y: number }) => {
    const v = viewRef.current!;
    return { x: (q.x - v.x) / v.k, y: (q.y - v.y) / v.k };
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = {
      kind: "pinch",
      start: a,
      view: viewRef.current!,
      dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      movedFar: true,
    };
  };

  const down = (e: React.PointerEvent) => {
    if (!viewRef.current) return;
    cancelAnimationFrame(anim.current);
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // Not a real pointer (tests); moves still arrive on the canvas
    }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    clearTimeout(hold.current);
    if (pointers.current.size === 2) {
      setRubber(null);
      return startPinch();
    }
    if (pointers.current.size > 2) return;
    if ((e.target as Element).closest("[data-handle]") && selected) {
      const from = pos(selected)!;
      gesture.current = { kind: "link", node: selected, start: p, view: viewRef.current, movedFar: true };
      setRubber({ from: selected, x: from.x, y: from.y });
      return;
    }
    const node = (e.target as Element).closest("[data-node]")?.getAttribute("data-node") ?? undefined;
    gesture.current = {
      kind: node ? "dot" : "pan",
      node,
      start: p,
      view: viewRef.current,
      nodeStart: node ? (pos(node) ?? undefined) : undefined,
      movedFar: false,
    };
    if (!node && onLongPress) {
      const g = gesture.current;
      hold.current = setTimeout(() => {
        if (gesture.current !== g || g.movedFar || pointers.current.size !== 1) return;
        gesture.current = null;
        onLongPress(toWorld(g.start).x, toWorld(g.start).y);
      }, 500);
    }
  };

  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = clampK(g.view.k * (dist / g.dist!));
      // Keep the world point under the starting midpoint under the fingers
      const wx = (g.mid!.x - g.view.x) / g.view.k;
      const wy = (g.mid!.y - g.view.y) / g.view.k;
      apply({ k, x: mid.x - wx * k, y: mid.y - wy * k });
      return;
    }
    if (g.kind === "link") {
      // Near an edge: slide the map so dots off screen can be reached
      const edge = 44;
      const push = (v: number, max: number) => (v < edge ? edge - v : v > max - edge ? max - edge - v : 0) * 0.35;
      const sx = push(p.x, size.w);
      const sy = push(p.y, size.h - bottomInset);
      if (sx || sy) apply({ ...viewRef.current!, x: viewRef.current!.x + sx, y: viewRef.current!.y + sy });
      const w = toWorld(p);
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-node]")?.getAttribute("data-node") ?? undefined;
      setRubber({ from: g.node!, x: w.x, y: w.y, over: over !== g.node ? over : undefined });
      return;
    }
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;
    if (!g.movedFar && Math.hypot(dx, dy) < TAP) return;
    g.movedFar = true;
    clearTimeout(hold.current);
    if (g.kind === "pan") apply({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
    else if (g.kind === "dot" && g.node && g.nodeStart) {
      const k = viewRef.current!.k;
      setMoved((m) => ({ ...m, [g.node!]: [g.nodeStart!.x + dx / k, g.nodeStart!.y + dy / k] }));
    }
  };

  const up = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (g?.kind === "pinch") {
      // One finger still down: carry on as a pan from here
      const rest = [...pointers.current.values()][0];
      gesture.current = rest ? { kind: "pan", start: rest, view: viewRef.current!, movedFar: true } : null;
      return;
    }
    gesture.current = null;
    clearTimeout(hold.current);
    if (g?.kind === "link") {
      if (rubber?.over && e.type !== "pointercancel") onLink?.(g.node!, rubber.over);
      setRubber(null);
      return;
    }
    if (!g || e.type === "pointercancel") return;
    if (!g.movedFar) {
      onSelect(g.kind === "dot" && g.node ? (g.node === selected ? null : g.node) : null);
    } else if (g.kind === "dot" && g.node) {
      const m = moved[g.node];
      if (m) onMove(g.node, m[0], m[1]);
    }
  };

  // Once a dragged dot's new place arrives from storage, forget the temporary copy
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears drag overrides when saved positions come back
    setMoved((m) => {
      const left = Object.fromEntries(
        Object.entries(m).filter(([id, [x, y]]) => {
          const n = graph.nodes.find((n) => n.id === id);
          return n && (Math.abs(n.x - x) > 0.5 || Math.abs(n.y - y) > 0.5);
        }),
      );
      return Object.keys(left).length === Object.keys(m).length ? m : left;
    });
  }, [graph]);

  const wheel = (e: React.WheelEvent) => {
    const v = viewRef.current;
    if (!v) return;
    const p = local(e);
    const k = clampK(v.k * Math.exp(-e.deltaY * 0.002));
    apply({ k, x: p.x - ((p.x - v.x) / v.k) * k, y: p.y - ((p.y - v.y) / v.k) * k });
  };

  const near = neighboursOf(graph, selected);
  // What's in focus: the picked dot and its neighbours, or every note with the picked tag
  const focus = selected
    ? new Set([selected, ...near])
    : theme
      ? new Set(graph.nodes.filter((n) => n.note?.tags.includes(theme)).map((n) => n.id))
      : null;
  const picked = graph.nodes.find((n) => n.id === selected);
  const litColour = picked
    ? colourOf(picked, colours) === "#111" ? "var(--accent)" : colourOf(picked, colours)
    : (theme && colours.get(theme)) || "var(--accent)";
  const k = view?.k ?? 1;
  const xy = (id: string) => pos(id) ?? { x: 0, y: 0 };

  return (
    <div ref={box} className="map-canvas relative h-full w-full overflow-hidden">
      <svg
        className="block h-full w-full touch-none select-none"
        role="img"
        aria-label="Map of notes and their links"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
      >
        {view && (
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {halos.map((h) => {
              const pts = hull(h.ids.map(xy));
              const pad = 30;
              return (
                <g key={h.key} opacity={0.1} className="pointer-events-none">
                  {pts.length === 1 ? (
                    <circle cx={pts[0].x} cy={pts[0].y} r={pad} fill={h.colour} />
                  ) : (
                    <polygon
                      points={pts.map((q) => `${q.x},${q.y}`).join(" ")}
                      fill={h.colour}
                      stroke={h.colour}
                      strokeWidth={pad * 2}
                      strokeLinejoin="round"
                    />
                  )}
                </g>
              );
            })}
            {graph.edges.map((e) => {
              const a = xy(e.a);
              const b = xy(e.b);
              const lit = selected ? e.a === selected || e.b === selected : !!focus && focus.has(e.a) && focus.has(e.b);
              const ghost = e.a.startsWith("missing:") || e.b.startsWith("missing:");
              return (
                <line
                  key={`${e.a}|${e.b}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={lit ? litColour : "#b9b9ae"}
                  strokeWidth={(lit ? 2.4 : 1.3) / Math.sqrt(k)}
                  strokeDasharray={ghost ? "4 3" : undefined}
                  opacity={focus && !lit ? 0.25 : 1}
                />
              );
            })}
            {graph.nodes.map((n) => {
              const p = xy(n.id);
              const on = n.id === selected;
              const lit = !!focus && focus.has(n.id);
              const dim = focus && !lit;
              const r = dotRadius(n);
              const colour = colourOf(n, colours);
              const showLabel = lit || k >= 0.7 || (k >= 0.45 && n.degree >= 3);
              const label = n.title.length > 26 ? `${n.title.slice(0, 25)}…` : n.title;
              return (
                <g
                  key={n.id}
                  data-node={n.id}
                  transform={`translate(${p.x},${p.y})`}
                  opacity={dim ? 0.2 : 1}
                  className="cursor-pointer"
                  style={{ transition: "opacity 200ms" }}
                >
                  <circle r={Math.max(r + 8, 20 / k)} fill="transparent" />
                  {on && <circle r={r + 6} fill="none" stroke={colour === "#111" ? "var(--accent)" : colour} strokeWidth={2.5} opacity={0.45} />}
                  <circle
                    r={r}
                    fill={n.note ? colour : "#fffff8"}
                    stroke={n.note ? "none" : on ? "var(--accent)" : "#8a8a80"}
                    strokeDasharray={n.note ? undefined : "3 2"}
                    strokeWidth={1.5}
                  />
                  {showLabel && (
                    <text
                      y={r + 14}
                      textAnchor="middle"
                      fontSize={on ? 14 : 12.5}
                      fontWeight={on ? 600 : 400}
                      fill={n.note ? "#111" : "#8a8a80"}
                      stroke="#fffff8"
                      strokeWidth={3.5}
                      paintOrder="stroke"
                      className="pointer-events-none font-serif"
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
            {rubber && (
              <line
                x1={xy(rubber.from).x}
                y1={xy(rubber.from).y}
                x2={rubber.over ? xy(rubber.over).x : rubber.x}
                y2={rubber.over ? xy(rubber.over).y : rubber.y}
                stroke="var(--accent)"
                strokeWidth={2.5 / Math.sqrt(k)}
                strokeDasharray="6 4"
                className="pointer-events-none"
              />
            )}
            {rubber?.over && (
              <circle
                cx={xy(rubber.over).x}
                cy={xy(rubber.over).y}
                r={dotRadius(graph.nodes.find((n) => n.id === rubber.over)!) + 7}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2.5}
                className="pointer-events-none"
              />
            )}
            {picked?.note && onLink && !rubber && (
              <g
                data-handle
                aria-label="Drag to link"
                transform={`translate(${xy(picked.id).x + (dotRadius(picked) + 12) * 0.75},${xy(picked.id).y - (dotRadius(picked) + 12) * 0.75})`}
                className="cursor-crosshair"
              >
                <circle r={18 / Math.max(k, 0.8)} fill="transparent" />
                <circle r={10} fill="#fffff8" stroke="var(--accent)" strokeWidth={1.8} />
                <path d="M-4.5 0H4.5M0 -4.5V4.5" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" />
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
