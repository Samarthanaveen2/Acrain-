"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { MapNode } from "@/lib/map";

/** Pick a note to link to: a searchable list, newest-connected first */
export default function LinkPicker({
  from,
  nodes,
  linked,
  onPick,
  onClose,
}: {
  from: MapNode;
  nodes: MapNode[];
  /** Ids already linked with `from` */
  linked: Set<string>;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = nodes
    .filter((n) => n.id !== from.id && !linked.has(n.id) && (!query || n.title.toLowerCase().includes(query)))
    .sort((a, b) => Number(!!b.note) - Number(!!a.note) || b.degree - a.degree || a.title.localeCompare(b.title));

  return (
    <div
      role="dialog"
      aria-label={`Link ${from.title} to…`}
      className="absolute inset-x-2 bottom-2 z-20 flex max-h-[78%] flex-col rounded-xl border-[1.5px] border-[#111] bg-[#fffff8] shadow-[0_6px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="flex items-center gap-2 border-b border-[#666]/20 px-4 pt-3 pb-2">
        <p className="min-w-0 flex-1 truncate text-[1.5rem] leading-tight">
          Link <span className="italic">{from.title}</span> to…
        </p>
        <button type="button" aria-label="Close" onClick={onClose} className="-mr-1 p-1 text-[#777]">
          <X size={20} />
        </button>
      </div>
      <div className="px-4 pt-2">
        <input
          autoFocus
          aria-label="Search notes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your notes"
          className="w-full rounded-md border-[1.5px] border-[#111]/40 bg-transparent px-2.5 py-1 text-[1.25rem] outline-none focus:border-[#111]"
        />
      </div>
      <div className="overflow-y-auto overscroll-contain px-4 pt-1 pb-3">
        {list.length === 0 && <p className="mt-2 text-[1.1rem] text-[#999] italic">No other notes match.</p>}
        {list.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onPick(n.id)}
            className="flex w-full items-baseline gap-2 border-b border-[#666]/15 py-2 text-left text-[1.25rem]"
          >
            <span className={`min-w-0 flex-1 ${n.note ? "" : "text-[#777] italic"}`}>{n.title}</span>
            <span className="font-mono text-[10.5px] text-[#888]">{n.note ? `${n.degree} links` : "not written"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
