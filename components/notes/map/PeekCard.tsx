"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { Link2, X } from "lucide-react";
import { backlinks, docText, noteLinks, type Note } from "@/lib/notes";
import type { MapNode } from "@/lib/map";

/** A quick look at the selected dot: first lines, tags, and its neighbours to hop to */
const PeekCard = forwardRef<
  HTMLDivElement,
  {
    node: MapNode;
    notes: Note[];
    neighbours: MapNode[];
    onHop: (id: string) => void;
    onClose: () => void;
    /** Opens the "Link to…" list */
    onLinkTo?: () => void;
  }
>(function PeekCard({ node, notes, neighbours, onHop, onClose, onLinkTo }, ref) {
  const note = node.note;
  const text = note ? (note.doc ? docText(note.doc) : note.body).replace(/\s+/g, " ").trim() : "";
  const out = note ? noteLinks(note).length : 0;
  const back = note
    ? backlinks(notes, note).length
    : notes.filter((n) => noteLinks(n).some((t) => t.toLowerCase() === node.title.toLowerCase())).length;

  return (
    <div
      ref={ref}
      className="peek-card absolute inset-x-2 bottom-2 z-10 rounded-xl border-[1.5px] border-[#111] bg-[#fffff8] px-4 pt-3 pb-3 shadow-[0_6px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[1.75rem] leading-[1.1]">{node.title}</p>
        <button type="button" aria-label="Close" onClick={onClose} className="-mt-0.5 -mr-1 p-1 text-[#777]">
          <X size={20} />
        </button>
      </div>
      <p className="mt-1 font-mono text-[11px] text-[#777]">
        {note ? (
          <>
            {out} {out === 1 ? "link" : "links"} · {back} {back === 1 ? "backlink" : "backlinks"}
            {note.tags.length > 0 && <span className="text-[var(--accent)]"> · {note.tags.map((t) => `#${t}`).join(" ")}</span>}
          </>
        ) : (
          <>
            Not written yet · {back} {back === 1 ? "note points" : "notes point"} here
          </>
        )}
      </p>
      {text && <p className="mt-1.5 line-clamp-2 text-[1.2rem] leading-snug text-[#444]">{text}</p>}

      {neighbours.length > 0 && (
        <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          {neighbours.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onHop(n.id)}
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[1.1rem] whitespace-nowrap ${
                n.note ? "border-[#111]/60" : "border-dashed border-[#8a8a80] text-[#777]"
              }`}
            >
              {n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {note && onLinkTo && (
          <button
            type="button"
            onClick={onLinkTo}
            className="flex shrink-0 items-center gap-1.5 rounded-md border-[1.5px] border-[#111] px-3 py-1.5 text-[1.2rem]"
          >
            <Link2 size={15} /> Link to…
          </button>
        )}
        <Link
          href={note ? `/notes/${note.id}` : `/new-note?title=${encodeURIComponent(node.title)}`}
          className="block flex-1 rounded-md bg-[#111] py-1.5 text-center text-[1.25rem] text-[#fffff8] no-underline"
        >
          {note ? "Open note" : "Write this note"}
        </Link>
      </div>
    </div>
  );
});

export default PeekCard;
