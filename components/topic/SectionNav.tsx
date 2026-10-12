"use client";

import { useEffect, useState } from "react";

/**
 * ai-2027's left-edge timeline: a line that fills as you read, a dot for each
 * chapter placed where it sits in the page, and labels that appear on hover.
 */
export default function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [pos, setPos] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      setPos(
        items.map((it) => {
          const el = document.getElementById(it.id);
          return el ? clamp((el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5) / max) : 0;
        }),
      );
      setProgress(clamp(window.scrollY / max));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  const shown = progress > 0.01;
  return (
    <nav
      aria-label="Chapters"
      className={`group sticky top-2 h-[calc(100vh-30px)] transition-opacity duration-700 ${shown ? "opacity-100" : "opacity-0"}`}
    >
      <div className="absolute top-0 left-[4px] w-[2px] bg-[#111]" style={{ height: `${progress * 100}%` }} />
      {items.map((it, i) => {
        const passed = (pos[i] ?? 1) <= progress + 0.002;
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            className="absolute left-0 flex -translate-y-1/2 items-center gap-2.5 no-underline"
            style={{ top: `${(pos[i] ?? 0) * 100}%` }}
          >
            <span className={`h-[10px] w-[10px] rounded-full border-[1.5px] border-[#111] ${passed ? "bg-[#111]" : "bg-background"}`} />
            <span className="text-[1.15rem] whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {it.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
