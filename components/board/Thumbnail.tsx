"use client";

import { boardBounds, endPoint, PAINT, STICKY, type Shape } from "@/lib/board";
import { inkPath } from "./Lines";

/** A small picture of a canvas: boxes, stickies, text, ink and arrows, drawn to fit */
export default function Thumbnail({ shapes, className = "" }: { shapes: Shape[]; className?: string }) {
  const b = boardBounds(shapes);
  if (!b) return <div className={`bd-thumb bd-thumb-empty ${className}`} aria-hidden />;
  const pad = Math.max(b.w, b.h) * 0.08 + 20;
  const vb = `${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`;
  return (
    <svg className={`bd-thumb ${className}`} viewBox={vb} preserveAspectRatio="xMidYMid meet" aria-hidden>
      {shapes.map((s) => {
        if (s.type === "arrow") {
          const a = endPoint(s.from, s.to, shapes);
          const z = endPoint(s.to, s.from, shapes);
          return <line key={s.id} x1={a.x} y1={a.y} x2={z.x} y2={z.y} stroke="#111" strokeWidth={2.5} />;
        }
        if (s.type === "ink") return <path key={s.id} d={inkPath(s.points, s.size, !!s.pen)} fill={s.colour} />;
        if (s.type === "box") {
          const p = PAINT[s.colour];
          return (
            <g key={s.id}>
              <rect x={s.x} y={s.y + 6} width={s.w} height={s.h} rx={7} fill={p.side} stroke={p.edge} strokeWidth={2} />
              <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={7} fill={p.fill} stroke={p.edge} strokeWidth={2} />
              <Words text={s.text} x={s.x + s.w / 2} y={s.y + s.h / 2} w={s.w} fill={p.text} middle />
            </g>
          );
        }
        if (s.type === "sticky")
          return (
            <g key={s.id}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={3} fill={STICKY[s.colour]} />
              <Words text={s.text} x={s.x + 12} y={s.y + 26} w={s.w - 20} fill="#1d1b12" />
            </g>
          );
        // text: a few grey lines where the words are
        const lines = Math.max(1, Math.round(s.h / 26));
        return (
          <g key={s.id}>
            {Array.from({ length: lines }, (_, i) => (
              <rect key={i} x={s.x} y={s.y + 6 + i * 26} width={s.w * (i === lines - 1 ? 0.6 : 0.95)} height={9} rx={4} fill="#c9c6b8" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** The first few words of a shape, sized to stay readable when the picture is small */
function Words({ text, x, y, w, fill, middle = false }: { text: string; x: number; y: number; w: number; fill: string; middle?: boolean }) {
  const t = text.trim().split("\n")[0];
  if (!t) return null;
  const size = 22;
  const fit = Math.max(4, Math.floor(w / (size * 0.5)));
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={fill}
      textAnchor={middle ? "middle" : "start"}
      dominantBaseline={middle ? "central" : "auto"}
      className="font-serif"
    >
      {t.length > fit ? `${t.slice(0, fit - 1)}…` : t}
    </text>
  );
}
