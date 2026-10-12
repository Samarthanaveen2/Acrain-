"use client";

import { useMemo } from "react";
import { Link2, X } from "lucide-react";
import { suggestPairs, type Graph } from "@/lib/map";

/** Loose ends: lonely notes, ideas you've linked to but not written, and pairs that might belong together */
export default function LooseEnds({
  graph,
  onFocus,
  onLink,
  onClose,
}: {
  graph: Graph;
  onFocus: (id: string) => void;
  onLink?: (a: string, b: string) => void;
  onClose: () => void;
}) {
  const alone = graph.nodes.filter((n) => n.note && n.degree === 0);
  const ghosts = graph.nodes.filter((n) => !n.note).sort((a, b) => b.degree - a.degree);
  const pairs = useMemo(() => suggestPairs(graph), [graph]);
  const title = (id: string) => graph.nodes.find((n) => n.id === id)?.title ?? id;

  const h = "mt-4 font-mono text-[11px] tracking-wide text-[#777] uppercase first:mt-0";
  const empty = "mt-1 text-[1.1rem] text-[#999] italic";
  const row = "flex w-full items-baseline gap-2 border-b border-[#666]/15 py-2 text-left text-[1.25rem]";

  return (
    <div
      role="dialog"
      aria-label="Loose ends"
      className="absolute inset-x-2 bottom-2 z-20 flex max-h-[78%] flex-col rounded-xl border-[1.5px] border-[#111] bg-[#fffff8] shadow-[0_6px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="flex items-center gap-2 border-b border-[#666]/20 px-4 pt-3 pb-2">
        <p className="flex-1 text-[1.75rem] leading-none">Loose ends</p>
        <button type="button" aria-label="Close" onClick={onClose} className="-mr-1 p-1 text-[#777]">
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto overscroll-contain px-4 pt-3 pb-4">
        <h3 className={h}>Maybe related</h3>
        {pairs.length === 0 && <p className={empty}>Nothing yet. This fills in as you write more.</p>}
        {pairs.map((p) => (
          <div key={`${p.a}|${p.b}`} className="flex items-center gap-2 border-b border-[#666]/15 py-2">
            <button type="button" onClick={() => onFocus(p.a)} className="min-w-0 flex-1 text-left">
              <span className="block text-[1.25rem] leading-snug">
                {title(p.a)} <span className="text-[#999]">↔</span> {title(p.b)}
              </span>
              {p.why && <span className="block font-mono text-[10.5px] text-[#888]">{p.why}</span>}
            </button>
            {onLink && (
              <button
                type="button"
                onClick={() => onLink(p.a, p.b)}
                className="flex shrink-0 items-center gap-1 rounded-md border-[1.5px] border-[#111] px-2 py-0.5 text-[1.05rem]"
              >
                <Link2 size={14} /> Link
              </button>
            )}
          </div>
        ))}

        <h3 className={h}>Not written yet</h3>
        {ghosts.length === 0 && <p className={empty}>Every idea you&rsquo;ve linked to has a note.</p>}
        {ghosts.map((n) => (
          <button key={n.id} type="button" className={row} onClick={() => onFocus(n.id)}>
            <span className="min-w-0 flex-1 text-[#555]">{n.title}</span>
            <span className="font-mono text-[10.5px] text-[#888]">
              {n.degree} {n.degree === 1 ? "note points" : "notes point"} here
            </span>
          </button>
        ))}

        <h3 className={h}>On their own</h3>
        {alone.length === 0 && <p className={empty}>Every note is linked to something.</p>}
        {alone.map((n) => (
          <button key={n.id} type="button" className={row} onClick={() => onFocus(n.id)}>
            <span className="min-w-0 flex-1">{n.title}</span>
            <span className="font-mono text-[10.5px] text-[#888]">no links</span>
          </button>
        ))}
      </div>
    </div>
  );
}
