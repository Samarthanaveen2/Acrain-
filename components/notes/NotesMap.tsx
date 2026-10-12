"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Maximize } from "lucide-react";
import { buildGraph, layout, neighboursOf, type Positions } from "@/lib/map";
import type { Note } from "@/lib/notes";
import MapCanvas, { type MapHandle } from "./map/MapCanvas";
import PeekCard from "./map/PeekCard";

/** The Map screen: every note is a dot, links are lines. Pinch, drag, tap to explore. */
export default function NotesMap({
  notes,
  positions,
  onSavePositions,
}: {
  notes: Note[];
  positions: Positions | null;
  onSavePositions: (p: Positions) => void;
}) {
  const graph = useMemo(() => layout(buildGraph(notes), positions ?? {}), [notes, positions]);
  const [selected, setSelected] = useState<string | null>(null);
  const canvas = useRef<MapHandle>(null);
  const card = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(0);

  const node = graph.nodes.find((n) => n.id === selected);
  const near = neighboursOf(graph, selected);
  const neighbours = graph.nodes.filter((n) => near.has(n.id)).sort((a, b) => Number(!!b.note) - Number(!!a.note) || b.degree - a.degree);

  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return setCardH(0);
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight + 8));
    ro.observe(el);
    return () => ro.disconnect();
  }, [selected]);

  // Dragging a dot freezes the whole map where it is, so nothing else jumps around
  const move = (id: string, x: number, y: number) => {
    const all: Positions = Object.fromEntries(graph.nodes.map((n) => [n.id, [n.x, n.y] as [number, number]]));
    all[id] = [x, y];
    onSavePositions(all);
  };

  const hop = (id: string) => setSelected(id);

  return (
    <div className="map-screen mx-auto flex max-w-[1166px] flex-col px-4 min-[731px]:px-8">
      <header className="flex items-end justify-between gap-3 pt-2 pb-3">
        <div>
          <h1 className="text-[2.6rem] leading-none">Map</h1>
          <p className="mt-1 font-mono text-[11px] text-[#777]">
            {notes.length} {notes.length === 1 ? "note" : "notes"} · {graph.edges.length} {graph.edges.length === 1 ? "link" : "links"}
          </p>
        </div>
        {notes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              canvas.current?.fit();
            }}
            className="flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111] px-2.5 py-1 text-[1.15rem]"
          >
            <Maximize size={15} /> Fit
          </button>
        )}
      </header>

      {notes.length === 0 ? (
        <p className="mt-6 font-mono text-[13px] text-[#777]">Write a few notes and link them to see the map.</p>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border-[1.5px] border-[#c9c9bf] bg-[#fffff8]">
          {positions && (
            <MapCanvas
              ref={canvas}
              graph={graph}
              selected={selected}
              onSelect={setSelected}
              onMove={move}
              bottomInset={cardH}
            />
          )}
          {node && (
            <PeekCard ref={card} node={node} notes={notes} neighbours={neighbours} onHop={hop} onClose={() => setSelected(null)} />
          )}
          {!node && (
            <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[10.5px] text-[#999]">
              Tap a dot · drag to move · pinch to zoom
            </p>
          )}
        </div>
      )}
    </div>
  );
}
