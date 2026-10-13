"use client";

import { useState } from "react";
import { X } from "lucide-react";

/** Link a box to one of your notes (or a new one) */
export default function NotePicker({
  titles,
  current,
  onPick,
  onUnlink,
  onClose,
}: {
  titles: string[];
  current?: string;
  onPick: (title: string) => void;
  onUnlink: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = (query ? titles.filter((t) => t.toLowerCase().includes(query)) : titles).slice(0, 30);
  const exact = titles.some((t) => t.toLowerCase() === query);

  return (
    <div role="dialog" aria-label="Link a note" className="bd-sheet" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 border-b border-[#666]/20 px-4 pt-3 pb-2">
        <p className="flex-1 text-[1.5rem] leading-tight">Link a note</p>
        <button type="button" aria-label="Close" onClick={onClose} className="-mr-1 p-1 text-[#777]">
          <X size={20} />
        </button>
      </div>
      {current && (
        <p className="flex items-center gap-2 px-4 pt-2 text-[1.15rem]">
          <span className="min-w-0 flex-1 truncate">
            Linked to <span className="italic">{current}</span>
          </span>
          <button type="button" onClick={onUnlink} className="font-mono text-[11px] text-[#8b0000] underline">
            unlink
          </button>
        </p>
      )}
      <div className="px-4 pt-2">
        <input
          autoFocus
          aria-label="Search notes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your notes, or name a new one"
          className="w-full rounded-lg border-[1.5px] border-[#111]/40 bg-transparent px-3 py-1.5 font-serif text-[1.3rem] outline-none focus:border-[#111]"
        />
      </div>
      <div className="overflow-y-auto overscroll-contain px-4 pt-1 pb-3">
        {query && !exact && (
          <button type="button" onClick={() => onPick(q.trim())} className="flex w-full items-baseline gap-2 border-b border-[#666]/15 py-2 text-left text-[1.25rem]">
            <span className="min-w-0 flex-1">＋ New note “{q.trim()}”</span>
          </button>
        )}
        {list.map((t) => (
          <button key={t} type="button" onClick={() => onPick(t)} className="flex w-full items-baseline gap-2 border-b border-[#666]/15 py-2 text-left text-[1.25rem]">
            <span className="min-w-0 flex-1 truncate">{t}</span>
          </button>
        ))}
        {!list.length && !query && <p className="mt-2 text-[1.1rem] text-[#999] italic">No notes yet. Type a name to make one.</p>}
      </div>
    </div>
  );
}
