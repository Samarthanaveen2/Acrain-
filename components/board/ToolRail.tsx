"use client";

import { ChevronRight, MousePointer2, RectangleHorizontal, StickyNote, Type, Wrench, type LucideIcon } from "lucide-react";
import { useState } from "react";

export type Tool = "select" | "box" | "sticky" | "text";

export const TOOLS: { key: Tool; label: string; icon: LucideIcon }[] = [
  { key: "select", label: "Select", icon: MousePointer2 },
  { key: "box", label: "Box", icon: RectangleHorizontal },
  { key: "sticky", label: "Sticky note", icon: StickyNote },
  { key: "text", label: "Text", icon: Type },
];

/** The tools, standing on the right edge where a thumb can reach */
export default function ToolRail({ tool, onTool }: { tool: Tool; onTool: (t: Tool) => void }) {
  const [shut, setShut] = useState(false);
  if (shut)
    return (
      <button type="button" aria-label="Show tools" onClick={() => setShut(false)} className="bd-rail bd-rail-shut">
        <Wrench size={18} />
      </button>
    );
  return (
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
        </button>
      ))}
      <button type="button" aria-label="Hide tools" onClick={() => setShut(true)} className="bd-tool text-[#999]">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
