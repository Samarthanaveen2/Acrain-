"use client";

import { useState } from "react";
import { ArrowDownToLine, BringToFront, Copy, PenLine, SendToBack, Trash2 } from "lucide-react";
import { COLOURS, PAINT, STICKY, type Colour, type Shape } from "@/lib/board";

/** Small floating bar above whatever is selected */
export default function ShapeBar({
  shape,
  left,
  top,
  onColour,
  onSize,
  onUnder,
  onEdit,
  onDuplicate,
  onFront,
  onBack,
  onDelete,
}: {
  shape: Shape;
  /** Screen position (centre x, top y) */
  left: number;
  top: number;
  onColour: (c: Colour) => void;
  onSize: (s: "s" | "m" | "l") => void;
  onUnder: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onFront: () => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const [colours, setColours] = useState(false);
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  const colour = "colour" in shape && typeof shape.colour === "string" && shape.colour in PAINT ? (shape.colour as Colour) : null;
  const swatch = (c: Colour) => (shape.type === "sticky" ? STICKY[c] : PAINT[c].fill);

  return (
    <div className="bd-bar" style={{ left, top }} onPointerDown={stop} role="toolbar" aria-label="Selected">
      {colours && colour ? (
        <>
          {COLOURS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={c === colour}
              onClick={() => {
                onColour(c);
                setColours(false);
              }}
              className="bd-swatch"
              style={{ background: swatch(c), borderColor: c === colour ? "#111" : PAINT[c].edge }}
            />
          ))}
        </>
      ) : (
        <>
          {colour && (
            <button type="button" aria-label="Colour" onClick={() => setColours(true)} className="bd-btn">
              <span className="bd-swatch bd-swatch-sm" style={{ background: swatch(colour), borderColor: PAINT[colour].edge }} />
            </button>
          )}
          {shape.type === "text" &&
            (["s", "m", "l"] as const).map((z) => (
              <button
                key={z}
                type="button"
                aria-label={`Size ${z}`}
                aria-pressed={shape.size === z}
                onClick={() => onSize(z)}
                className={`bd-btn font-serif ${shape.size === z ? "bd-btn-on" : ""}`}
                style={{ fontSize: z === "s" ? 12 : z === "m" ? 15 : 19 }}
              >
                A
              </button>
            ))}
          {shape.type === "box" && (
            <button type="button" aria-label="Add a slab under" onClick={onUnder} className="bd-btn">
              <ArrowDownToLine size={17} />
            </button>
          )}
          {shape.type !== "ink" && (
            <button type="button" aria-label={shape.type === "arrow" ? "Label" : "Write"} onClick={onEdit} className="bd-btn">
              <PenLine size={17} />
            </button>
          )}
          {shape.type !== "ink" && shape.type !== "arrow" && (
            <button type="button" aria-label="Duplicate" onClick={onDuplicate} className="bd-btn">
              <Copy size={16} />
            </button>
          )}
          {shape.type !== "arrow" && (
            <>
              <button type="button" aria-label="Bring to front" onClick={onFront} className="bd-btn">
                <BringToFront size={17} />
              </button>
              <button type="button" aria-label="Send to back" onClick={onBack} className="bd-btn">
                <SendToBack size={17} />
              </button>
            </>
          )}
          <button type="button" aria-label="Delete" onClick={onDelete} className="bd-btn text-[#8b0000]">
            <Trash2 size={17} />
          </button>
        </>
      )}
    </div>
  );
}
