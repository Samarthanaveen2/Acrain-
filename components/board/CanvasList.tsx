"use client";

import { useState } from "react";
import Link from "next/link";
import { NotebookPen, Plus } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { fmtDate } from "@/lib/notes";
import { canvasTitle, type Canvas } from "@/lib/board";
import Thumbnail from "./Thumbnail";

/** The Playground: every canvas, each one its own topic */
export default function CanvasList({
  canvases,
  notes,
  status,
  onCreate,
}: {
  canvases: Canvas[];
  notes: { id: string; title: string }[];
  status: "loading" | "ready";
  onCreate: (title: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const list = [...canvases].sort((a, b) => b.updated.localeCompare(a.updated));

  return (
    <div className="mx-auto max-w-[900px] px-4 pb-10">
      <SiteHeader title="Playground" />

      {adding ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            await onCreate(title.trim());
            setTitle("");
            setAdding(false);
          }}
          className="-mt-4 mb-6 flex gap-2"
        >
          <input
            autoFocus
            aria-label="Canvas topic"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's this canvas about?"
            className="min-w-0 flex-1 rounded-md border-[1.5px] border-[#111] bg-transparent px-3 py-1.5 text-[1.5rem] outline-none"
          />
          <button type="submit" disabled={!title.trim()} className="rounded-md bg-[#111] px-3 text-[1.25rem] text-[#fffff8] disabled:opacity-40">
            Open
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="-mt-4 mb-6 flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111] px-3 py-1.5 text-[1.3rem]"
        >
          <Plus size={17} /> New canvas
        </button>
      )}

      {status === "loading" && <p className="font-mono text-[12px] text-[#777]">Loading…</p>}
      {status === "ready" && !list.length && (
        <p className="max-w-[30rem] text-[1.25rem] leading-snug text-[#888] italic">Make a canvas for something you&rsquo;re figuring out.</p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 min-[600px]:grid-cols-3">
        {list.map((c) => {
          const n = c.note ? notes.find((x) => x.id === c.note) : undefined;
          return (
            <Link key={c.id} href={`/board/${c.id}`} className="block no-underline">
              <Thumbnail shapes={c.shapes} className="bd-thumb-card" />
              <span className="mt-2 flex items-start gap-1.5">
                {n && <NotebookPen size={14} className="mt-1 shrink-0 text-[var(--path-b)]" aria-label="In a note" />}
                <span className="line-clamp-2 text-[1.4rem] leading-tight">{canvasTitle(c, notes)}</span>
              </span>
              <span className="block font-mono text-[10px] text-[#888]">
                {n ? "in note · " : ""}
                {c.shapes.length} {c.shapes.length === 1 ? "thing" : "things"} · {fmtDate(c.updated)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
