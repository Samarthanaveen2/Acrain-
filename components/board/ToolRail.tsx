"use client";

import { useState } from "react";
import { ChevronRight, Eraser, MousePointer2, MoveUpRight, Pencil, RectangleHorizontal, StickyNote, Type, Wrench, type LucideIcon } from "lucide-react";
import { INKS } from "@/lib/board";

export type Tool = "select" | "box" | "sticky" | "text" | "connect" | "pen" | "eraser";
export type MakeTool = "box" | "sticky" | "text";

export const TOOLS: { key: Tool; label: string; icon: LucideIcon }[] = [
  { key: "select", label: "Select", icon: MousePointer2 },
  { key: "box", label: "Box", icon: RectangleHorizontal },
  { key: "sticky", label: "Sticky note", icon: StickyNote },
  { key: "text", label: "Text", icon: Type },
  { key: "connect", label: "Connect", icon: MoveUpRight },
  { key: "pen", label: "Pen", icon: Pencil },
  { key: "eraser", label: "Eraser", icon: Eraser },
];
export const INK_SIZES = [3.5, 9];

/** The tools, standing on the right edge where a thumb can reach */
export default function ToolRail({
  tool,
  onTool,
  ink,
  onInk,
}: {
  tool: Tool;
  onTool: (t: Tool) => void;
  ink: { colour: string; size: number };
  onInk: (ink: { colour: string; size: number }) => void;
}) {
  const [shut, setShut] = useState(false);
  if (shut)
    return (
      <button type="button" aria-label="Show tools" onClick={() => setShut(false)} className="bd-rail bd-rail-shut">
        <Wrench size={18} />
      </button>
    );
  return (
    <>
      <div role="toolbar" aria-label="Tools" aria-orientation="vertical" className="bd-rail">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-label={t.label}
            aria-pressed={tool === t.key}
            onClick={() => onTool(t.key)}
            className={`bd-tool ${tool === t.key ? "bd-tool-on" : ""}`}
          >
            <t.icon size={20} strokeWidth={1.8} />
            {t.key === "pen" && <span className="bd-ink-dot" style={{ background: ink.colour }} />}
          </button>
        ))}
        <button type="button" aria-label="Hide tools" onClick={() => setShut(true)} className="bd-tool h-8 text-[#999]">
          <ChevronRight size={16} />
        </button>
      </div>
      {tool === "pen" && (
        <div role="group" aria-label="Pen" className="bd-penbar">
          {INKS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Ink ${c}`}
              aria-pressed={ink.colour === c}
              onClick={() => onInk({ ...ink, colour: c })}
              className="bd-swatch"
              style={{ background: c, boxShadow: ink.colour === c ? "0 0 0 2px #fffff8, 0 0 0 3.5px #111" : undefined }}
            />
          ))}
          <span className="mx-1 h-6 w-px bg-[#111]/20" />
          {INK_SIZES.map((z, i) => (
            <button
              key={z}
              type="button"
              aria-label={i ? "Thick" : "Thin"}
              aria-pressed={ink.size === z}
              onClick={() => onInk({ ...ink, size: z })}
              className={`bd-btn ${ink.size === z ? "bd-btn-on" : ""}`}
            >
              <span className="block rounded-full bg-current" style={{ width: z + 3, height: z + 3 }} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
