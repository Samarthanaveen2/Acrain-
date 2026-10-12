"use client";

import { useRef, useState } from "react";
import { BarChart3, Link2, ListCollapse, Quote } from "lucide-react";
import ChapterBody from "@/components/topic/ChapterBody";
import { collectNotes } from "@/lib/footnotes";

const CHART = "```chart\ntype: line\ntitle: \n2026-10: 0\n2027-06: 0\n```";

/** The writing box: Markdown with buttons for ai-2027-style pieces, and a preview tab */
export default function MarkdownField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

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
          </>
        )}
      </div>
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
          {value.trim() ? <ChapterBody body={value} notes={notes} /> : <p className="text-[1.2rem] text-[#888]">Nothing written yet.</p>}
        </div>
      )}
    </div>
  );
}
