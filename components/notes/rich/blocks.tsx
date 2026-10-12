"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import ChartBlock from "@/components/topic/ChartBlock";
import type { ChartSpec } from "@/lib/chart-spec";
import { findNote } from "@/lib/notes";
import { useNotesContext } from "./context";

// Rich building blocks for notes. Each one looks the same while writing and reading;
// while writing, tapping it lets you change it.

/* ---------- Deep-dive: a collapsible box with a title ---------- */

function DeepDiveView({ node, updateAttributes, editor, deleteNode }: ReactNodeViewProps) {
  const [open, setOpen] = useState(editor.isEditable);
  const title = String(node.attrs.title ?? "");
  return (
    <NodeViewWrapper className="deep-dive" data-open={open ? "true" : "false"}>
      <div className="deep-dive-head" contentEditable={false}>
        <button type="button" className="deep-dive-toggle" aria-expanded={open} aria-label={open ? "Collapse" : "Expand"} onClick={() => setOpen(!open)}>
          <ChevronRight size={18} />
        </button>
        {editor.isEditable ? (
          <>
            <input
              className="deep-dive-title"
              value={title}
              placeholder="Box title"
              aria-label="Box title"
              onChange={(e) => updateAttributes({ title: e.target.value })}
            />
            <button type="button" className="block-icon-btn" aria-label="Remove box" onClick={() => deleteNode()}>
              <Trash2 size={15} />
            </button>
          </>
        ) : (
          <button type="button" className="deep-dive-title text-left" onClick={() => setOpen(!open)}>
            {title || "More"}
          </button>
        )}
      </div>
      <NodeViewContent className="deep-dive-body" />
    </NodeViewWrapper>
  );
}

export const DeepDive = Node.create({
  name: "deepDive",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { title: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-deep-dive]", getAttrs: (el) => ({ title: (el as HTMLElement).getAttribute("data-title") ?? "" }) }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-deep-dive": "", "data-title": node.attrs.title }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DeepDiveView);
  },
});

/* ---------- Footnote: a small number; tap to read or write the note ---------- */

function FootnoteView({ node, updateAttributes, editor, deleteNode, selected }: ReactNodeViewProps) {
  const text = String(node.attrs.text ?? "");
  const [open, setOpen] = useState(editor.isEditable && !text);
  const ref = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  // Keep the popup inside the screen
  useLayoutEffect(() => {
    const el = pop.current;
    if (!open || !el) return;
    el.style.marginLeft = "0px";
    const r = el.getBoundingClientRect();
    const pad = 12;
    const shift = r.right > window.innerWidth - pad ? window.innerWidth - pad - r.right : r.left < pad ? pad - r.left : 0;
    el.style.marginLeft = `${shift}px`;
  }, [open]);
  // Tapping anywhere else closes the popup
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as globalThis.Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  return (
    <NodeViewWrapper as="span" ref={ref} className={`fn ${selected ? "fn-selected" : ""}`}>
      <button type="button" className="fn-ref" aria-label="Footnote" onClick={() => setOpen(!open)} contentEditable={false} />
      {open && (
        <span ref={pop} className="fn-pop" contentEditable={false}>
          {editor.isEditable ? (
            <>
              <textarea
                autoFocus
                rows={3}
                value={text}
                placeholder="Footnote: a source, an aside, a thought"
                aria-label="Footnote text"
                onChange={(e) => updateAttributes({ text: e.target.value })}
              />
              <span className="fn-pop-actions">
                <button type="button" onClick={() => deleteNode()} className="text-[#8b0000]">
                  Remove
                </button>
                <button type="button" onClick={() => setOpen(false)} className="font-bold">
                  Done
                </button>
              </span>
            </>
          ) : (
            <>
              <span className="block">{text || "Empty footnote"}</span>
              <button type="button" className="fn-close" aria-label="Close" onClick={() => setOpen(false)}>
                <X size={14} />
              </button>
            </>
          )}
        </span>
      )}
    </NodeViewWrapper>
  );
}

export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { text: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-footnote]", getAttrs: (el) => ({ text: (el as HTMLElement).getAttribute("data-text") ?? "" }) }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-footnote": "", "data-text": node.attrs.text })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FootnoteView);
  },
});

/* ---------- Chart: a real chart with a simple form for its numbers ---------- */

type ChartAttrs = { chartType: "line" | "bar"; title: string; unit: string; points: { key: string; value: number }[] };

