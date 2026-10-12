"use client";

import NumberFlow from "@number-flow/react";
import { parseMonth } from "@/lib/dates";
import type { ChapterState, DashboardDef, MetricDef } from "@/lib/types";
import LevelChart from "./LevelChart";
import ShareBar from "./ShareBar";

function Metric({ def, value, compact = false }: { def: MetricDef; value: number; compact?: boolean }) {
  return (
    <NumberFlow
      value={value ?? 0}
      prefix={def.format === "currency" ? "$" : undefined}
      suffix={def.format === "percent" ? "%" : def.suffix}
      format={{ notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: value < 10 ? 1 : 0 }}
      className={`font-mono tabular-nums ${compact ? "text-[15px]" : "text-[20px]"}`}
    />
  );
}

function DateFlow({ date, size }: { date: string; size: string }) {
  const d = parseMonth(date);
  return (
    <span className={`font-mono ${size} leading-none`}>
      {d.monthName}{" "}
      <NumberFlow value={d.year} format={{ useGrouping: false }} />
    </span>
  );
}

export function Dashboard({
  def,
  states,
  active,
  kinds,
}: {
  def: DashboardDef;
  states: ChapterState[];
  active: number;
  kinds: string[];
}) {
  const s = states[active] ?? states[0];
  return (
    <div className="graph-border-box overflow-hidden bg-background">
      <div className="flex items-end justify-between gap-3 border-b border-rule/40 px-4 pt-3 pb-2.5">
        <div>
          <DateFlow date={s.date} size="text-[26px]" />
          <div className="mt-1 text-[15px] text-accent transition-colors">{s.label}</div>
        </div>
        <span className="rounded-sm bg-dull-bg px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dull">
          {kinds[active] === "reported" ? "Reported" : "My forecast"}
        </span>
      </div>

      <div className="px-3 pt-3">
        <div className="px-1 pb-1 font-mono text-[10px] uppercase tracking-wider text-dull">{def.levelLabel}</div>
        <LevelChart states={states} active={active} bands={def.bands} />
      </div>

      <div className="px-4 pt-3">
        <div className="pb-1.5 font-mono text-[10px] uppercase tracking-wider text-dull">{def.share.label}</div>
        <ShareBar def={def.share} values={s.share} />
      </div>

      <dl className="mt-3 grid grid-cols-2 border-t border-rule/40">
        {def.metrics.map((m, i) => (
          <div key={m.key} className={`px-4 py-2.5 ${i % 2 ? "border-l border-rule/40" : ""} ${i > 1 ? "border-t border-rule/40" : ""}`}>
            <dt className="text-[12px] leading-tight text-dull">{m.label}</dt>
            <dd>
              <Metric def={m} value={s.metrics[m.key]} />
            </dd>
          </div>
        ))}
      </dl>

      {def.note && <p className="border-t border-rule/40 px-4 py-2 text-[11.5px] leading-snug text-dull">{def.note}</p>}
    </div>
  );
}

/** Phone version: one slim sticky strip with the date, status and two numbers */
export function DashboardCompact({
  def,
  states,
  active,
}: {
  def: DashboardDef;
  states: ChapterState[];
  active: number;
}) {
  const s = states[active] ?? states[0];
  const pct = (s.level / def.bands.length) * 100;
  return (
    <div className="border-b border-rule/40 bg-background px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <DateFlow date={s.date} size="text-[17px]" />
          <div className="truncate text-[13px] text-accent">{s.label}</div>
        </div>
        <div className="flex gap-4 text-right">
          {def.metrics.slice(0, 2).map((m) => (
            <div key={m.key} className="max-w-[7.5rem]">
              <Metric def={m} value={s.metrics[m.key]} compact />
              <div className="truncate text-[10.5px] leading-tight text-dull">{m.short ?? m.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 h-1 w-full rounded-full bg-dull-bg" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
