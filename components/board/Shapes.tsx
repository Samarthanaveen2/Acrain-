"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { NotebookPen } from "lucide-react";
import { PAINT, STICKY, TEXT_SIZE, type Framed, type Shape } from "@/lib/board";

const CORNERS = ["nw", "ne", "sw", "se"] as const;
export type Corner = (typeof CORNERS)[number];

/** Boxes, stickies and text, drawn as HTML so ET Book wraps nicely */
export default function Shapes({
  shapes,
  selected,
  editing,
  snapped,
  target = null,
  onText,
  onEditEnd,
  onMeasure,
  onOpenNote,
}: {
  shapes: Shape[];
  /** A shape a connection's end is hovering over */
  target?: string | null;
  selected: string | null;
  editing: string | null;
  /** A box that just clicked into a stack (for a little bump) */
  snapped: string | null;
  onText: (id: string, text: string) => void;
  onEditEnd: () => void;
  /** Text grows with what's written; tell the board its real height */
  onMeasure: (id: string, h: number) => void;
  onOpenNote: (title: string) => void;
}) {
  // The board hands over new functions every render; give the shapes stable ones so they only
  // redraw when they themselves change (zooming the canvas then redraws nothing)
  const cb = useRef({ onText, onEditEnd, onMeasure, onOpenNote });
  useEffect(() => {
    cb.current = { onText, onEditEnd, onMeasure, onOpenNote };
  });
  const stable = useMemo(
    () => ({
      onText: (id: string, t: string) => cb.current.onText(id, t),
      onEditEnd: () => cb.current.onEditEnd(),
      onMeasure: (id: string, h: number) => cb.current.onMeasure(id, h),
      onOpenNote: (t: string) => cb.current.onOpenNote(t),
    }),
    [],
  );
  return (
    <>
      {shapes.map((s) =>
        s.type === "box" || s.type === "sticky" || s.type === "text" ? (
          <FramedShape
            key={s.id}
            s={s}
            on={selected === s.id}
            edit={editing === s.id}
            bump={snapped === s.id}
            aim={target === s.id}
            onText={stable.onText}
            onEditEnd={stable.onEditEnd}
            onMeasure={stable.onMeasure}
            onOpenNote={stable.onOpenNote}
          />
        ) : null,
      )}
    </>
  );
}

const FramedShape = memo(function FramedShape({
  s,
  on,
  edit,
  bump,
  aim,
  onText,
  onEditEnd,
  onMeasure,
  onOpenNote,
}: {
  s: Framed;
  aim: boolean;
  on: boolean;
  edit: boolean;
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
  if (aim) cls += " bd-target";

  const text = s.text;
  const placeholder = s.type === "box" ? "" : s.type === "sticky" ? "" : "Text";
  // Sizes that stay the same on screen at any zoom: the world layer sets --k to the zoom level
  const px = (n: number) => `calc(${n}px / var(--k, 1))`;
  const hs = 13; // handle size on screen

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
          style={{ width: "calc(22px / max(var(--k, 1), 0.6))", height: "calc(22px / max(var(--k, 1), 0.6))" }}
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
          <span className="bd-outline" style={{ inset: px(-5), borderWidth: px(1.5), borderRadius: px(9) }} />
          {CORNERS.map((c) => (
            <span
              key={c}
              data-handle={c}
              className="bd-handle"
              style={{
                width: px(hs),
                height: px(hs),
                borderWidth: px(1.5),
                left: c.endsWith("w") ? px(-hs / 2 - 5) : undefined,
                right: c.endsWith("e") ? px(-hs / 2 - 5) : undefined,
                top: c.startsWith("n") ? px(-hs / 2 - 5) : undefined,
                bottom: c.startsWith("s") ? px(-hs / 2 - 5) : undefined,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
});
