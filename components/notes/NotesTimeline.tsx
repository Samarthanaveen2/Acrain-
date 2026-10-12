"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { docText, fmtDate, type Note } from "@/lib/notes";

const monthName = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });

/** Notes by when you wrote them, newest first, on an ai-2027-style line */
export default function NotesTimeline({ notes }: { notes: Note[] }) {
  const sorted = [...notes].sort((a, b) => b.created.localeCompare(a.created));
  const months: { label: string; notes: Note[] }[] = [];
  for (const n of sorted) {
    const label = monthName(n.created);
    if (months[months.length - 1]?.label !== label) months.push({ label, notes: [] });
    months[months.length - 1].notes.push(n);
  }

  return (
    <div className="mx-auto max-w-[1166px] px-4 pb-24 min-[731px]:px-8">
      <SiteHeader title="Timeline" />
      <p className="max-w-[700px] text-[1.25rem] text-[#555]">How your thinking has moved, newest first.</p>
      {notes.length === 0 && <p className="mt-8 font-mono text-[13px] text-[#777]">No notes yet.</p>}
      <div className="mt-8 max-w-[700px]">
        {months.map((m) => (
          <section key={m.label} className="relative border-l-2 border-[#111] pb-8 pl-6">
            <span className="absolute top-[0.55rem] -left-[7px] h-3 w-3 rounded-full bg-[#111]" />
            <h2 className="text-[1.9rem] leading-tight">{m.label}</h2>
            <ol className="mt-3 grid gap-4">
              {m.notes.map((n) => {
                const text = (n.doc ? docText(n.doc) : n.body).split("\n").find((l) => l.trim()) ?? "";
                return (
                  <li key={n.id} className="relative">
                    <span className="absolute top-[0.7rem] -left-[29px] h-2 w-2 rounded-full border-[1.5px] border-[#111] bg-background" />
                    <Link href={`/notes/${n.id}`} className="block no-underline">
                      <span className="font-mono text-[11.5px] text-[#888]">{fmtDate(n.created)}</span>
                      <span className="block text-[1.5rem] leading-tight">{n.title}</span>
                      {text && <span className="mt-0.5 line-clamp-2 block text-[1.15rem] leading-snug text-[#555]">{text}</span>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
