"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, X } from "lucide-react";
import { findNote, type Note } from "@/lib/notes";
import { subtree, THREAT_LABEL, type Layer, type Margin, type Stack, type Threat } from "@/lib/stacks";

/** Everything about one layer: how it works, and what you've noticed about it */
export default function LayerSheet({
  layer,
  stack,
  notes,
  onChange,
  onAddUnder,
  onDelete,
  onClose,
}: {
  layer: Layer;
  stack: Stack;
  notes: Note[];
  onChange: (patch: Partial<Layer>) => void;
  onAddUnder: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const isTop = !layer.parent;
  const kids = subtree(stack, layer.id).size - 1;
  const [confirm, setConfirm] = useState(false);
  const [noteQuery, setNoteQuery] = useState("");
  const linked = layer.note ? findNote(notes, layer.note) : undefined;
  const matches = noteQuery.trim()
    ? notes.filter((n) => n.title.toLowerCase().includes(noteQuery.trim().toLowerCase())).slice(0, 5)
    : [];

  const label = "mt-4 block font-mono text-[11px] tracking-wide text-[#777] uppercase";
  const input = "mt-1 w-full rounded-md border-[1.5px] border-[#111]/30 bg-transparent px-2.5 py-1.5 text-[1.3rem] outline-none focus:border-[#111]";
  const seg = (on: boolean) => `flex-1 px-2 py-1 text-[1.1rem] ${on ? "bg-[#111] text-[#fffff8]" : ""}`;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/25" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Layer: ${layer.name || "new layer"}`}
        onClick={(e) => e.stopPropagation()}
        className="sheet mx-auto max-h-[88dvh] w-full max-w-[700px] overflow-y-auto overscroll-contain rounded-t-2xl border-t-[1.5px] border-[#111] bg-[#fffff8] px-4 pt-3"
      >
        <div className="flex items-center gap-2">
          <p className="flex-1 font-mono text-[11px] text-[#777]">{isTop ? "Top of the stack" : "Layer"}</p>
          <button type="button" aria-label="Done" onClick={onClose} className="-mr-1 flex items-center gap-1 p-1 text-[1.15rem]">
            Done <X size={18} />
          </button>
        </div>

        <input
          autoFocus={!layer.name}
          aria-label="Layer name"
          value={layer.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="What is this layer?"
          className="mt-1 w-full border-b-[1.5px] border-[#111] bg-transparent py-1 text-[2rem] leading-tight outline-none"
        />

        <label className={label}>
          How it works
          <textarea
            value={layer.how ?? ""}
            onChange={(e) => onChange({ how: e.target.value })}
            rows={2}
            placeholder="In your own words"
            className={`${input} resize-none font-serif normal-case`}
          />
        </label>

        <label className={label}>
          Who&rsquo;s in it
          <input value={layer.players ?? ""} onChange={(e) => onChange({ players: e.target.value })} placeholder="Companies, people, countries" className={`${input} normal-case`} />
        </label>

        <p className={label}>How much money stays here</p>
        <div role="group" aria-label="Margin" className="mt-1 flex overflow-hidden rounded-md border-[1.5px] border-[#111]">
          {([undefined, "thin", "medium", "fat"] as (Margin | undefined)[]).map((m) => (
            <button key={m ?? "none"} type="button" aria-pressed={layer.margin === m} onClick={() => onChange({ margin: m })} className={seg(layer.margin === m)}>
              {m ?? "?"}
            </button>
          ))}
        </div>

        <label className="mt-4 flex items-start gap-3">
          <input type="checkbox" checked={!!layer.choke} onChange={(e) => onChange({ choke: e.target.checked })} className="mt-1 h-5 w-5 accent-[#8b0000]" />
          <span>
            <span className="block text-[1.3rem]">Chokepoint</span>
            <span className="block text-[1.05rem] text-[#777]">Only a few players. Whoever controls this has leverage over the whole stack.</span>
          </span>
        </label>

        <p className={label}>Could this get cheap? (AI, open source, copying)</p>
        <div role="group" aria-label="Threat" className="mt-1 flex overflow-hidden rounded-md border-[1.5px] border-[#111]">
          {([undefined, "safe", "at-risk", "being-eaten"] as (Threat | undefined)[]).map((t) => (
            <button key={t ?? "none"} type="button" aria-pressed={layer.threat === t} onClick={() => onChange({ threat: t })} className={seg(layer.threat === t)}>
              {t ? THREAT_LABEL[t] : "?"}
            </button>
          ))}
        </div>
        {layer.threat && layer.threat !== "safe" && (
          <input
            aria-label="Eaten by what"
            value={layer.threatBy ?? ""}
            onChange={(e) => onChange({ threatBy: e.target.value })}
            placeholder="By what?"
            className={input}
          />
        )}

        <label className="mt-4 flex items-start gap-3">
          <input type="checkbox" checked={!!layer.plugIn} onChange={(e) => onChange({ plugIn: e.target.checked })} className="mt-1 h-5 w-5 accent-[#31566f]" />
          <span>
            <span className="block text-[1.3rem]">I could enter here</span>
            <span className="block text-[1.05rem] text-[#777]">A layer where you could build, work or invest.</span>
          </span>
        </label>
        {layer.plugIn && (
          <input
            aria-label="What it would take"
            value={layer.plugHow ?? ""}
            onChange={(e) => onChange({ plugHow: e.target.value })}
            placeholder="What would it take?"
            className={input}
          />
        )}

        <p className={label}>Note</p>
        {layer.note ? (
          <div className="mt-1 flex items-center gap-2">
            <Link
              href={linked ? `/notes/${linked.id}` : `/new-note?title=${encodeURIComponent(layer.note)}`}
              className="min-w-0 flex-1 truncate rounded-md bg-[#111] px-3 py-1.5 text-[1.2rem] text-[#fffff8] no-underline"
            >
              {linked ? `Open “${linked.title}”` : `Write “${layer.note}”`}
            </Link>
            <button type="button" onClick={() => onChange({ note: undefined })} className="font-mono text-[11px] text-[#777] underline">
              unlink
            </button>
          </div>
        ) : (
          <div>
            <input
              aria-label="Link a note"
              value={noteQuery}
              onChange={(e) => setNoteQuery(e.target.value)}
              placeholder="Link a note for deeper thinking"
              className={input}
            />
            {noteQuery.trim() && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {matches.map((n) => (
                  <button key={n.id} type="button" onClick={() => onChange({ note: n.title })} className="rounded-full border border-[#111]/50 px-2.5 py-0.5 text-[1.1rem]">
                    {n.title}
                  </button>
                ))}
                {!matches.some((n) => n.title.toLowerCase() === noteQuery.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => onChange({ note: noteQuery.trim() })}
                    className="rounded-full border border-dashed border-[#111]/50 px-2.5 py-0.5 text-[1.1rem] text-[#555]"
                  >
                    ＋ new note “{noteQuery.trim()}”
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2 border-t border-[#666]/20 pt-3 pb-[calc(1rem+var(--safe-bottom))]">
          <button
            type="button"
            onClick={onAddUnder}
            disabled={!layer.name.trim()}
            className="flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111] px-3 py-1.5 text-[1.2rem] disabled:opacity-40"
          >
            <Plus size={16} /> Add a layer under
          </button>
          <span className="flex-1" />
          {confirm ? (
            <button type="button" onClick={onDelete} className="rounded-md bg-[#8b0000] px-3 py-1.5 text-[1.15rem] text-[#fffff8]">
              {isTop ? "Delete the whole stack" : kids ? `Delete with ${kids} under it` : "Delete"}
            </button>
          ) : (
            <button
              type="button"
              aria-label={isTop ? "Delete stack" : "Delete layer"}
              onClick={() => (isTop || kids || layer.name ? setConfirm(true) : onDelete())}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[1.15rem] text-[#8b0000]"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
