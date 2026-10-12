"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { inputCls } from "@/components/editor/fields";
import { markdownToHtml, parseTags, type Note } from "@/lib/notes";
import RichEditor from "./rich/RichEditor";

type Status = { type: "idle" | "saving" | "saved" | "error"; message?: string };

/**
 * Writing a note. Saves by itself shortly after you stop typing and when you leave;
 * `onSave` stores it (and renames links elsewhere if the title changed).
 */
export default function NoteEditor({
  initial,
  notes,
  onSave,
  onDelete,
  onBack,
  onDone,
}: {
  initial: Note;
  notes: Note[];
  onSave: (note: Note, previousTitle: string) => Promise<void>;
  onDelete: (note: Note) => Promise<void>;
  /** Back button handler (the app's history); without it, Back goes to the notes list */
  onBack?: () => void;
  /** "Done" handler; without it, Done opens the note */
  onDone?: () => void;
}) {
  const [note, setNote] = useState(initial);
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const savedTitle = useRef(initial.title);
  const latest = useRef({ note, tagText });
  useEffect(() => {
    latest.current = { note, tagText };
  }, [note, tagText]);

  const edit = (patch: Partial<Note>) => {
    setNote((n) => ({ ...n, ...patch }));
    setDirty(true);
    setStatus({ type: "idle" });
  };

  const save = useCallback(async () => {
    const { note: n, tagText: t } = latest.current;
    if (!n.title.trim()) return setStatus({ type: "error", message: "Add a title to save" });
    setStatus({ type: "saving" });
    const next = { ...n, title: n.title.trim(), tags: parseTags(t), updated: new Date().toISOString() };
    try {
      await onSave(next, savedTitle.current);
      savedTitle.current = next.title;
      setNote(next);
      setDirty(false);
      setStatus({ type: "saved" });
    } catch (e) {
      setStatus({ type: "error", message: `Couldn't save (${(e as { message?: string })?.message ?? String(e)}).` });
    }
  }, [onSave]);

  // Autosave: shortly after the last change…
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(save, 700);
    return () => clearTimeout(t);
  }, [note, tagText, dirty, save]);

  // …and when leaving the editor with changes not yet saved
  const pending = useRef({ dirty, save });
  useEffect(() => {
    pending.current = { dirty, save };
  }, [dirty, save]);
  useEffect(
    () => () => {
      if (pending.current.dirty) pending.current.save();
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const others = notes.filter((n) => n.id !== note.id).map((n) => n.title);

  return (
    <div className="min-h-screen">
      <header className="sticky top-[var(--safe-top)] z-20 border-b border-[#666]/30 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[860px] items-center gap-3 px-2 py-2">
          {onBack ? (
            <button type="button" onClick={onBack} className="flex items-center gap-0.5 px-1 py-1 text-[1.25rem]">
              <ChevronLeft size={22} /> Back
            </button>
          ) : (
            <Link href="/" className="flex items-center gap-0.5 px-1 py-1 text-[1.25rem] no-underline">
              <ChevronLeft size={22} /> Notes
            </Link>
          )}
          <span role="status" className={`flex-1 truncate text-right font-mono text-[12px] ${status.type === "error" ? "text-[#8b0000]" : "text-[#888]"}`}>
            {status.type === "saving" ? "Saving…" : status.type === "saved" ? "Saved" : status.type === "error" ? status.message : dirty ? "Editing…" : ""}
          </span>
          {onDone ? (
            <button type="button" onClick={onDone} className="rounded-md bg-[#111] px-3 py-1 text-[1.15rem] text-background">
              Done
            </button>
          ) : (
            <Link href={`/notes/${note.id}`} className="rounded-md bg-[#111] px-3 py-1 text-[1.15rem] text-background no-underline">
              Done
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-[860px] grid-cols-[minmax(0,1fr)] gap-4 px-4 pt-6 pb-24">
        <input
          aria-label="Note title"
          value={note.title}
          placeholder="Title"
          autoFocus={!initial.title}
          onChange={(e) => edit({ title: e.target.value })}
          className={`${inputCls} text-[2.2rem] leading-tight`}
        />
        <input
          aria-label="Tags"
          value={tagText}
          placeholder="Tags, separated by commas: ai, politics, me"
          onChange={(e) => {
            setTagText(e.target.value);
            setDirty(true);
          }}
          className={`${inputCls} font-mono text-[14px]`}
        />
        <RichEditor
          initial={note.doc ?? markdownToHtml(note.body)}
          titles={others}
          placeholder="Write what you think…"
          onChange={(doc, text) => edit({ doc, body: text })}
        />
        <p className="font-mono text-[11.5px] leading-relaxed text-[#888]">
          Tip: type <b>[[</b> or tap <b>Note</b> to link another idea. Tapping a link to a note you haven&rsquo;t written
          yet creates it.
        </p>

        <div className="mt-6 border-t border-[#666]/20 pt-4">
          {confirmDelete ? (
            <span className="flex flex-wrap items-center gap-3 font-mono text-[12px]">
              Delete this note for good?
              <button type="button" onClick={() => onDelete(note)} className="rounded bg-[#8b0000] px-2 py-0.5 text-white">
                Delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="underline">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[#8b0000]">
              <Trash2 size={14} /> Delete note
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
