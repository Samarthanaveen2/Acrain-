"use client";

import { useState } from "react";
import { formatShort, parseShort } from "@/lib/numbers";

export const inputCls =
  "w-full rounded-md border-[1.5px] border-[#c9c9bf] bg-background px-2.5 py-1.5 text-[1.15rem] outline-none transition-colors focus:border-[#111]";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-mono text-[11px] tracking-wide text-[#666] uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block font-mono text-[11px] leading-snug text-[#888]">{hint}</span>}
    </label>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="border-b border-[#666]/30 pb-1.5">
      <h3 className="text-[1.5rem] leading-tight">{children}</h3>
      {hint && <p className="font-mono text-[11px] text-[#888]">{hint}</p>}
    </div>
  );
}

/**
 * Number box that understands shorthand: 47B, 1.2T, 20K, -25%.
 * Remount it (key) when the record it edits changes.
 */
export function ShortNumber({
  value,
  onChange,
  prefix,
  suffix,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  ariaLabel: string;
}) {
  const [text, setText] = useState(formatShort(value ?? 0));
  const bad = text.trim() !== "" && Number.isNaN(parseShort(text));
  return (
    <span className={`flex items-center rounded-md border-[1.5px] bg-background px-2 ${bad ? "border-[#c77400]" : "border-[#c9c9bf] focus-within:border-[#111]"}`}>
      {prefix && <span className="font-mono text-[13px] text-[#888]">{prefix}</span>}
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseShort(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        onBlur={() => !bad && setText(formatShort(value ?? 0))}
        className="w-full min-w-0 bg-transparent py-1.5 font-mono text-[14px] outline-none"
      />
      {suffix && <span className="font-mono text-[13px] whitespace-nowrap text-[#888]">{suffix}</span>}
    </span>
  );
}
