"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { findNote, noteLinks, slugify, type Note } from "@/lib/notes";

type MapNode = { id: string; title: string; note?: Note; x: number; y: number; vx: number; vy: number; degree: number };

/** A small force layout: linked notes pull together, every note pushes others away */
function layout(notes: Note[]) {
  const nodes = new Map<string, MapNode>();
  const add = (id: string, title: string, note?: Note) => {
    if (!nodes.has(id)) {
      const a = nodes.size * 2.399963; // golden-angle spiral start, so the layout is the same every time
      const r = 40 * Math.sqrt(nodes.size + 1);
      nodes.set(id, { id, title, note, x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0, degree: 0 });
    }
    return nodes.get(id)!;
  };
  notes.forEach((n) => add(n.id, n.title, n));
  const edges: [MapNode, MapNode][] = [];
  for (const n of notes) {
    for (const t of noteLinks(n)) {
      const hit = findNote(notes, t);
      const target = hit ? nodes.get(hit.id)! : add(`missing:${slugify(t)}`, t);
      const source = nodes.get(n.id)!;
      if (target === source || edges.some(([a, b]) => (a === source && b === target) || (a === target && b === source))) continue;
      edges.push([source, target]);
      source.degree++;
      target.degree++;
    }
  }
  const list = [...nodes.values()];
  for (let step = 0; step < 300; step++) {
    const heat = 1 - step / 300;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y || 0.01;
        const d2 = dx * dx + dy * dy;
        const f = 2400 / d2;
        a.vx -= dx * f * 0.01;
        a.vy -= dy * f * 0.01;
        b.vx += dx * f * 0.01;
        b.vy += dy * f * 0.01;
      }
    }
    for (const [a, b] of edges) {
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
      n.vx -= n.x * 0.004; // gentle pull to the middle
      n.vy -= n.y * 0.004;
      n.x += n.vx * heat;
      n.y += n.vy * heat;
      n.vx *= 0.6;
      n.vy *= 0.6;
    }
  }
  return { nodes: list, edges };
}

export default function NotesMap({ notes }: { notes: Note[] }) {
  const { nodes, edges } = useMemo(() => layout(notes), [notes]);
  const [picked, setPicked] = useState<string | null>(null);

  const pad = 70;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(0, ...xs) - pad;
  const minY = Math.min(0, ...ys) - pad;
  const w = Math.max(...xs, 0) - minX + pad;
  const h = Math.max(...ys, 0) - minY + pad;
  const sel = nodes.find((n) => n.id === picked);
  const neighbours = new Set(
    edges.flatMap(([a, b]) => (a.id === picked ? [b.id] : b.id === picked ? [a.id] : [])),
  );
  const r = (n: MapNode) => 5 + Math.min(8, n.degree * 1.6);

  return (
    <div className="mx-auto max-w-[1166px] px-4 pb-24 min-[731px]:px-8">
      <SiteHeader title="Map" />
      <p className="max-w-[700px] text-[1.25rem] text-[#555]">
        Every note is a dot. Lines are the links between them. Faded dots are ideas you&rsquo;ve linked to but haven&rsquo;t
        written yet. Tap a dot.
      </p>

      {notes.length === 0 ? (
        <p className="mt-8 font-mono text-[13px] text-[#777]">Write a few notes and link them to see the map.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border-[1.5px] border-[#c9c9bf]">
          <svg
            viewBox={`${minX} ${minY} ${w} ${h}`}
            className="block h-auto max-h-[70vh] w-full touch-manipulation"
            role="img"
            aria-label="Map of notes and their links"
            onClick={() => setPicked(null)}
          >
            {edges.map(([a, b], i) => {
              const lit = picked && (a.id === picked || b.id === picked);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={lit ? "var(--accent)" : "#b9b9ae"}
                  strokeWidth={lit ? 2.2 : 1.2}
                  strokeDasharray={a.note && b.note ? undefined : "4 3"}
                />
              );
            })}
            {nodes.map((n) => {
              const dim = picked && n.id !== picked && !neighbours.has(n.id);
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  opacity={dim ? 0.25 : 1}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPicked(n.id === picked ? null : n.id);
                  }}
                >
                  <circle r={18} fill="transparent" />
                  <circle
                    r={r(n)}
                    fill={n.note ? (n.id === picked ? "var(--accent)" : "#111") : "#fffff8"}
                    stroke={n.note ? "none" : "#8a8a80"}
                    strokeDasharray={n.note ? undefined : "3 2"}
                    strokeWidth={1.5}
                  />
                  <text
                    y={r(n) + 13}
                    textAnchor="middle"
                    fontSize={12}
                    fill={n.note ? "#111" : "#8a8a80"}
                    stroke="#fffff8"
                    strokeWidth={3}
                    paintOrder="stroke"
                    className="font-serif"
                  >
                    {n.title.length > 26 ? `${n.title.slice(0, 25)}…` : n.title}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {sel && (
        <div className="mt-4 max-w-[700px] rounded-lg border-[1.5px] border-[#111] px-4 py-3">
          <p className="text-[1.6rem] leading-tight">{sel.title}</p>
          <p className="mt-1 font-mono text-[12px] text-[#777]">
            {sel.note ? `${sel.degree} ${sel.degree === 1 ? "connection" : "connections"}` : "Not written yet"}
          </p>
          {neighbours.size > 0 && (
            <p className="mt-2 text-[1.15rem] text-[#444]">
              Connected to {nodes.filter((n) => neighbours.has(n.id)).map((n) => n.title).join(", ")}
            </p>
          )}
          <Link
            href={sel.note ? `/notes/${sel.note.id}` : `/new-note?title=${encodeURIComponent(sel.title)}`}
            className="mt-3 inline-block rounded-md bg-[#111] px-3 py-1 text-[1.2rem] text-background no-underline"
          >
            {sel.note ? "Open note" : "Write this note"}
          </Link>
        </div>
      )}
    </div>
  );
}
