"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { pathTo, type Layer, type Stack } from "@/lib/stacks";

/** A whole page to write how one layer works: the same calm serif as your notes */
export default function LayerWriter({
  layer,
  stack,
  onChange,
  onClose,
}: {
  layer: Layer;
  stack: Stack;
  onChange: (how: string) => void;
  onClose: () => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  // Grow with the text so the page scrolls, not the box
  const fit = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    fit();
    const el = area.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const trail = pathTo(stack, layer.id)
    .slice(0, -1)
    .map((l) => l.name || "Untitled")
    .join(" › ");

  return (
    <div role="dialog" aria-label={`How ${layer.name} works`} className="fixed inset-0 z-50 overflow-y-auto bg-[#fffff8]">
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-[#fffff8]/95 px-3 pt-[calc(var(--safe-top)+0.5rem)] pb-2 backdrop-blur">
        <button type="button" onClick={onClose} className="flex items-center text-[1.25rem]">
          <ChevronLeft size={22} /> Back
        </button>
        <span className="min-w-0 flex-1 truncate text-center font-mono text-[11px] text-[#888]">{trail}</span>
        <button type="button" onClick={onClose} className="rounded-md bg-[#111] px-3 py-1 text-[1.2rem] text-[#fffff8]">
          Done
        </button>
      </div>
      <div className="mx-auto max-w-[700px] px-5 pt-4 pb-[40vh]">
        <p className="font-mono text-[11px] tracking-wide text-[#777] uppercase">How it works</p>
        <h1 className="mt-1 text-[3rem] leading-[1.05]">{layer.name || "Untitled"}</h1>
        <textarea
          ref={area}
          aria-label="How it works"
          value={layer.how ?? ""}
          onChange={(e) => {
            onChange(e.target.value);
            fit();
          }}
          placeholder="Who pays whom? What does this layer need? What would break it?"
          className="writer-area mt-5 block w-full resize-none overflow-hidden bg-transparent font-serif text-[1.6rem] leading-[1.55] outline-none placeholder:text-[#aaa] placeholder:italic"
          rows={6}
        />
      </div>
    </div>
  );
}
