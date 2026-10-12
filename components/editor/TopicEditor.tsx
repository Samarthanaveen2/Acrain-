"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { saveTopic } from "@/app/actions";
import { newChapter } from "@/lib/templates";
import type { Chapter, Topic } from "@/lib/types";
import { Dashboard } from "@/components/topic/Dashboard";
import { Field, inputCls, SectionTitle, ShortNumber } from "./fields";
import MarkdownField from "./MarkdownField";

type Selection = { kind: "intro" } | { kind: "chapter"; index: number };
type Status = { type: "idle" | "saving" | "saved" | "error"; message?: string };

let tempId = 0;
const freshId = () => `new-${Date.now()}-${tempId++}`;

export default function TopicEditor({ initial }: { initial: Topic }) {
  const [topic, setTopic] = useState(initial);
  const [sel, setSel] = useState<Selection>(initial.chapters.length ? { kind: "chapter", index: 0 } : { kind: "intro" });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();
  // Latest topic for the save shortcut, updated after each render
  const latest = useRef(topic);
  useEffect(() => {
    latest.current = topic;
  }, [topic]);

  const edit = (fn: (t: Topic) => Topic) => {
    setTopic((t) => fn(t));
    setDirty(true);
    setStatus({ type: "idle" });
  };
  const editChapter = (i: number, patch: Partial<Chapter>) =>
    edit((t) => ({ ...t, chapters: t.chapters.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  const save = useCallback(() => {
    setStatus({ type: "saving" });
    startTransition(async () => {
      const res = await saveTopic(latest.current);
      if (res.ok) {
        setDirty(false);
        setTopic((t) => ({ ...t, updated: res.updated }));
        setStatus({ type: "saved" });
      } else {
        setStatus({ type: "error", message: res.error });
      }
    });
  }, []);

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

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const addChapter = () => {
    const at = sel.kind === "chapter" ? sel.index + 1 : topic.chapters.length;
    const prev = topic.chapters[at - 1];
    edit((t) => {
      const chapters = [...t.chapters];
      chapters.splice(at, 0, newChapter(t.dashboard, prev, freshId()));
      return { ...t, chapters };
    });
    setSel({ kind: "chapter", index: at });
    setConfirmDelete(false);
  };

  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= topic.chapters.length) return;
    edit((t) => {
      const chapters = [...t.chapters];
      [chapters[i], chapters[j]] = [chapters[j], chapters[i]];
      return { ...t, chapters };
    });
    setSel({ kind: "chapter", index: j });
  };

  const remove = (i: number) => {
    edit((t) => ({ ...t, chapters: t.chapters.filter((_, j) => j !== i) }));
    setSel(topic.chapters.length > 1 ? { kind: "chapter", index: Math.max(0, i - 1) } : { kind: "intro" });
    setConfirmDelete(false);
  };

  const states = topic.chapters.map(({ date, label, lines, capabilities, share, metrics }) => ({
    date,
    label,
    lines,
    capabilities,
    share,
    metrics,
  }));
  const chapter = sel.kind === "chapter" ? topic.chapters[sel.index] : undefined;
  const preview = states.length ? (
    <Dashboard def={topic.dashboard} states={states} active={sel.kind === "chapter" ? sel.index : 0} />
  ) : (
    <p className="font-mono text-[12px] text-[#888]">Add a chapter to see the dashboard.</p>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#666]/30 bg-background/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 min-[731px]:px-6">
          <Link href="/" className="font-mono text-[12px] text-[#666] no-underline hover:text-[#111]">
            ← Acrain
          </Link>
          <span className="min-w-0 flex-1 truncate text-[1.5rem]">{topic.title || "Untitled topic"}</span>
          <span
            role="status"
            className={`font-mono text-[12px] ${status.type === "error" ? "text-[#8b0000]" : "text-[#777]"}`}
          >
            {status.type === "saving"
              ? "Saving…"
              : status.type === "saved"
                ? "Saved"
                : status.type === "error"
                  ? "Not saved"
                  : dirty
                    ? "Unsaved changes"
                    : ""}
          </span>
          <Link href={`/topics/${topic.slug}`} className="font-mono text-[12px] text-[#333] underline">
            View page
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={status.type === "saving"}
            className="rounded-md border-[1.5px] border-[#111] bg-[#111] px-3 py-1 text-[1.15rem] text-background hover:bg-transparent hover:text-[#111] disabled:opacity-50"
            title="Save (Ctrl+S / ⌘S)"
          >
            Save
          </button>
        </div>
        {status.type === "error" && (
          <p className="border-t border-[#8b0000]/30 bg-[#8b0000]/[0.06] px-4 py-2 font-mono text-[12px] text-[#8b0000] min-[731px]:px-6">
            {status.message}
          </p>
        )}
      </header>

      <div className="grid gap-8 px-4 pt-6 pb-24 min-[731px]:px-6 lg:grid-cols-[220px_minmax(0,1fr)_430px]">
        {/* Left: what you're editing */}
        <nav aria-label="Topic parts" className="min-w-0">
          <button
            type="button"
            onClick={() => setSel({ kind: "intro" })}
            className={`w-full rounded-md px-2.5 py-1.5 text-left text-[1.2rem] ${sel.kind === "intro" ? "bg-[#111] text-background" : "hover:bg-[#111]/[0.05]"}`}
          >
            Intro &amp; questions
          </button>
          <div className="mt-5 mb-1.5 px-1 font-mono text-[11px] tracking-wide text-[#666] uppercase">Chapters</div>
          <ol className="grid gap-0.5">
            {topic.chapters.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSel({ kind: "chapter", index: i });
                    setConfirmDelete(false);
                  }}
                  className={`w-full rounded-md px-2.5 py-1.5 text-left ${sel.kind === "chapter" && sel.index === i ? "bg-[#111] text-background" : "hover:bg-[#111]/[0.05]"}`}
                >
                  <span className="block font-mono text-[11px] opacity-70">{c.date}</span>
                  <span className="block truncate text-[1.15rem] leading-snug">{c.title || "Untitled chapter"}</span>
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={addChapter}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border-[1.5px] border-dashed border-[#999] px-2.5 py-1.5 text-[1.1rem] text-[#333] hover:border-[#111]"
          >
            <Plus size={15} /> Add chapter
          </button>
        </nav>

        {/* Middle: the form */}
        <main className="min-w-0">
          {sel.kind === "intro" && (
            <div className="grid gap-5">
              <SectionTitle>Intro</SectionTitle>
              <Field label="Title">
                <input value={topic.title} onChange={(e) => edit((t) => ({ ...t, title: e.target.value }))} className={`${inputCls} text-[1.8rem]`} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Byline">
                  <input value={topic.author} onChange={(e) => edit((t) => ({ ...t, author: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Time span">
                  <input
                    value={topic.span}
                    placeholder="2026 → 2030"
                    onChange={(e) => edit((t) => ({ ...t, span: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Summary" hint="One line, shown on the home page.">
                <input value={topic.summary} onChange={(e) => edit((t) => ({ ...t, summary: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Opening" hint="Shown under the title. Leave a blank line between paragraphs.">
                <textarea
                  rows={6}
                  value={topic.subtitle}
                  onChange={(e) => edit((t) => ({ ...t, subtitle: e.target.value }))}
                  className={`${inputCls} text-[1.3rem] leading-[1.9rem]`}
                />
              </Field>

              <SectionTitle hint="The outlined buttons under the opening, like ai-2027's “What is this?”">Questions</SectionTitle>
              {topic.questions.map((q, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-[#c9c9bf] p-3">
                  <div className="flex gap-2">
                    <input
                      aria-label={`Question ${i + 1}`}
                      value={q.q}
                      placeholder="What is this?"
                      onChange={(e) =>
                        edit((t) => ({ ...t, questions: t.questions.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) }))
                      }
                      className={inputCls}
                    />
                    <button
                      type="button"
                      aria-label="Remove question"
                      onClick={() => edit((t) => ({ ...t, questions: t.questions.filter((_, j) => j !== i) }))}
                      className="shrink-0 rounded-md px-2 text-[#777] hover:bg-[#111]/[0.06] hover:text-[#111]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <textarea
                    aria-label={`Answer ${i + 1}`}
                    rows={3}
                    value={q.a}
                    placeholder="Your answer"
                    onChange={(e) =>
                      edit((t) => ({ ...t, questions: t.questions.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) }))
                    }
                    className={inputCls}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => edit((t) => ({ ...t, questions: [...t.questions, { q: "", a: "" }] }))}
                className="inline-flex w-fit items-center gap-1.5 rounded-md border-[1.5px] border-dashed border-[#999] px-2.5 py-1 text-[1.1rem] hover:border-[#111]"
              >
                <Plus size={15} /> Add question
              </button>

              <SectionTitle hint="Listed at the bottom of the topic page.">Sources</SectionTitle>
              {topic.sources.map((s, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-[#c9c9bf] p-3 sm:grid-cols-2">
                  {(["title", "url", "publisher", "date"] as const).map((k) => (
                    <input
                      key={k}
                      aria-label={`Source ${i + 1} ${k}`}
                      placeholder={k === "url" ? "https://" : k[0].toUpperCase() + k.slice(1)}
                      value={s[k]}
                      onChange={(e) =>
                        edit((t) => ({ ...t, sources: t.sources.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) }))
                      }
                      className={inputCls}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => edit((t) => ({ ...t, sources: t.sources.filter((_, j) => j !== i) }))}
                    className="w-fit font-mono text-[12px] text-[#777] underline hover:text-[#111]"
                  >
                    Remove source
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  edit((t) => ({
                    ...t,
                    sources: [...t.sources, { id: `s${Date.now()}`, title: "", url: "", publisher: "", date: "" }],
                  }))
                }
                className="inline-flex w-fit items-center gap-1.5 rounded-md border-[1.5px] border-dashed border-[#999] px-2.5 py-1 text-[1.1rem] hover:border-[#111]"
              >
                <Plus size={15} /> Add source
              </button>
            </div>
          )}

          {chapter && sel.kind === "chapter" && (
            <div key={chapter.id} className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[12px] text-[#777]">
                  Chapter {sel.index + 1} of {topic.chapters.length}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Move chapter up" disabled={sel.index === 0} onClick={() => move(sel.index, -1)} className="rounded-md p-1.5 hover:bg-[#111]/[0.06] disabled:opacity-30">
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move chapter down"
                    disabled={sel.index === topic.chapters.length - 1}
                    onClick={() => move(sel.index, 1)}
                    className="rounded-md p-1.5 hover:bg-[#111]/[0.06] disabled:opacity-30"
                  >
                    <ArrowDown size={16} />
                  </button>
                  {confirmDelete ? (
                    <span className="ml-2 flex items-center gap-2 font-mono text-[12px]">
                      Delete this chapter?
                      <button type="button" onClick={() => remove(sel.index)} className="rounded bg-[#8b0000] px-2 py-0.5 text-white">
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="underline">
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button type="button" aria-label="Delete chapter" onClick={() => setConfirmDelete(true)} className="rounded-md p-1.5 text-[#8b0000] hover:bg-[#8b0000]/[0.08]">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <input
                aria-label="Chapter title"
                value={chapter.title}
                placeholder="Late 2027: Coding Is Automated"
                onChange={(e) => editChapter(sel.index, { title: e.target.value })}
                className={`${inputCls} text-[2rem] leading-tight`}
              />
              <div className="grid gap-4 sm:grid-cols-[auto_auto_minmax(0,1fr)]">
                <Field label="Month">
                  <input
                    type="month"
                    value={chapter.date}
                    onChange={(e) => e.target.value && editChapter(sel.index, { date: e.target.value })}
                    className={`${inputCls} font-mono text-[14px]`}
                  />
                </Field>
                <Field label="Type">
                  <div className="flex rounded-md border-[1.5px] border-[#c9c9bf] p-0.5 font-mono text-[12px]">
                    {(
                      [
                        ["forecast", "My forecast"],
                        ["reported", "Reported"],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={chapter.kind === k}
                        onClick={() => editChapter(sel.index, { kind: k })}
                        className={`rounded px-2.5 py-1.5 whitespace-nowrap ${chapter.kind === k ? "bg-[#111] text-background" : ""}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Milestone" hint="Named on the chart, e.g. “Superhuman coder”.">
                  <input value={chapter.label} onChange={(e) => editChapter(sel.index, { label: e.target.value })} className={inputCls} />
                </Field>
              </div>

              <MarkdownField
                id={chapter.id}
                value={chapter.body}
                onChange={(body) => editChapter(sel.index, { body })}
                placeholder="Write what happens in this chapter…"
              />

              <SectionTitle hint="What the dashboard shows while this chapter is on screen. Numbers accept 47B, 1.2T, 20K.">
                Dashboard at this point
              </SectionTitle>

              <div>
                <p className="mb-2 text-[1.15rem]">{topic.dashboard.lines.label}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {topic.dashboard.lines.series.map((s) => (
                    <Field key={s.key} label={s.label} hint={s.key === topic.dashboard.lines.series[0]?.key ? "1 = no speed-up" : undefined}>
                      <ShortNumber
                        key={`${chapter.id}-l-${s.key}`}
                        ariaLabel={s.label}
                        value={chapter.lines[s.key] ?? 1}
                        suffix="×"
                        onChange={(v) => editChapter(sel.index, { lines: { ...chapter.lines, [s.key]: v } })}
                      />
                    </Field>
                  ))}
                </div>
              </div>

              {topic.dashboard.capabilities && (
                <div>
                  <p className="mb-2 text-[1.15rem]">
                    {topic.dashboard.capabilities.label}{" "}
                    <span className="font-mono text-[11px] text-[#888]">1 = top human expert · 3 = far beyond</span>
                  </p>
                  <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                    {topic.dashboard.capabilities.items.map((it) => {
                      const v = chapter.capabilities[it.key] ?? 0;
                      return (
                        <label key={it.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.8rem] items-center gap-2">
                          <span className="font-mono text-[12px]">{it.label}</span>
                          <input
                            type="range"
                            min={0}
                            max={3}
                            step={0.05}
                            value={v}
                            onChange={(e) =>
                              editChapter(sel.index, { capabilities: { ...chapter.capabilities, [it.key]: Number(e.target.value) } })
                            }
                            className="accent-[var(--accent)]"
                          />
                          <span className={`text-right font-mono text-[12px] ${v >= 1 ? "text-accent" : ""}`}>{v.toFixed(2)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {topic.dashboard.share && (
                <div>
                  <p className="mb-2 text-[1.15rem]">
                    {topic.dashboard.share.label} share{" "}
                    <span className="font-mono text-[11px] text-[#888]">any numbers; shown as % of the total</span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {topic.dashboard.share.parts.map((p) => {
                      const total = topic.dashboard.share!.parts.reduce((s, q) => s + (chapter.share[q.key] ?? 0), 0) || 1;
                      return (
                        <Field key={p.key} label={p.label} hint={`${Math.round(((chapter.share[p.key] ?? 0) / total) * 100)}%`}>
                          <ShortNumber
                            key={`${chapter.id}-s-${p.key}`}
                            ariaLabel={p.label}
                            value={chapter.share[p.key] ?? 0}
                            onChange={(v) => editChapter(sel.index, { share: { ...chapter.share, [p.key]: v } })}
                          />
                        </Field>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-[1.15rem]">Stats</p>
                <div className="grid gap-3 sm:grid-cols-4">
                  {topic.dashboard.metrics.map((m) => (
                    <Field key={m.key} label={m.label}>
                      <ShortNumber
                        key={`${chapter.id}-m-${m.key}`}
                        ariaLabel={m.label}
                        value={chapter.metrics[m.key] ?? 0}
                        prefix={m.format === "currency" ? "$" : undefined}
                        suffix={m.format === "percent" ? "%" : m.suffix}
                        onChange={(v) => editChapter(sel.index, { metrics: { ...chapter.metrics, [m.key]: v } })}
                      />
                    </Field>
                  ))}
                </div>
              </div>

              {/* On narrow screens the preview sits under the form */}
              <div className="lg:hidden">
                <SectionTitle>Preview</SectionTitle>
                <div className="mt-4">{preview}</div>
              </div>
            </div>
          )}

          {sel.kind === "chapter" && !chapter && <p className="text-[#777]">Pick a chapter on the left.</p>}
        </main>

        {/* Right: the live dashboard, exactly as the page shows it */}
        <aside className="hidden lg:block" aria-label="Dashboard preview">
          <div className="sticky top-20">
            <p className="mb-3 font-mono text-[11px] tracking-wide text-[#666] uppercase">Live preview</p>
            {preview}
          </div>
        </aside>
      </div>
    </div>
  );
}
