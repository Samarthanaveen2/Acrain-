"use client";

import { useState } from "react";
import type { Note } from "@/lib/notes";

/** Copy all notes as text, or paste that text back in: moves notes between the app and the web version */
export default function Backup({ notes, onRestore }: { notes: Note[]; onRestore: (notes: Note[]) => Promise<void> }) {
  const [mode, setMode] = useState<null | "copied" | "show" | "restore">(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const backup = JSON.stringify({ acrain: 1, notes });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(backup);
      setMode("copied");
    } catch {
      setMode("show"); // clipboard refused: show the text so it can be selected by hand
    }
  };

  const restore = async () => {
    try {
      const parsed = JSON.parse(text);
      const list: Note[] = (Array.isArray(parsed) ? parsed : parsed.notes ?? []).filter((n: Note) => n?.id && typeof n.title === "string");
      if (!list.length) throw new Error("no notes found in that text");
      await onRestore(list);
      setMsg(`Restored ${list.length} ${list.length === 1 ? "note" : "notes"}.`);
      setText("");
      setMode(null);
    } catch (e) {
      setMsg(`Couldn't restore: ${(e as { message?: string })?.message ?? String(e)}. Paste the whole backup text.`);
    }
  };

  const btn = "rounded-md border-[1.5px] border-[#111] px-2.5 py-0.5 font-mono text-[12px]";
  return (
    <section className="mt-16 border-t border-[#666]/30 pt-5">
      <h2 className="text-[1.4rem]">Backup</h2>
      <p className="mt-1 text-[1.1rem] leading-snug text-[#666]">
        Copy all your notes as text to keep them safe or move them between the app and the web version.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={copy} disabled={!notes.length}>
          Copy backup
        </button>
        <button type="button" className={btn} onClick={() => setMode(mode === "restore" ? null : "restore")}>
          Restore from backup
        </button>
      </div>
      {mode === "copied" && <p className="mt-2 font-mono text-[12px] text-accent">Copied {notes.length} notes. Paste it somewhere safe.</p>}
      {mode === "show" && (
        <textarea readOnly rows={5} value={backup} onFocus={(e) => e.target.select()} aria-label="Backup text" className="mt-2 w-full rounded-md border border-[#c9c9bf] bg-background p-2 font-mono text-[11px]" />
      )}
      {mode === "restore" && (
        <div className="mt-2 grid gap-2">
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a backup here. Notes with the same name are replaced; others are kept."
            aria-label="Paste backup"
            className="w-full rounded-md border border-[#c9c9bf] bg-background p-2 font-mono text-[12px]"
          />
          <button type="button" className={`${btn} w-fit bg-[#111] text-background`} onClick={restore} disabled={!text.trim()}>
            Restore
          </button>
        </div>
      )}
      {msg && <p className="mt-2 font-mono text-[12px] text-[#555]">{msg}</p>}
    </section>
  );
}
