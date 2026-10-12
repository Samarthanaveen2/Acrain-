"use client";

import { parseMonth } from "@/lib/dates";
import { Icon } from "@/lib/icons";
import type { DashboardDef } from "@/lib/types";

/** ai-2027's "Currently Exists / Emerging Tech / Science Fiction" row of small squares */
export default function TechBuckets({ def, now }: { def: NonNullable<DashboardDef["tech"]>; now: number }) {
  const stage = (it: (typeof def.items)[number]) =>
    it.exists && parseMonth(it.exists).t <= now ? 0 : it.emerging && parseMonth(it.emerging).t <= now ? 1 : 2;
  const groups = [0, 1, 2].map((g) => def.items.filter((it) => stage(it) === g));
  const align = ["justify-start", "justify-center", "justify-end"];

  return (
    <div className="grid grid-cols-[2fr_1.4fr_2fr] gap-x-2">
      {def.buckets.map((name, g) => (
        <div key={name} className={g === 1 ? "text-center" : g === 2 ? "text-right" : ""}>
          <div className={`font-mono text-[9.5px] whitespace-nowrap ${g === 1 ? "text-accent" : "text-[#111]"}`}>{name}</div>
          <div className={`mt-1 flex flex-wrap gap-[2px] ${align[g]}`}>
            {groups[g].map((it) => (
              <span
                key={it.key}
                title={it.label}
                className="flex h-[12px] w-[12px] items-center justify-center rounded-[3px] transition-colors duration-500"
                style={{ background: g === 1 ? "var(--accent)" : "#111" }}
              >
                <Icon name={it.icon} size={8} strokeWidth={2.75} className="text-[#fffff8]" />
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
