"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Maximize } from "lucide-react";
import { buildGraph, clusters, colourOf, layout, neighboursOf, themes, UNTAGGED, type Positions } from "@/lib/map";
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

  const [theme, setTheme] = useState<string | null>(null);
  const tagList = useMemo(() => themes(notes), [notes]);
  const colours = useMemo(() => new Map(tagList.map((t) => [t.tag, t.colour])), [tagList]);

  // Soft areas behind the dots: the picked theme, or else each separate group of linked notes
  const halos = useMemo(() => {
    if (theme) {
      const ids = graph.nodes.filter((n) => n.note?.tags.includes(theme)).map((n) => n.id);
      return ids.length ? [{ key: `t:${theme}`, colour: colours.get(theme) ?? UNTAGGED, ids }] : [];
    }
    const groups = clusters(graph).filter((g) => g.length >= 3);
    if (groups.length < 2) return [];
    return groups.map((ids) => {
      const tally = new Map<string, number>();
      for (const id of ids) {
        const c = colourOf(graph.nodes.find((n) => n.id === id)!, colours);
        tally.set(c, (tally.get(c) ?? 0) + 1);
      }
      const colour = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { key: ids[0], colour, ids };
    });
  }, [graph, theme, colours]);

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

      {tagList.length > 0 && (
        <div className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] min-[731px]:mx-0 min-[731px]:px-0" role="group" aria-label="Themes">
          {[{ tag: null, count: notes.length, colour: UNTAGGED }, ...tagList].map((t) => {
            const on = theme === t.tag;
            return (
              <button
                key={t.tag ?? "all"}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setSelected(null);
                  setTheme(t.tag);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[1.1rem] whitespace-nowrap ${
                  on ? "border-[#111] bg-[#111] text-[#fffff8]" : "border-[#111]/30"
                }`}
              >
                {t.tag && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.colour }} />}
                {t.tag ? `#${t.tag}` : "All"}
                <span className={`font-mono text-[10px] ${on ? "text-[#fffff8]/70" : "text-[#888]"}`}>{t.count}</span>
              </button>
            );
          })}
        </div>
      )}

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
              colours={colours}
              theme={theme}
              halos={halos}
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
