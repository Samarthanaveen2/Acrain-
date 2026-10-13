"use client";

import { useEffect, useRef, useState } from "react";
import type { Note } from "@/lib/notes";
import { addLayer, addSibling, depthOf, pathTo, removeLayer, top, updateLayer, type Stack } from "@/lib/stacks";
import LayerWriter from "./LayerWriter";
import SlabPanel from "./SlabPanel";
import Tower from "./Tower";

const ROWS = 4;

/** One stack, as a tower of slabs. Tap a slab to open it; go inside a slab when the tower gets deep. */
export default function StackView({
  stack: saved,
  notes,
  focus,
  onSave,
  onDelete,
  onBack,
}: {
  stack: Stack;
  stacks: Stack[];
  notes: Note[];
  /** A layer to show and open (coming from another stack or a note) */
  focus?: string | null;
  onSave: (s: Stack) => Promise<void>;
  onDelete: () => Promise<void>;
  onBack?: () => void;
}) {
  // Edits happen here and are saved shortly after you stop
  const [stack, setStack] = useState(saved);
  const pending = useRef<Stack | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  });
  const change = (next: Stack) => {
    setStack(next);
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (pending.current) saveRef.current(pending.current);
      pending.current = null;
    }, 600);
  };
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current) saveRef.current(pending.current);
    },
    [],
  );

  const topId = top(stack)?.id ?? "";
  // Which slab the tower starts from (you can go inside a slab), and which one is open
  const [view, setView] = useState(() => {
    if (!focus || !stack.layers.some((l) => l.id === focus)) return { root: topId, open: null as string | null };
    const path = pathTo(stack, focus);
    const root = path[Math.max(0, path.length - ROWS + 1)]?.id ?? topId;
    return { root, open: focus };
  });
  const root = stack.layers.some((l) => l.id === view.root) ? view.root : topId;
  const open = stack.layers.find((l) => l.id === view.open);
  const trail = pathTo(stack, root);

  // Keep the opened slab in sight above the panel
  useEffect(() => {
    if (!view.open) return;
    requestAnimationFrame(() => document.querySelector(`[data-slab="${view.open}"]`)?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" }));
  }, [view.open]);

  const [writing, setWriting] = useState(false);
  const openSlab = (id: string | null) => {
    setWriting(false);
    setView((v) => ({ ...v, open: id }));
  };

  const addUnder = (parent: string) => {
    const { stack: next, id } = addLayer(stack, parent, "");
    change(next);
    // Too deep to show from here: step inside just far enough to see it on the bottom row
    const depth = depthOf(next, id) - depthOf(next, root);
    setView({ root: depth >= ROWS ? pathTo(next, id)[depthOf(next, id) - ROWS + 1].id : root, open: id });
  };

  const close = () => {
    // A slab left without a name wasn't really added
    if (open && !open.name.trim() && open.parent) change(removeLayer(stack, open.id));
    openSlab(null);
  };

  return (
    <div className="mx-auto max-w-[900px] px-4 pb-10">
      <header className="pt-2 pb-3">
        {onBack && (
          <button type="button" onClick={onBack} className="mb-2 font-mono text-[12px] text-[#777]">
            ‹ Stacks
          </button>
        )}
        <h1 className="text-[3rem] leading-[1.02]">{stack.title}</h1>
        <p className="mt-1 font-mono text-[11px] text-[#777]">
          {stack.layers.length} {stack.layers.length === 1 ? "layer" : "layers"}
        </p>
      </header>

      {trail.length > 1 && (
        <nav aria-label="Inside" className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[1.15rem]">
          {trail.map((l, i) => (
            <span key={l.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#aaa]">›</span>}
              {i < trail.length - 1 ? (
                <button type="button" onClick={() => setView({ root: l.id, open: null })} className="text-[var(--path-b)] underline decoration-dotted underline-offset-2">
                  {l.name || "Untitled"}
                </button>
              ) : (
                <span className="font-semibold">{l.name || "Untitled"}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {root && <Tower stack={stack} rootId={root} selected={view.open} onTap={(id) => openSlab(view.open === id ? null : id)} onGhost={addUnder} />}

      {stack.layers.length === 1 && (
        <p className="mt-2 max-w-[34rem] text-[1.2rem] leading-snug text-[#777] italic">
          What does {stack.title} sit on? Tap the empty slab underneath to add it, then keep going down.
        </p>
      )}

      {open && (
        <SlabPanel
          key={open.id}
          layer={open}
          stack={stack}
          notes={notes}
          onChange={(patch) => {
            const next = updateLayer(stack, open.id, patch);
            change(!open.parent && patch.name !== undefined && patch.name.trim() ? { ...next, title: patch.name.trim() } : next);
          }}
          onAddUnder={() => addUnder(open.id)}
          onSplit={() => {
            const { stack: next, id } = addSibling(stack, open.id, "");
            change(next);
            openSlab(id);
          }}
          onGoInside={() => setView({ root: open.id, open: null })}
          onWrite={() => setWriting(true)}
          onDelete={async () => {
            if (!open.parent) {
              openSlab(null);
              clearTimeout(timer.current);
              pending.current = null;
              await onDelete();
              return;
            }
            const parent = open.parent;
            change(removeLayer(stack, open.id));
            setView((v) => ({ root: v.root === open.id || removeLayer(stack, open.id).layers.every((l) => l.id !== v.root) ? parent : v.root, open: null }));
          }}
          onClose={close}
        />
      )}
      {open && writing && (
        <LayerWriter layer={open} stack={stack} onChange={(how) => change(updateLayer(stack, open.id, { how }))} onClose={() => setWriting(false)} />
      )}
    </div>
  );
}
