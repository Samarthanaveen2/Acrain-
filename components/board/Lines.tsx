"use client";

import { memo, useEffect, useRef } from "react";
import { getStroke } from "perfect-freehand";
import { endPoint, type ArrowShape, type InkShape, type Rect, type Shape } from "@/lib/board";

/** Smooth ink from the points you drew */
export function inkPath(points: [number, number, number][], size: number, pen: boolean) {
  const outline = getStroke(points, { size, thinning: 0.55, smoothing: 0.5, streamline: 0.45, simulatePressure: !pen, last: true });
  if (!outline.length) return "";
  const d = outline.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0.toFixed(1), y0.toFixed(1), ((x0 + x1) / 2).toFixed(1), ((y0 + y1) / 2).toFixed(1));
      return acc;
    },
    ["M", ...outline[0].map((n) => n.toFixed(1)), "Q"],
  );
  return d.join(" ") + " Z";
}

const Ink = memo(function Ink({ s, on }: { s: InkShape; on: boolean }) {
  const d = inkPath(s.points, s.size, !!s.pen);
  return <path data-shape={s.id} d={d} fill={on ? "#31566f" : s.colour} className="bd-ink" />;
});

function Arrow({ s, all, on, k }: { s: ArrowShape; all: Shape[]; on: boolean; k: number }) {
  const a = endPoint(s.from, s.to, all);
  const b = endPoint(s.to, s.from, all);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const head = 11;
  const p1 = { x: b.x - head * Math.cos(ang - 0.42), y: b.y - head * Math.sin(ang - 0.42) };
  const p2 = { x: b.x - head * Math.cos(ang + 0.42), y: b.y - head * Math.sin(ang + 0.42) };
  const colour = on ? "#31566f" : "#111";
  return (
    <g>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colour} strokeWidth={1.8} strokeLinecap="round" />
      <polygon points={`${b.x},${b.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={colour} />
      {/* a wide invisible line, so a finger can pick the arrow */}
      <line data-shape={s.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={Math.max(18, 26 / k)} className="bd-hit" />
    </g>
  );
}

/** Where the lines layer needs to be: around every arrow and stroke, plus some room */
function area(mine: Shape[], all: Shape[], extra: Rect | null): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (x: number, y: number) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const s of mine) {
    if (s.type === "ink") s.points.forEach((p) => add(p[0], p[1]));
    if (s.type === "arrow") {
      const a = endPoint(s.from, s.to, all);
      const b = endPoint(s.to, s.from, all);
      add(a.x, a.y);
      add(b.x, b.y);
    }
  }
  if (extra) {
    add(extra.x, extra.y);
    add(extra.x + extra.w, extra.y + extra.h);
  }
  if (x0 === Infinity) return { x: 0, y: 0, w: 1, h: 1 };
  const pad = 60;
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

/** Arrows (under the boxes) or ink (over them), as SVG sized to just what's drawn */
export function LinesLayer({ shapes, layer, selected, k, draft }: { shapes: Shape[]; layer: "arrows" | "ink"; selected: string | null; k: number; draft?: Rect | null }) {
  const mine = shapes.filter((s) => (layer === "ink" ? s.type === "ink" : s.type === "arrow"));
  if (!mine.length) return null;
  const r = area(mine, shapes, draft ?? null);
  return (
    <svg className="bd-lines" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} viewBox={`${r.x} ${r.y} ${r.w} ${r.h}`}>
      {mine.map((s) =>
        s.type === "ink" ? (
          <Ink key={s.id} s={s} on={selected === s.id} />
        ) : s.type === "arrow" ? (
          <Arrow key={s.id} s={s} all={shapes} on={selected === s.id} k={k} />
        ) : null,
      )}
    </svg>
  );
}

/** Words on arrows, and the box to type them in */
export function ArrowLabels({
  shapes,
  editing,
  onText,
  onEditEnd,
}: {
  shapes: Shape[];
  editing: string | null;
  onText: (id: string, text: string) => void;
  onEditEnd: () => void;
}) {
  return (
    <>
      {shapes.map((s) => {
        if (s.type !== "arrow" || (!s.label && editing !== s.id)) return null;
        const a = endPoint(s.from, s.to, shapes);
        const b = endPoint(s.to, s.from, shapes);
        const style = { left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 };
        return editing === s.id ? (
          <LabelEdit key={s.id} id={s.id} value={s.label ?? ""} style={style} onText={onText} onEditEnd={onEditEnd} />
        ) : (
          <span key={s.id} data-shape={s.id} className="bd-label" style={style}>
            {s.label}
          </span>
        );
      })}
    </>
  );
}

function LabelEdit({
  id,
  value,
  style,
  onText,
  onEditEnd,
}: {
  id: string;
  value: string;
  style: React.CSSProperties;
  onText: (id: string, t: string) => void;
  onEditEnd: () => void;
}) {
  const el = useRef<HTMLInputElement>(null);
  useEffect(() => el.current?.focus({ preventScroll: true }), []);
  return (
    <input
      ref={el}
      aria-label="Arrow label"
      value={value}
      placeholder="label"
      onChange={(e) => onText(id, e.target.value)}
      onBlur={onEditEnd}
      onKeyDown={(e) => e.key === "Enter" && el.current?.blur()}
      onPointerDown={(e) => e.stopPropagation()}
      className="bd-label bd-label-edit"
      style={{ ...style, width: `${Math.max(5, value.length + 1)}ch` }}
    />
  );
}

/** The ink you're drawing right now, and the arrow you're pulling */
export function Draft({ ink, arrow }: { ink: { points: [number, number, number][]; colour: string; size: number; pen: boolean } | null; arrow: { a: { x: number; y: number }; b: { x: number; y: number } } | null }) {
  if (!ink && !arrow) return null;
  const pts = ink?.points ?? [];
  const xs = [...pts.map((p) => p[0]), ...(arrow ? [arrow.a.x, arrow.b.x] : [])];
  const ys = [...pts.map((p) => p[1]), ...(arrow ? [arrow.a.y, arrow.b.y] : [])];
  const pad = 40;
  const r = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
  return (
    <svg className="bd-lines pointer-events-none" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} viewBox={`${r.x} ${r.y} ${r.w} ${r.h}`}>
      {ink && <path d={inkPath(ink.points, ink.size, ink.pen)} fill={ink.colour} />}
      {arrow && <line x1={arrow.a.x} y1={arrow.a.y} x2={arrow.b.x} y2={arrow.b.y} stroke="#31566f" strokeWidth={2} strokeDasharray="6 5" strokeLinecap="round" />}
    </svg>
  );
}
