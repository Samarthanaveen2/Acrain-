"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Maximize, Sparkles } from "lucide-react";
import { buildGraph, clusters, colourOf, layout, layout3d, neighboursOf, themes, UNTAGGED, type Positions, type Positions3 } from "@/lib/map";
import { findNote, noteLinks, type Note } from "@/lib/notes";
import Link from "next/link";
import MapCanvas, { type MapHandle } from "./map/MapCanvas";
import PeekCard from "./map/PeekCard";
import LooseEnds from "./map/LooseEnds";
import MapSpace from "./map/MapSpace";
import LinkPicker from "./map/LinkPicker";

const MODE_KEY = "acrain-map-mode";

/** The Map screen: every note is a dot, links are lines. Pinch, drag, tap to explore. */
export default function NotesMap({
  notes,
  positions,
  onSavePositions,
  positions3,
  onSavePositions3,
  onLink,
  onCreate,
  onOpen,
}: {
  notes: Note[];
  positions: Positions | null;
  onSavePositions: (p: Positions) => void;
  /** Where stars sit in the 3D map */
  positions3?: Positions3 | null;
  onSavePositions3?: (p: Positions3) => void;
  /** Adds a "See also" link from one note to a title; resolves to an undo */
  onLink?: (from: Note, toTitle: string) => Promise<() => Promise<void>>;
  /** Makes a note with this title (or finds it); resolves to its id */
  onCreate?: (title: string) => Promise<string>;
  /** Goes to another screen */
  onOpen?: (path: string) => void;
}) {
  const graph = useMemo(() => layout(buildGraph(notes), positions ?? {}), [notes, positions]);
  const [selected, setSelected] = useState<string | null>(null);

  // 2D or 3D, remembered on this phone; 3D unless the phone can't draw it
  const [mode, setModeState] = useState<"2d" | "3d">(() => {
    try {
      return localStorage.getItem(MODE_KEY) === "2d" ? "2d" : "3d";
    } catch {
      return "3d";
    }
  });
  const [noWebGL, setNoWebGL] = useState(false);
  const space = mode === "3d" && !noWebGL;
  const setMode = (m: "2d" | "3d") => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // private mode: just don't remember
    }
  };

  // The night sky: places for every star, kept once worked out so the sky never reshuffles
  const pos3 = useMemo(() => (positions3 ? layout3d(graph, positions3) : null), [graph, positions3]);
  useEffect(() => {
    if (pos3 && positions3 && onSavePositions3 && Object.keys(pos3).some((id) => !positions3[id])) onSavePositions3(pos3);
  }, [pos3, positions3, onSavePositions3]);
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

  const [loose, setLoose] = useState(false);
  // Which note the "Link to…" list is open for (closes by itself when you pick another)
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const picking = !!selected && pickingFor === selected;
  const looseCount = graph.nodes.filter((n) => !n.note || n.degree === 0).length;

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

  // A short message at the top of the map, sometimes with Undo or Write
  const [toast, setToast] = useState<{
    text: string;
    undo?: () => Promise<void>;
    href?: string;
  } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const link = async (fromId: string, toId: string) => {
    const from = notes.find((n) => n.id === fromId);
    const to = graph.nodes.find((n) => n.id === toId);
    if (!from || !to || !onLink) return;
    if (
      noteLinks(from).some((t) => t.toLowerCase() === to.title.toLowerCase()) ||
      (to.note && noteLinks(to.note).some((t) => findNote(notes, t)?.id === from.id))
    ) {
      setToast({ text: `Already linked to ${to.title}` });
      return;
    }
    try {
      const undo = await onLink(from, to.title);
      setToast({ text: `Linked ${from.title} → ${to.title}`, undo });
    } catch (e) {
      setToast({
        text: `Couldn't link (${(e as { message?: string })?.message ?? String(e)})`,
      });
    }
  };

  // Long-press on empty space: a new note right there
  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    title: string;
  } | null>(null);
  const create = async (write: boolean) => {
    if (!draft || !draft.title.trim() || !onCreate) return;
    const { x, y, title } = draft;
    setDraft(null);
    try {
      const id = await onCreate(title.trim());
      const all: Positions = Object.fromEntries(graph.nodes.map((n) => [n.id, [n.x, n.y] as [number, number]]));
      all[id] = [x, y];
      onSavePositions(all);
      if (write && onOpen) return onOpen(`/notes/${id}/edit`);
      setSelected(id);
      setToast({ text: `Added ${title.trim()}`, href: `/notes/${id}/edit` });
    } catch (e) {
      setToast({
        text: `Couldn't add the note (${(e as { message?: string })?.message ?? String(e)})`,
      });
    }
  };

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
          <div className="flex shrink-0 gap-1.5">
            <div role="group" aria-label="View" className="flex overflow-hidden rounded-md border-[1.5px] border-[#111] font-mono text-[11px]">
              {(["2d", "3d"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={(m === "3d") === space}
                  onClick={() => {
                    setSelected(null);
                    setDraft(null);
                    setMode(m);
                  }}
                  className={`px-2 py-1 ${(m === "3d") === space ? "bg-[#111] text-[#fffff8]" : ""}`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Loose ends"
              aria-pressed={loose}
              onClick={() => {
                setSelected(null);
                setDraft(null);
                setLoose((v) => !v);
              }}
              className={`flex items-center gap-1 rounded-md border-[1.5px] border-[#111] px-2 py-1 text-[1.15rem] ${loose ? "bg-[#111] text-[#fffff8]" : ""}`}
            >
              <Sparkles size={15} />
              {looseCount > 0 && (
                <span className={`font-mono text-[10px] ${loose ? "text-[#fffff8]/70" : "text-[#888]"}`}>{looseCount}</span>
              )}
            </button>
            <button
              type="button"
              aria-label="Fit"
              onClick={() => {
                setSelected(null);
                canvas.current?.fit();
              }}
              className="flex items-center rounded-md border-[1.5px] border-[#111] px-2 py-1"
            >
              <Maximize size={15} />
            </button>
          </div>
        )}
      </header>

      {tagList.length > 0 && (
        <div
          className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] min-[731px]:mx-0 min-[731px]:px-0"
          role="group"
          aria-label="Themes"
        >
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
        <div
          className={`relative min-h-0 flex-1 overflow-hidden ${
            space ? "-mx-2 rounded-xl bg-[#05070d] min-[731px]:mx-0" : "rounded-lg border-[1.5px] border-[#c9c9bf] bg-[#fffff8]"
          }`}
        >
          {space && pos3 && (
            <MapSpace
              ref={canvas}
              graph={graph}
              positions={pos3}
              selected={selected}
              onSelect={setSelected}
              colours={colours}
              theme={theme}
              halos={halos}
              bottomInset={cardH}
              onUnavailable={() => setNoWebGL(true)}
            />
          )}
          {!space && positions && (
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
              onLink={onLink ? link : undefined}
              onLongPress={
                onCreate
                  ? (x, y) => {
                      setLoose(false);
                      setDraft({ x, y, title: "" });
                    }
                  : undefined
              }
            />
          )}
          {loose && (
            <LooseEnds
              graph={graph}
              onFocus={(id) => {
                setLoose(false);
                setSelected(id);
              }}
              onLink={onLink ? link : undefined}
              onClose={() => setLoose(false)}
            />
          )}
          {node && !loose && !picking && (
            <PeekCard
              ref={card}
              node={node}
              notes={notes}
              neighbours={neighbours}
              onHop={hop}
              onClose={() => setSelected(null)}
              onLinkTo={onLink ? () => setPickingFor(selected) : undefined}
            />
          )}
          {node && picking && (
            <LinkPicker
              from={node}
              nodes={graph.nodes}
              linked={near}
              onPick={(id) => {
                setPickingFor(null);
                link(node.id, id);
              }}
              onClose={() => setPickingFor(null)}
            />
          )}
          {!node && !draft && !loose && !picking && (
            <p
              className={`pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[10.5px] ${space ? "text-[#8d93a6]" : "text-[#999]"}`}
            >
              {space ? "Drag to spin · pinch to zoom · tap a star" : "Tap a dot · hold empty space to add · pinch to zoom"}
            </p>
          )}
          {noWebGL && mode === "3d" && !toast && (
            <p className="pointer-events-none absolute inset-x-0 top-2 text-center font-mono text-[10.5px] text-[#999]">
              3D isn&rsquo;t available on this device, so here&rsquo;s the flat map
            </p>
          )}
          {node?.note && !toast && !space && (
            <p className="pointer-events-none absolute inset-x-0 top-2 text-center font-mono text-[10.5px] text-[#999]">
              Drag the ＋ onto another dot to link them
            </p>
          )}
          {toast && (
            <div
              role="status"
              className="absolute inset-x-2 top-2 z-20 flex items-center gap-3 rounded-lg bg-[#111] px-3 py-2 text-[1.15rem] text-[#fffff8]"
            >
              <span className="min-w-0 flex-1 truncate">{toast.text}</span>
              {toast.undo && (
                <button
                  type="button"
                  className="font-mono text-[12px] tracking-wide uppercase underline"
                  onClick={async () => {
                    const undo = toast.undo!;
                    setToast(null);
                    await undo();
                  }}
                >
                  Undo
                </button>
              )}
              {toast.href && (
                <Link href={toast.href} className="font-mono text-[12px] tracking-wide text-[#fffff8] uppercase underline">
                  Write
                </Link>
              )}
            </div>
          )}
          {draft && (
            <form
              className="absolute inset-x-2 bottom-2 z-20 rounded-xl border-[1.5px] border-[#111] bg-[#fffff8] px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.12)]"
              onSubmit={(e) => {
                e.preventDefault();
                create(false);
              }}
            >
              <p className="font-mono text-[11px] text-[#777]">New note here</p>
              <input
                autoFocus
                aria-label="New note title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="What's the idea?"
                className="mt-1 w-full border-b-[1.5px] border-[#111] bg-transparent py-1 text-[1.6rem] outline-none"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded-md border-[1.5px] border-[#111]/40 px-3 py-1 text-[1.15rem]"
                >
                  Cancel
                </button>
                <span className="flex-1" />
                <button
                  type="submit"
                  disabled={!draft.title.trim()}
                  className="rounded-md border-[1.5px] border-[#111] px-3 py-1 text-[1.15rem] disabled:opacity-40"
                >
                  Add to map
                </button>
                <button
                  type="button"
                  disabled={!draft.title.trim()}
                  onClick={() => create(true)}
                  className="rounded-md bg-[#111] px-3 py-1 text-[1.15rem] text-[#fffff8] disabled:opacity-40"
                >
                  Write now
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
