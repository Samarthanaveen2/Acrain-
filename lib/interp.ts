import { useEffect, useRef, useState } from "react";
import { parseMonth } from "./dates";
import type { ChapterState } from "./types";

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** Smoothly animates a number toward `target` (cubic ease, ~0.8s). */
export function useTween(target: number, ms = 800) {
  const [value, setValue] = useState(target);
  const anim = useRef({ cur: target, raf: 0 });
  useEffect(() => {
    const a = anim.current;
    cancelAnimationFrame(a.raf);
    const from = a.cur;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const step = (now: number) => {
      const k = reduce ? 1 : Math.min(1, (now - start) / ms);
      a.cur = from + (target - from) * ease(k);
      setValue(a.cur);
      if (k < 1) a.raf = requestAnimationFrame(step);
    };
    a.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(a.raf);
  }, [target, ms]);
  return value;
}

function mix(a: Record<string, number>, b: Record<string, number>, f: number) {
  const out: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * f;
  return out;
}

/** Dashboard state at a fractional chapter position, e.g. 2.4 = 40% of the way from chapter 3 to 4 */
export function stateAt(states: ChapterState[], p: number) {
  const n = states.length;
  const i = Math.max(0, Math.min(n - 1, Math.floor(p)));
  const j = Math.min(n - 1, i + 1);
  const f = Math.max(0, Math.min(1, p - i));
  const a = states[i];
  const b = states[j];
  return {
    t: parseMonth(a.date).t + (parseMonth(b.date).t - parseMonth(a.date).t) * f,
    lines: mix(a.lines, b.lines, f),
    capabilities: mix(a.capabilities, b.capabilities, f),
    share: mix(a.share, b.share, f),
  };
}
