"use client";

import { useRef, useState } from "react";
import { BarChart3, Link2, ListCollapse, Network, Quote } from "lucide-react";
import ChapterBody from "@/components/topic/ChapterBody";
import { collectNotes } from "@/lib/footnotes";

const CHART = "```chart\ntype: line\ntitle: \n2026-10: 0\n2027-06: 0\n```";

/** The writing box: Markdown with buttons for ai-2027-style pieces, and a preview tab */
export default function MarkdownField({
  id,
  value,
  onChange,
  placeholder,
  linkTargets,
  previewTransform,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Titles of other notes, for the "Link note" picker */
  linkTargets?: string[];
  /** Applied to the text before the preview renders it (e.g. resolving [[links]]) */
  previewTransform?: (body: string) => string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState("");

  // Insert text at the cursor (or around the selection) and put the cursor where `select` says
  const insert = (make: (selected: string) => { text: string; select?: [number, number] }, block = false) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const { text, select } = make(value.slice(start, end));
    const pad = block && before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const next = before + pad + text + (block && after && !after.startsWith("\n") ? "\n\n" : "") + after;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const base = before.length + pad.length;
      el.setSelectionRange(base + (select?.[0] ?? text.length), base + (select?.[1] ?? text.length));
    });
  };

  const footnote = () => {
    const used = new Set([...value.matchAll(/\[\^([^\]]+)\]/g)].map((m) => m[1]));
    let n = 1;
    while (used.has(String(n))) n++;
    const el = ref.current;
    if (!el) return;
    const pos = el.selectionEnd;
    const ref_ = `[^${n}]`;
    const def = `[^${n}]: `;
    const body = value.slice(0, pos) + ref_ + value.slice(pos);
    const next = body.replace(/\s*$/, "") + `\n\n${def}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.length, next.length);
    });
  };

  const tool = "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[12px] text-[#333] hover:bg-[#111]/[0.06]";
  const notes = collectNotes([{ id, body: value }]).numbers[id];

  return (
    <div className="rounded-lg border-[1.5px] border-[#c9c9bf] focus-within:border-[#111]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#c9c9bf] px-1.5 py-1">
        <div className="mr-2 flex rounded-md bg-[#111]/[0.06] p-0.5 font-mono text-[12px]" role="tablist">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded px-2.5 py-0.5 capitalize ${tab === t ? "bg-[#111] text-background" : "text-[#444]"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "write" && (
          <>
            <button
              type="button"
              className={tool}
              onClick={() => insert((sel) => ({ text: `:::expand[Title]\n${sel || "Details that open when clicked."}\n:::`, select: [10, 15] }), true)}
            >
              <ListCollapse size={14} /> Deep-dive box
            </button>
            <button type="button" className={tool} onClick={footnote}>
              <Quote size={14} /> Footnote
            </button>
            <button type="button" className={tool} onClick={() => insert(() => ({ text: CHART, select: [27, 27] }), true)}>
              <BarChart3 size={14} /> Chart
            </button>
            <button
              type="button"
              className={tool}
              onClick={() => insert((sel) => ({ text: `[${sel || "link text"}](https://)`, select: [(sel || "link text").length + 3, (sel || "link text").length + 11] }))}
            >
              <Link2 size={14} /> Link
            </button>
            {linkTargets && (
              <button type="button" className={tool} onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
                <Network size={14} /> Link note
              </button>
            )}
          </>
        )}
      </div>
      {picking && tab === "write" && linkTargets && (
        <div className="border-b border-[#c9c9bf] px-2 py-2">
          <input
            autoFocus
            aria-label="Find a note to link"
            value={pickQuery}
            onChange={(e) => setPickQuery(e.target.value)}
            placeholder="Type a note title (new titles create a new note)"
            className="w-full rounded-md border border-[#c9c9bf] bg-background px-2 py-1 font-mono text-[13px] outline-none focus:border-[#111]"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[
              ...linkTargets.filter((t) => t.toLowerCase().includes(pickQuery.trim().toLowerCase())).slice(0, 12),
              ...(pickQuery.trim() && !linkTargets.some((t) => t.toLowerCase() === pickQuery.trim().toLowerCase()) ? [pickQuery.trim()] : []),
            ].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  insert(() => ({ text: `[[${t}]]` }));
                  setPicking(false);
                  setPickQuery("");
                }}
                className="rounded-md border border-[#111] px-2 py-0.5 text-[1.05rem] hover:bg-[#111] hover:text-background"
              >
                {linkTargets.includes(t) ? t : `+ ${t}`}
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === "write" ? (
        <textarea
          ref={ref}
          aria-label="Chapter text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={16}
          className="block w-full resize-y rounded-b-lg bg-background px-4 py-3 text-[1.3rem] leading-[1.9rem] outline-none"
        />
      ) : (
        <div className="min-h-[20rem] px-4 py-3">
          {value.trim() ? <ChapterBody body={previewTransform ? previewTransform(value) : value} notes={notes} /> : <p className="text-[1.2rem] text-[#888]">Nothing written yet.</p>}
        </div>
      )}
    </div>
  );
}
