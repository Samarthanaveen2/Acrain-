"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { Note } from "@/lib/notes";
import {
  addLayer,
  alsoIn,
  children,
  inLens,
  LENSES,
  lensReadout,
  MARGIN_COLOUR,
  removeLayer,
  THREAT_COLOUR,
  THREAT_LABEL,
  top,
  updateLayer,
  type Layer,
  type Lens,
  type Stack,
} from "@/lib/stacks";
import LayerSheet from "./LayerSheet";

/** The colour a layer takes under a lens (null = not lit) */
function lensColour(l: Layer, lens: Lens): string | null {
  if (lens === "money") return l.margin ? MARGIN_COLOUR[l.margin] : null;
  if (lens === "choke") return l.choke ? "#8b0000" : null;
  if (lens === "eaten") return l.threat && l.threat !== "safe" ? THREAT_COLOUR[l.threat] : null;
  if (lens === "plug") return l.plugIn ? "var(--path-b)" : null;
  return null;
}

/** A stack drawn as connected layers: the thing on top, everything it sits on branching below */
export default function StackView({
  stack: saved,
  stacks,
  notes,
  focus,
  onSave,
  onDelete,
  onBack,
}: {
  stack: Stack;
  stacks: Stack[];
  notes: Note[];
  /** A layer to scroll to and flash (coming from "also in…") */
  focus?: string | null;
  onSave: (s: Stack) => Promise<void>;
  onDelete: () => Promise<void>;
  onBack?: () => void;
}) {
  // Edits happen here and are saved shortly after you stop
  const [stack, setStack] = useState(saved);
  const [lens, setLens] = useState<Lens>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(focus ?? null);
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
  // Leaving the screen saves anything not yet saved
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current) saveRef.current(pending.current);
    },
    [],
  );

  // Coming from another stack: show the shared layer
  useEffect(() => {
    if (!focus) return;
    requestAnimationFrame(() => document.getElementById(`layer-${focus}`)?.scrollIntoView({ block: "center" }));
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [focus]);

  const root = top(stack);
  const readout = lensReadout(stack, lens);
  const lensInfo = LENSES.find((l) => l.key === lens)!;
  const openLayer = stack.layers.find((l) => l.id === open);

  const addUnder = (parent: string) => {
    const { stack: next, id } = addLayer(stack, parent, "");
    setCollapsed((c) => {
      const n = new Set(c);
      n.delete(parent);
      return n;
    });
    change(next);
    setOpen(id);
  };

  const closeSheet = () => {
    // A layer left without a name wasn't really added
    if (openLayer && !openLayer.name.trim() && openLayer.parent) change(removeLayer(stack, openLayer.id));
    setOpen(null);
  };

  const renderLayer = (l: Layer, isLast: boolean) => {
    const kids = children(stack, l.id);
    const shut = collapsed.has(l.id);
    const colour = lensColour(l, lens);
    const dim = lens !== "all" && !inLens(l, lens);
    const shared = alsoIn(stacks, stack, l);
    const isTop = !l.parent;
    return (
      <li
        key={l.id}
        id={`layer-${l.id}`}
        className={`stack-node ${isTop ? "stack-top" : ""} ${isLast ? "stack-last" : ""}`}
        style={{ ["--line" as string]: colour ?? "#b9b9ae" }}
      >
        <div className={`stack-row ${dim ? "opacity-35" : ""} ${flash === l.id ? "stack-flash" : ""}`}>
          <span
            className="stack-dot"
            style={{
              background: colour ?? (isTop ? "#111" : "#fffff8"),
              borderColor: colour ?? "#111",
              width: lens === "money" && l.margin ? { thin: 9, medium: 13, fat: 17 }[l.margin] : undefined,
              height: lens === "money" && l.margin ? { thin: 9, medium: 13, fat: 17 }[l.margin] : undefined,
              boxShadow: lens === "choke" && l.choke ? "0 0 0 3px #fffff8, 0 0 0 5px #8b0000" : undefined,
            }}
          />
          <button type="button" onClick={() => setOpen(l.id)} className="min-w-0 flex-1 text-left">
            <span className={`block leading-tight ${isTop ? "text-[2rem]" : "text-[1.45rem]"} ${l.name ? "" : "text-[#999] italic"}`}>
              {l.name || "Untitled layer"}
            </span>
            {l.how && <span className="mt-0.5 block text-[1.12rem] leading-snug text-[#666]">{l.how}</span>}
            <LayerMarks layer={l} lens={lens} />
            {shared.length > 0 && (
              <span className="mt-1 block font-mono text-[10.5px] text-[var(--path-b)]">
                also in{" "}
                {shared.map((s, i) => (
                  <span key={s.stack.id}>
                    {i > 0 && ", "}
                    <Link
                      href={`/stacks/${s.stack.id}?focus=${s.layer.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="underline decoration-dotted underline-offset-2"
                    >
                      {s.stack.title}
                    </Link>
                  </span>
                ))}
              </span>
            )}
          </button>
          {kids.length > 0 ? (
            <button
              type="button"
              aria-label={shut ? `Show what ${l.name} sits on` : `Hide what ${l.name} sits on`}
              aria-expanded={!shut}
              onClick={() =>
                setCollapsed((c) => {
                  const n = new Set(c);
                  if (n.has(l.id)) n.delete(l.id);
                  else n.add(l.id);
                  return n;
                })
              }
              className="stack-chevron"
            >
              {shut ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : null}
          <button type="button" aria-label={`Add a layer under ${l.name || "this"}`} onClick={() => addUnder(l.id)} className="stack-add">
            <Plus size={15} />
          </button>
        </div>
        {kids.length > 0 && !shut && <ul className="stack-children">{kids.map((k, i) => renderLayer(k, i === kids.length - 1))}</ul>}
        {kids.length > 0 && shut && (
          <p className="stack-hidden font-mono text-[10.5px] text-[#999]">
            {kids.length} more {kids.length === 1 ? "layer" : "layers"} underneath
          </p>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-[700px] px-4 pb-10">
      <header className="flex items-start gap-3 pt-2 pb-4">
        <div className="min-w-0 flex-1">
          {onBack && (
            <button type="button" onClick={onBack} className="mb-2 font-mono text-[12px] text-[#777]">
              ‹ Stacks
            </button>
          )}
          <h1 className="text-[3rem] leading-[1.02]">{stack.title}</h1>
          <p className="mt-1 font-mono text-[11px] text-[#777]">
            {stack.layers.length} {stack.layers.length === 1 ? "layer" : "layers"}
          </p>
        </div>
      </header>

      <div role="group" aria-label="Lens" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {LENSES.map((l) => (
          <button
            key={l.key}
            type="button"
            aria-pressed={lens === l.key}
            onClick={() => setLens(l.key)}
            className={`shrink-0 rounded-full border px-3 py-0.5 text-[1.15rem] whitespace-nowrap ${
              lens === l.key ? "border-[#111] bg-[#111] text-[#fffff8]" : "border-[#111]/30"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      {lens !== "all" && (
        <p className="mt-3 border-l-2 border-[#111] pl-3 text-[1.2rem] leading-snug">
          {readout || <span className="text-[#777] italic">{lensInfo.question} Tap a layer to mark it.</span>}
        </p>
      )}

      {root && <ul className="stack-tree mt-5">{renderLayer(root, true)}</ul>}

      {stack.layers.length === 1 && (
        <p className="mt-4 max-w-[34rem] text-[1.2rem] leading-snug text-[#777] italic">
          What does {stack.title} sit on? Tap ＋ to add the layers underneath it, then the layers under those, all the way down.
        </p>
      )}

      {openLayer && (
        <LayerSheet
          key={openLayer.id}
          layer={openLayer}
          stack={stack}
          notes={notes}
          onChange={(patch) => {
            const next = updateLayer(stack, openLayer.id, patch);
            change(!openLayer.parent && patch.name !== undefined && patch.name.trim() ? { ...next, title: patch.name.trim() } : next);
          }}
          onAddUnder={() => addUnder(openLayer.id)}
          onDelete={async () => {
            if (!openLayer.parent) {
              setOpen(null);
              clearTimeout(timer.current);
              pending.current = null;
              await onDelete();
              return;
            }
            change(removeLayer(stack, openLayer.id));
            setOpen(null);
          }}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}

/** Small marks under a layer's name: what you've noted about it */
function LayerMarks({ layer: l, lens }: { layer: Layer; lens: Lens }) {
  const marks: { text: string; colour: string }[] = [];
  if (l.margin && (lens === "all" || lens === "money")) marks.push({ text: `${l.margin} margin`, colour: MARGIN_COLOUR[l.margin] });
  if (l.choke && (lens === "all" || lens === "choke")) marks.push({ text: "chokepoint", colour: "#8b0000" });
  if (l.threat && l.threat !== "safe" && (lens === "all" || lens === "eaten"))
    marks.push({ text: `${THREAT_LABEL[l.threat].toLowerCase()}${l.threatBy ? ` by ${l.threatBy}` : ""}`, colour: THREAT_COLOUR[l.threat] });
  if (l.plugIn && (lens === "all" || lens === "plug")) marks.push({ text: `I could enter${l.plugHow ? `: ${l.plugHow}` : ""}`, colour: "var(--path-b)" });
  if (l.players && (lens === "all" || lens === "choke")) marks.push({ text: l.players, colour: "#777" });
  if (!marks.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono text-[10.5px]">
      {marks.map((m) => (
        <span key={m.text} style={{ color: m.colour }}>
          {m.text}
        </span>
      ))}
    </span>
  );
}
