"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, Columns2, DoorOpen, Flame, LogIn, MapPin, NotebookPen, PenLine, ShieldCheck, Trash2, TriangleAlert, Users, X } from "lucide-react";
import { findNote, type Note } from "@/lib/notes";
import { pathTo, subtree, THREAT_COLOUR, THREAT_LABEL, type Layer, type Margin, type Stack, type Threat } from "@/lib/stacks";

const MONEY_LABEL: Record<Margin, string> = { thin: "Little", medium: "Some", fat: "Most" };

/** What opens when you tap a slab: its name, big actions, and what you've noticed about it */
export default function SlabPanel({
  layer,
  stack,
  notes,
  onChange,
  onAddUnder,
  onSplit,
  onGoInside,
  onDelete,
  onWrite,
  onClose,
}: {
  layer: Layer;
  stack: Stack;
  notes: Note[];
  onChange: (patch: Partial<Layer>) => void;
  onAddUnder: () => void;
  /** Add a slab beside this one */
  onSplit: () => void;
  /** Make this slab the top of the view */
  onGoInside: () => void;
  onDelete: () => void;
  /** Open the full page for "How it works" */
  onWrite: () => void;
  onClose: () => void;
}) {
  const isTop = !layer.parent;
  const kids = subtree(stack, layer.id).size - 1;
  const [confirm, setConfirm] = useState(false);
  const [noteQuery, setNoteQuery] = useState("");
  const [linking, setLinking] = useState(false);
  const linked = layer.note ? findNote(notes, layer.note) : undefined;
  const matches = noteQuery.trim()
    ? notes.filter((n) => n.title.toLowerCase().includes(noteQuery.trim().toLowerCase())).slice(0, 5)
    : [];

  const label = "mt-5 block font-mono text-[11px] tracking-wide text-[#777] uppercase";
  const input =
    "mt-1.5 w-full rounded-lg border-[1.5px] border-[#111]/30 bg-transparent px-3 py-2 font-serif text-[1.35rem] outline-none focus:border-[#111]";

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/15" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Layer: ${layer.name || "new layer"}`}
        onClick={(e) => e.stopPropagation()}
        className="sheet mx-auto max-h-[64dvh] w-full max-w-[700px] overflow-y-auto overscroll-contain rounded-t-2xl border-t-[1.5px] border-[#111] bg-[#fffff8] px-4 pt-3"
      >
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#777]">
            {isTop ? "Top of the stack" : pathTo(stack, layer.id).slice(0, -1).map((l) => l.name || "Untitled").join(" › ")}
          </p>
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

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: "Add underneath", icon: ArrowDownToLine, on: onAddUnder, off: !layer.name.trim() },
            { label: "Split", icon: Columns2, on: onSplit, off: isTop || !layer.name.trim() },
            { label: "Go inside", icon: LogIn, on: onGoInside, off: !kids },
            { label: confirm ? "Sure?" : "Remove", icon: Trash2, on: () => (confirm || (!isTop && !kids && !layer.name) ? onDelete() : setConfirm(true)), danger: true },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.off}
              onClick={a.on}
              className={`slab-action ${a.danger ? "text-[#8b0000]" : ""} ${a.danger && confirm ? "slab-action-confirm" : ""}`}
            >
              <a.icon size={20} strokeWidth={1.8} />
              <span>{a.label}</span>
            </button>
          ))}
        </div>
        {confirm && (
          <p className="mt-2 text-[1.1rem] text-[#8b0000]">
            {isTop ? "This removes the whole stack." : kids ? `This also removes the ${kids} ${kids === 1 ? "layer" : "layers"} under it.` : "Tap again to remove."}
          </p>
        )}

        {/* How it works: a page to write on, not a box */}
        <button type="button" onClick={onWrite} className="slab-card mt-5 w-full text-left">
          <span className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-[#777] uppercase">
            <PenLine size={14} /> How it works
          </span>
          {layer.how?.trim() ? (
            <span className="mt-1.5 line-clamp-4 block text-[1.35rem] leading-snug whitespace-pre-line">{layer.how}</span>
          ) : (
            <span className="mt-1.5 block text-[1.35rem] leading-snug text-[#999] italic">Write how it works…</span>
          )}
        </button>

        <p className={label}>Where&rsquo;s the money?</p>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(["thin", "medium", "fat"] as Margin[]).map((m, i) => {
            const on = layer.margin === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ margin: on ? undefined : m })}
                className={`slab-choice ${on ? "slab-choice-on bg-[#c99a2e] text-[#111]" : ""}`}
              >
                <span className="flex h-5 items-end justify-center gap-0.5" aria-hidden>
                  {Array.from({ length: i + 1 }, (_, k) => (
                    <span key={k} className="coin" style={{ marginBottom: k * 3 }} />
                  ))}
                </span>
                <span>{MONEY_LABEL[m]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={!!layer.choke}
            onClick={() => onChange({ choke: !layer.choke })}
            className={`slab-choice items-start text-left ${layer.choke ? "slab-choice-on bg-[#8b0000] text-[#fffff8]" : ""}`}
          >
            <MapPin size={20} />
            <span className="text-[1.25rem]">Chokepoint</span>
            <span className="text-[1rem] leading-tight opacity-70">Only a few players hold this</span>
          </button>
          <button
            type="button"
            aria-pressed={!!layer.plugIn}
            onClick={() => onChange({ plugIn: !layer.plugIn })}
            className={`slab-choice items-start text-left ${layer.plugIn ? "slab-choice-on bg-[#31566f] text-[#fffff8]" : ""}`}
          >
            <DoorOpen size={20} />
            <span className="text-[1.25rem]">I could get in here</span>
            <span className="text-[1rem] leading-tight opacity-70">Build, work or invest</span>
          </button>
        </div>
        {layer.plugIn && (
          <input
            aria-label="What it would take"
            value={layer.plugHow ?? ""}
            onChange={(e) => onChange({ plugHow: e.target.value })}
            placeholder="What would it take?"
            className={input}
          />
        )}

        <p className={label}>Getting eaten? (AI, open source, copying)</p>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(["safe", "at-risk", "being-eaten"] as Threat[]).map((t) => {
            const on = layer.threat === t;
            const Icon = t === "safe" ? ShieldCheck : t === "at-risk" ? TriangleAlert : Flame;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ threat: on ? undefined : t })}
                className={`slab-choice ${on ? "slab-choice-on text-[#fffff8]" : ""}`}
                style={on ? { background: THREAT_COLOUR[t] } : undefined}
              >
                <Icon size={20} />
                <span>{THREAT_LABEL[t]}</span>
              </button>
            );
          })}
        </div>
        {layer.threat && layer.threat !== "safe" && (
          <input aria-label="Eaten by what" value={layer.threatBy ?? ""} onChange={(e) => onChange({ threatBy: e.target.value })} placeholder="By what?" className={input} />
        )}

        <p className={label}>Who&rsquo;s in it</p>
        <div className="relative">
          <Users size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#888]" />
          <input
            aria-label="Who’s in it"
            value={layer.players ?? ""}
            onChange={(e) => onChange({ players: e.target.value })}
            placeholder="Companies, people, countries"
            className={`${input} pl-9`}
          />
        </div>

        <p className={label}>Deeper thinking</p>
        {layer.note ? (
          <div className="mt-1.5 flex items-center gap-2">
            <Link
              href={linked ? `/notes/${linked.id}` : `/new-note?title=${encodeURIComponent(layer.note)}`}
              className="slab-choice slab-choice-on min-w-0 flex-1 flex-row justify-start gap-2 bg-[#111] px-3 text-left text-[#fffff8] no-underline"
            >
              <NotebookPen size={18} className="shrink-0" />
              <span className="truncate text-[1.25rem]">{linked ? `Open “${linked.title}”` : `Write “${layer.note}”`}</span>
            </Link>
            <button type="button" onClick={() => onChange({ note: undefined })} className="font-mono text-[11px] text-[#777] underline">
              unlink
            </button>
          </div>
        ) : linking ? (
          <div>
            <input autoFocus aria-label="Link a note" value={noteQuery} onChange={(e) => setNoteQuery(e.target.value)} placeholder="Search your notes" className={input} />
            {noteQuery.trim() && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {matches.map((n) => (
                  <button key={n.id} type="button" onClick={() => onChange({ note: n.title })} className="rounded-full border border-[#111]/50 px-2.5 py-0.5 text-[1.15rem]">
                    {n.title}
                  </button>
                ))}
                {!matches.some((n) => n.title.toLowerCase() === noteQuery.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => onChange({ note: noteQuery.trim() })}
                    className="rounded-full border border-dashed border-[#111]/50 px-2.5 py-0.5 text-[1.15rem] text-[#555]"
                  >
                    ＋ new note “{noteQuery.trim()}”
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => setLinking(true)} className="slab-choice mt-1.5 w-full flex-row justify-start gap-2 px-3">
            <NotebookPen size={18} />
            <span className="text-[1.25rem]">Link a note</span>
          </button>
        )}

        <div className="pb-[calc(1.25rem+var(--safe-bottom))]" />
      </div>
    </div>
  );
}
