"use client";

import { Icon } from "@/lib/icons";
import type { CapabilitiesDef } from "@/lib/types";

const TILE = 31;
const BAR_MAX = 52;

/**
 * ai-2027's "AI Capabilities" grid. Values are on a "1 = top human expert" scale:
 * 0 → 0.3 fills a black tile from the left, the tile turns green at 1,
 * and 1 → 3 pushes a green bar out behind the label.
 */
export default function Capabilities({ def, values }: { def: CapabilitiesDef; values: Record<string, number> }) {
  return (
    <div className="flex items-stretch gap-2">
      <div
        className="shrink-0 self-center font-mono text-[11px] tracking-[0.04em] text-[#111]"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontVariant: "small-caps" }}
      >
        {def.label}
      </div>
      <div className="grid flex-1 grid-cols-2 gap-x-2 gap-y-[11px]">
        {def.items.map((item) => {
          const v = Math.max(0, values[item.key] ?? 0);
          const first = Math.min(v / 0.3, 1);
          const second = Math.min(1, Math.max(0, (v - 1) / 2));
          const tileW = 3 + first * (TILE - 3);
          const done = v >= 1;
          return (
            <div key={item.key} className="relative flex h-[23px] items-center" title={`${item.label}: ${v.toFixed(2)}× a top human expert`}>
              <div
                className="absolute top-0 left-0 h-full rounded-[4px]"
                style={{ width: tileW, background: done ? "var(--accent)" : "#111" }}
              />
              {second > 0 && (
                <div
                  className="absolute top-0 h-full rounded-r-[3px]"
                  style={{ left: TILE + 2, width: second * BAR_MAX, background: "var(--accent)" }}
                />
              )}
              {/* On a partly filled tile, white + difference blend reads white over the tile and near-black over the page */}
              <span className={`relative flex w-[31px] justify-center ${!done && first < 1 ? "mix-blend-difference" : ""}`}>
                <Icon name={item.icon} size={13} strokeWidth={2} className="text-white" />
              </span>
              <span className="relative ml-[5px] truncate font-mono text-[10px] tracking-[0.14em] text-[#111]">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
