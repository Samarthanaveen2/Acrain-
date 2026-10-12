"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { backlinks, fmtDate, noteLinks, type Note } from "@/lib/notes";

/** First readable line of a note, for the list */
function preview(body: string) {
  const line = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/:::expand\[[^\]]*\]|:::/g, "")
    .replace(/\[\^[^\]]+\]:?.*$/gm, "")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, a) => a ?? t)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_>`]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return line ?? "";
}

export default function NotesHome({ notes, status }: { notes: Note[]; status: "loading" | "offline" | "ready" }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const shown = notes
    .filter((n) => !tag || n.tags.includes(tag))
    .filter((n) => {
      const s = q.trim().toLowerCase();
      return !s || n.title.toLowerCase().includes(s) || n.body.toLowerCase().includes(s);
    })
    .sort((a, b) => b.updated.localeCompare(a.updated));

  return (
    <div className="mx-auto max-w-[1166px] px-4 pb-24 min-[731px]:px-8">
      <SiteHeader title="Acrain" byline="Samartha" />
      <div className="prose-acrain max-w-[700px]">
        <p>My thinking about the world: ideas, and the connections between them.</p>
      </div>

      <section className="max-w-[700px] pt-10">
        <div className="flex items-center gap-3 border-b border-[#666]/40 pb-2">
          <h2 className="flex-1 text-[2.2rem]">Notes</h2>
          {status === "ready" && (
            <Link
              href="/new-note"
              className="rounded-md border-[1.5px] border-[#111] bg-[#111] px-2.5 py-0.5 text-[1.2rem] text-background no-underline"
            >
              + New note
            </Link>
          )}
        </div>

        {status === "loading" && <p className="mt-6 font-mono text-[13px] text-[#777]">Loading your notes…</p>}
        {status === "offline" && (
          <p className="mt-6 text-[1.25rem] text-[#555]">
            Your notes can&rsquo;t load in this view. Open this page in claude.ai while signed in.
          </p>
        )}

        {status === "ready" && (
          <>
            {notes.length > 0 && (
              <div className="mt-4 grid gap-3">
                <label className="flex items-center gap-2 rounded-md border-[1.5px] border-[#c9c9bf] px-2.5 focus-within:border-[#111]">
                  <Search size={16} className="text-[#777]" />
                  <input
                    aria-label="Search notes"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search your notes"
                    className="w-full bg-transparent py-1.5 text-[1.2rem] outline-none"
                  />
                </label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(([t, n]) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTag(tag === t ? null : t)}
                        aria-pressed={tag === t}
                        className={`rounded-md border-[1.5px] px-2 py-0.5 font-mono text-[12px] ${
                          tag === t ? "border-[#111] bg-[#111] text-background" : "border-[#c9c9bf] hover:border-[#111]"
                        }`}
                      >
                        #{t} <span className="opacity-60">{n}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {notes.length === 0 ? (
              <div className="prose-acrain mt-6">
                <p className="text-[#555]">
                  No notes yet. Tap <b>New note</b> and write whatever you&rsquo;re thinking about. Link ideas together by
                  writing a note&rsquo;s title in double brackets, like <code>[[AI and jobs]]</code>.
                </p>
              </div>
            ) : (
              <ol className="mt-5 grid">
                {shown.map((n) => {
                  const outs = noteLinks(n).length;
                  const ins = backlinks(notes, n).length;
                  return (
                    <li key={n.id} className="border-b border-[#666]/20">
                      <Link href={`/notes/${n.id}`} className="block py-3.5 no-underline">
                        <span className="block text-[1.7rem] leading-tight">{n.title || "Untitled"}</span>
                        {preview(n.body) && (
                          <span className="mt-1 line-clamp-2 block text-[1.15rem] leading-snug text-[#555]">{preview(n.body)}</span>
                        )}
                        <span className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[11.5px] text-[#888]">
                          <span>{fmtDate(n.updated)}</span>
                          {outs + ins > 0 && <span>{outs + ins} {outs + ins === 1 ? "connection" : "connections"}</span>}
                          {n.tags.map((t) => (
                            <span key={t}>#{t}</span>
                          ))}
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {shown.length === 0 && <p className="mt-4 text-[1.2rem] text-[#777]">Nothing matches.</p>}
              </ol>
            )}
          </>
        )}
      </section>
    </div>
  );
}
