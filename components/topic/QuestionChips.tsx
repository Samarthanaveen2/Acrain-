"use client";

import { useState } from "react";

/** ai-2027's tab boxes: outlined buttons; clicking one opens its answer underneath, clicking again closes it */
export default function QuestionChips({ questions }: { questions: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!questions.length) return null;
  return (
    <div className="mt-7">
      <div className="flex flex-wrap gap-2" role="tablist">
        {questions.map((item, i) => (
          <button
            key={item.q}
            type="button"
            role="tab"
            aria-selected={open === i}
            onClick={() => setOpen(open === i ? null : i)}
            className={`rounded-md border-[1.5px] border-[#111] px-2 py-1 text-start text-[1.2rem] whitespace-nowrap transition-colors ${
              open === i ? "bg-[#111] text-background" : "hover:bg-[#111]/5"
            }`}
          >
            {item.q}
          </button>
        ))}
      </div>
      {open !== null && (
        <div role="tabpanel" className="prose-acrain mt-4">
          <p className="animate-[details-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">{questions[open].a}</p>
        </div>
      )}
    </div>
  );
}
