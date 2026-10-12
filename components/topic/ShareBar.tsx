"use client";

import type { ShareDef } from "@/lib/types";

// Accent first, then quiet tones that read on #fffff8
const COLORS = ["var(--accent)", "#31566f", "#c77400", "#8a8a80", "#c9c9bd"];

export default function ShareBar({ def, values }: { def: ShareDef; values: Record<string, number> }) {
  const total = def.parts.reduce((s, p) => s + (values[p.key] ?? 0), 0) || 1;
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-sm" role="img" aria-label={def.label}>
        {def.parts.map((p, i) => (
          <div
            key={p.key}
            className="h-full transition-all duration-500 ease-in-out"
            style={{ width: `${((values[p.key] ?? 0) / total) * 100}%`, background: COLORS[i % COLORS.length] }}
          />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px] leading-snug">
        {def.parts.map((p, i) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate">{p.label}</span>
            <span className="ml-auto font-mono tabular-nums text-dull">
              {Math.round(((values[p.key] ?? 0) / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
