"use client";

import Link from "next/link";
import { PenLine } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { backlinks, findNote, fmtDate, footnotesIn, markdownToHtml, noteLinks, type Note } from "@/lib/notes";
import RichView from "./rich/RichView";

/** Reading a note: ai-2027 typography, then what it connects to and what connects to it */
export default function NoteView({ note, notes }: { note: Note; notes: Note[] }) {
  const linkedFrom = backlinks(notes, note);
  const linksTo = noteLinks(note).map((t) => ({ title: t, note: findNote(notes, t) }));
  const footnotes = note.doc ? footnotesIn(note.doc) : [];
  const empty = !note.body.trim() && !note.doc?.content?.some((c) => c.content?.length || c.type !== "paragraph");
  const sep = <span className="text-[#bbb]">|</span>;

  return (
    <div className="mx-auto max-w-[1166px] px-4 pb-32 min-[731px]:px-8">
      <SiteHeader title={note.title || "Untitled"} />
      <div className="max-w-[700px]">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-[#777]">
          <span>Written {fmtDate(note.created)}</span>
          {note.updated.slice(0, 10) !== note.created.slice(0, 10) && (
            <>
              {sep}
              <span>Updated {fmtDate(note.updated)}</span>
            </>
          )}
          {sep}
          <Link href={`/notes/${note.id}/edit`} className="inline-flex items-center gap-1 no-underline hover:text-[#111]">
            <PenLine size={14} /> Edit
          </Link>
        </p>
        {note.tags.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {note.tags.map((t) => (
              <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="rounded-md border border-[#c9c9bf] px-1.5 font-mono text-[12px] text-[#555] no-underline">
                #{t}
              </Link>
            ))}
          </p>
        )}

        <div className="mt-8">
          {!empty ? (
            <RichView doc={note.doc ?? markdownToHtml(note.body)} />
          ) : (
            <p className="text-[1.3rem] text-[#777]">
              Empty note.{" "}
              <Link href={`/notes/${note.id}/edit`} className="underline">
                Start writing
              </Link>
            </p>
          )}
        </div>

        {(linkedFrom.length > 0 || linksTo.length > 0) && (
          <section className="mt-16 grid gap-8 border-t border-[#666]/30 pt-8 sm:grid-cols-2">
            <div>
              <h2 className="text-[1.5rem]">Linked from</h2>
              {linkedFrom.length ? (
                <ul className="mt-2 grid gap-1.5">
                  {linkedFrom.map((n) => (
                    <li key={n.id}>
                      <Link href={`/notes/${n.id}`} className="text-[1.25rem] text-accent underline decoration-1 underline-offset-2">
                        {n.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 font-mono text-[12px] text-[#888]">No notes link here yet.</p>
              )}
            </div>
            <div>
              <h2 className="text-[1.5rem]">Links to</h2>
              {linksTo.length ? (
                <ul className="mt-2 grid gap-1.5">
                  {linksTo.map((l) => (
                    <li key={l.title}>
                      <Link
                        href={l.note ? `/notes/${l.note.id}` : `/new-note?title=${encodeURIComponent(l.title)}`}
                        className={`text-[1.25rem] underline decoration-1 underline-offset-2 ${l.note ? "text-accent" : "text-[#8a8a80] decoration-dashed"}`}
                      >
                        {l.note?.title ?? l.title}
                      </Link>
                      {!l.note && <span className="ml-1.5 font-mono text-[11px] text-[#999]">not written yet</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 font-mono text-[12px] text-[#888]">This note doesn&rsquo;t link anywhere yet.</p>
              )}
            </div>
          </section>
        )}

        {footnotes.length > 0 && (
          <section className="mt-12 border-t border-[#666]/30 pt-6">
            <h2 className="text-[1.5rem]">Footnotes</h2>
            <ol className="mt-3 grid gap-3">
              {footnotes.map((t, i) => (
                <li key={i} className="grid grid-cols-[2.6rem_minmax(0,1fr)] text-[1.2rem] leading-snug">
                  <span className="text-[#777]">[{i + 1}]</span>
                  <span>{t || "—"}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
