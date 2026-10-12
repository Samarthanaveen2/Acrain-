"use client";

import { useState } from "react";

/** ai-2040-style question chips: pick one, its answer shows underneath */
export default function QuestionChips({ questions }: { questions: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  if (!questions.length) return null;
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {questions.map((item, i) => (
          <button
            key={item.q}
            role="tab"
            aria-selected={open === i}
            onClick={() => setOpen(i)}
            className={`rounded-md border-[1.5px] px-2.5 py-0.5 text-[1.02rem] transition-colors ${
              open === i
                ? "border-accent bg-accent text-background"
                : "border-rule bg-transparent hover:border-accent hover:text-accent"
            }`}
          >
            {item.q}
          </button>
        ))}
      </div>
      <p role="tabpanel" className="mt-3 max-w-[38rem] text-[1.1rem] leading-relaxed">
        {questions[open].a}
      </p>
    </div>
  );
}