function ChartView({ node, updateAttributes, editor, deleteNode }: ReactNodeViewProps) {
  const a = node.attrs as ChartAttrs;
  const [editing, setEditing] = useState(editor.isEditable && a.points.every((p) => !p.key));
  const spec: ChartSpec = {
    type: a.chartType,
    title: a.title || undefined,
    unit: a.unit || undefined,
    points: a.points.filter((p) => p.key.trim()),
  };
  const setPoint = (i: number, patch: Partial<ChartAttrs["points"][number]>) =>
    updateAttributes({ points: a.points.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <NodeViewWrapper className="chart-node" contentEditable={false}>
      {spec.points.length ? (
        <ChartBlock spec={spec} />
      ) : (
        <div className="rounded-lg border-[1.5px] border-dashed border-[#bbb] px-4 py-6 text-center font-mono text-[12px] text-[#888]">
          Add some numbers below to draw the chart
        </div>
      )}
      {editor.isEditable && !editing && (
        <div className="mt-1.5 flex gap-2">
          <button type="button" className="chip-btn" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Edit chart
          </button>
          <button type="button" className="chip-btn text-[#8b0000]" onClick={() => deleteNode()}>
            <Trash2 size={13} /> Remove
          </button>
        </div>
      )}
      {editor.isEditable && editing && (
        <div className="chart-form">
          <input value={a.title} placeholder="Chart title" aria-label="Chart title" onChange={(e) => updateAttributes({ title: e.target.value })} />
          <div className="flex gap-2">
            <input value={a.unit} placeholder="Unit (optional)" aria-label="Unit" onChange={(e) => updateAttributes({ unit: e.target.value })} />
            <div className="seg">
              {(["line", "bar"] as const).map((t) => (
                <button key={t} type="button" aria-pressed={a.chartType === t} onClick={() => updateAttributes({ chartType: t })}>
                  {t === "line" ? "Line" : "Bars"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            {a.points.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input value={p.key} placeholder={i === 0 ? "Label, e.g. 2026" : "Label"} aria-label={`Label ${i + 1}`} onChange={(e) => setPoint(i, { key: e.target.value })} />
                <input
                  className="w-28 shrink-0"
                  inputMode="decimal"
                  value={Number.isFinite(p.value) ? String(p.value) : ""}
                  placeholder="Value"
                  aria-label={`Value ${i + 1}`}
                  onChange={(e) => setPoint(i, { value: Number(e.target.value.replace(/[,$%\s]/g, "")) || 0 })}
                />
                <button type="button" className="block-icon-btn" aria-label="Remove row" onClick={() => updateAttributes({ points: a.points.filter((_, j) => j !== i) })}>
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2">
            <button type="button" className="chip-btn" onClick={() => updateAttributes({ points: [...a.points, { key: "", value: 0 }] })}>
              <Plus size={13} /> Add row
            </button>
            <button type="button" className="chip-btn bg-[#111] text-[#fffff8]" onClick={() => setEditing(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const Chart = Node.create({
  name: "chart",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      chartType: { default: "line" },
      title: { default: "" },
      unit: { default: "" },
      points: { default: [{ key: "", value: 0 }, { key: "", value: 0 }] },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-chart]",
        getAttrs: (el) => {
          try {
            return JSON.parse((el as HTMLElement).getAttribute("data-spec") ?? "{}");
          } catch {
            return {};
          }
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-chart": "", "data-spec": JSON.stringify(node.attrs) })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ChartView);
  },
});

/* ---------- Link to another note ---------- */

function NoteLinkView({ node, editor, selected }: ReactNodeViewProps) {
  const { notes, openNote } = useNotesContext();
  const title = String(node.attrs.title ?? "");
  const exists = Boolean(findNote(notes, title));
  return (
    <NodeViewWrapper as="span" className={`note-link ${exists ? "" : "note-link-missing"} ${selected ? "note-link-selected" : ""}`}>
      <span
        role="link"
        tabIndex={editor.isEditable ? -1 : 0}
        onClick={() => !editor.isEditable && openNote(title)}
        onKeyDown={(e) => e.key === "Enter" && !editor.isEditable && openNote(title)}
        title={exists ? title : `${title} (not written yet)`}
      >
        {title}
      </span>
    </NodeViewWrapper>
  );
}

export const NoteLink = Node.create({
  name: "noteLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { title: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-note-link]", getAttrs: (el) => ({ title: (el as HTMLElement).getAttribute("data-note-link") ?? "" }) }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-note-link": node.attrs.title }), node.attrs.title];
  },
  renderText({ node }) {
    return String(node.attrs.title ?? "");
  },
  addNodeView() {
    return ReactNodeViewRenderer(NoteLinkView);
  },
});
