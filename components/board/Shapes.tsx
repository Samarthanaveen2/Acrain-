"use client";

import { useEffect, useRef } from "react";
import { NotebookPen } from "lucide-react";
import { PAINT, STICKY, TEXT_SIZE, type Framed, type Shape } from "@/lib/board";

const CORNERS = ["nw", "ne", "sw", "se"] as const;
export type Corner = (typeof CORNERS)[number];

/** Boxes, stickies and text, drawn as HTML so ET Book wraps nicely */
export default function Shapes({
  shapes,
  selected,
  editing,
  k,
  snapped,
  onText,
  onEditEnd,
  onMeasure,
  onOpenNote,
}: {
  shapes: Shape[];
  selected: string | null;
  editing: string | null;
  /** Camera zoom, to keep handles a steady size on screen */
  k: number;
  /** A box that just clicked into a stack (for a little bump) */
  snapped: string | null;
  onText: (id: string, text: string) => void;
  onEditEnd: () => void;
  /** Text grows with what's written; tell the board its real height */
  onMeasure: (id: string, h: number) => void;
  onOpenNote: (title: string) => void;
}) {
  return (
    <>
      {shapes.map((s) =>
        s.type === "box" || s.type === "sticky" || s.type === "text" ? (
          <FramedShape
            key={s.id}
            s={s}
            on={selected === s.id}
            edit={editing === s.id}
            k={k}
            bump={snapped === s.id}
            onText={onText}
            onEditEnd={onEditEnd}
            onMeasure={onMeasure}
            onOpenNote={onOpenNote}
          />
        ) : null,
      )}
    </>
  );
}

function FramedShape({
  s,
  on,
  edit,
  k,
  bump,
  onText,
  onEditEnd,
  onMeasure,
  onOpenNote,
}: {
  s: Framed;
  on: boolean;
  edit: boolean;
  k: number;
  bump: boolean;
  onText: (id: string, text: string) => void;
  onEditEnd: () => void;
  onMeasure: (id: string, h: number) => void;
  onOpenNote: (title: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  // Text shapes are as tall as their words
  useEffect(() => {
    if (s.type !== "text" || !el.current) return;
    const h = el.current.offsetHeight;
    if (Math.abs(h - s.h) > 1) onMeasure(s.id, h);
  });

  useEffect(() => {
    if (!edit || !area.current) return;
    const a = area.current;
    a.focus({ preventScroll: true });
    a.setSelectionRange(a.value.length, a.value.length);
  }, [edit]);

  const style: React.CSSProperties = { left: s.x, top: s.y, width: s.w };
  let cls = "bd-shape";
  if (s.type === "box") {
    const p = PAINT[s.colour];
    Object.assign(style, {
      height: s.h,
      background: p.fill,
      color: p.text,
      borderColor: p.edge,
      boxShadow: `0 7px 0 -1.5px ${p.side}, 0 7px 0 0 ${p.edge}`,
    });
    cls += " bd-box";
  } else if (s.type === "sticky") {
    Object.assign(style, { height: s.h, background: STICKY[s.colour], color: s.colour === "ink" ? "#fffff8" : "#1d1b12" });
    cls += " bd-sticky";
  } else {
    Object.assign(style, { fontSize: TEXT_SIZE[s.size] });
    cls += " bd-text";
  }
  if (bump) cls += " bd-bump";

  const text = s.text;
  const placeholder = s.type === "box" ? "" : s.type === "sticky" ? "" : "Text";
  const hs = 13 / k; // handle size on screen ≈ 13px

  return (
    <div ref={el} data-shape={s.id} className={cls} style={style}>
      {edit ? (
        <textarea
          ref={area}
          aria-label="Write"
          value={text}
          placeholder={placeholder}
          onChange={(e) => onText(s.id, e.target.value)}
          onBlur={onEditEnd}
          onPointerDown={(e) => e.stopPropagation()}
          className="bd-edit"
          rows={s.type === "text" ? Math.max(1, text.split("\n").length) : undefined}
        />
      ) : (
        <span className={`bd-words ${text ? "" : "bd-empty"}`}>{text || (s.type === "text" ? "Text" : "")}</span>
      )}
      {s.type === "box" && s.note && !edit && (
        <button
          type="button"
          aria-label={`Open note ${s.note}`}
          className="bd-note"
          style={{ width: 22 / Math.max(k, 0.6), height: 22 / Math.max(k, 0.6) }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenNote(s.note!);
          }}
        >
          <NotebookPen size={12} />
        </button>
      )}
      {on && !edit && (
        <>
          <span className="bd-outline" style={{ inset: -5 / k, borderWidth: 1.5 / k, borderRadius: 9 / k }} />
          {CORNERS.map((c) => (
            <span
              key={c}
              data-handle={c}
              className="bd-handle"
              style={{
                width: hs,
                height: hs,
                borderWidth: 1.5 / k,
                left: c.endsWith("w") ? -hs / 2 - 5 / k : undefined,
                right: c.endsWith("e") ? -hs / 2 - 5 / k : undefined,
                top: c.startsWith("n") ? -hs / 2 - 5 / k : undefined,
                bottom: c.startsWith("s") ? -hs / 2 - 5 / k : undefined,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
