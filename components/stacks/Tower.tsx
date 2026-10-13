"use client";

import { Plus } from "lucide-react";
import { towerRows, type Stack } from "@/lib/stacks";

const MIN_SLAB = 84; // px: below this, the tower gets wider and scrolls sideways

/** The stack as a physical tower: each slab sits on the slabs under it, as wide as what it holds up */
export default function Tower({
  stack,
  rootId,
  selected,
  onTap,
  onGhost,
}: {
  stack: Stack;
  rootId: string;
  selected: string | null;
  onTap: (id: string) => void;
  /** Tapped the empty spot under a layer */
  onGhost: (parentId: string) => void;
}) {
  const { rows, leaves } = towerRows(stack, rootId);
  return (
    <div className="tower-scroll -mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none]">
      <div className="tower" style={{ minWidth: `${leaves * MIN_SLAB}px` }}>
        {rows.map((row, d) => (
          <div key={d} className="tower-row">
            {row.slabs.map(({ layer, left, width, deeper }) => {
              const on = selected === layer.id;
              return (
                <button
                  key={layer.id}
                  type="button"
                  data-slab={layer.id}
                  onClick={() => onTap(layer.id)}
                  className={`slab ${d === 0 ? "slab-top" : ""} ${on ? "slab-lifted" : ""} ${selected && !on ? "slab-dim" : ""}`}
                  style={{ left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` }}
                >
                  <span className={`slab-name ${layer.name ? "" : "italic opacity-50"}`}>{layer.name || "Untitled"}</span>
                  {deeper > 0 && <span className="slab-deeper">+{deeper} deeper</span>}
                </button>
              );
            })}
            {row.ghosts.map((g) => (
              <button
                key={`ghost-${g.parent}`}
                type="button"
                aria-label={`Add what ${stack.layers.find((l) => l.id === g.parent)?.name || "this"} sits on`}
                onClick={() => onGhost(g.parent)}
                className="slab slab-ghost"
                style={{ left: `calc(${g.left}% + 2px)`, width: `calc(${g.width}% - 4px)` }}
              >
                <Plus size={15} className="shrink-0" />
                <span className="slab-ghost-text">what&rsquo;s under this?</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
