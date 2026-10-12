"use client";

import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import { Maximize2, X } from "lucide-react";
import { parseMonth } from "@/lib/dates";
import { metricFlow } from "@/lib/format";
import { Icon } from "@/lib/icons";
import { stateAt, useTween } from "@/lib/interp";
import type { ChapterState, DashboardDef, MetricDef } from "@/lib/types";
import LinesChart from "./LinesChart";
import Capabilities from "./Capabilities";
import ShareDonut from "./ShareDonut";
import TechBuckets from "./TechBuckets";

function DatePill({ date, small = false }: { date: string; small?: boolean }) {
  const d = parseMonth(date);
  return (
    <span
      className={`inline-flex items-baseline gap-[0.5ch] rounded-md bg-[#111] font-mono text-[#fffff8] ${
        small ? "px-1.5 py-[2px] text-[11px]" : "px-2 py-[3px] text-[13px]"
      }`}
    >
      <span>{d.monthName}</span>
      <NumberFlow value={d.year} format={{ useGrouping: false }} />
    </span>
  );
}

function Metric({ def, value }: { def: MetricDef; value: number }) {
  return <NumberFlow {...metricFlow(def, value ?? 0)} />;
}

/** "**140** paid apps have a free AI-built twin, cloned in **2** weeks" plus a grid of squares */
function Waffle({ dash, metrics, label }: { dash: DashboardDef; metrics: Record<string, number>; label: string }) {
  const w = dash.waffle;
  if (!w) return null;
  const byKey = Object.fromEntries(dash.metrics.map((m) => [m.key, m]));
  const parts = w.text.split(/(\{[a-zA-Z0-9_]+\})/g);
  const count = Math.min(300, Math.max(0, Math.ceil((metrics[w.metric] ?? 0) / Math.max(w.per, 1e-9))));
  return (
    <div>
      <p className="font-mono text-[10.5px] leading-snug text-[#111]">
        {parts.map((part, i) => {
          const m = part.match(/^\{(.+)\}$/);
          if (!m) return <span key={i}>{part}</span>;
          if (m[1] === "label") return <span key={i}>{label}</span>;
          const def = byKey[m[1]] ?? { key: m[1], label: m[1] };
          return (
            <b key={i} className="font-bold">
              <Metric def={def} value={metrics[m[1]]} />
            </b>
          );
        })}
      </p>
      <div className="mt-1 flex flex-wrap gap-[2.5px]" aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className="waffle-square h-[8px] w-[8px] rounded-[1.5px] bg-accent" />
        ))}
      </div>
    </div>
  );
}

/** Icon + small label + bold value columns, groups split by a vertical rule */
function KeyStats({ dash, metrics }: { dash: DashboardDef; metrics: Record<string, number> }) {
  const byKey = Object.fromEntries(dash.metrics.map((m) => [m.key, m]));
  const groups = dash.statGroups ?? [{ metrics: dash.metrics.map((m) => m.key) }];
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {groups.map((g, gi) => (
        <div key={gi} className="flex items-center">
          {gi > 0 && <span className="mx-2.5 h-6 w-[1.5px] bg-[#111]" aria-hidden />}
          {g.icon && (
            <span className="mr-2 shrink-0" title={g.label}>
              <Icon name={g.icon} size={22} strokeWidth={1.9} className="text-[#111]" />
            </span>
          )}
          <dl className="flex gap-2.5">
            {g.metrics.map((k) =>
              byKey[k] ? (
                <div key={k}>
                  <dt className="font-mono text-[9px] leading-tight whitespace-nowrap text-[#333]">{byKey[k].label}</dt>
                  <dd className="font-mono text-[11.5px] font-bold leading-tight whitespace-nowrap text-[#111]">
                    <Metric def={byKey[k]} value={metrics[k]} />
                  </dd>
                </div>
              ) : null,
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}

/** The full right-hand dashboard, laid out like ai-2027's sticky graph column */
export function Dashboard({ def, states, active }: { def: DashboardDef; states: ChapterState[]; active: number }) {
  const p = useTween(active);
  const s = stateAt(states, p);
  const target = states[active] ?? states[0];
  return (
    <div className="grid gap-6">
      <div className="relative">
        <div className="absolute top-0 left-0 z-10">
          <DatePill date={target.date} />
        </div>
        <LinesChart def={def.lines} states={states} now={s.t} />
      </div>

      {(def.capabilities || def.share) && (
        <div className="flex items-center gap-2">
          {def.capabilities && (
            <div className="min-w-0 flex-1">
              <Capabilities def={def.capabilities} values={s.capabilities} />
            </div>
          )}
          {def.share && <ShareDonut def={def.share} values={s.share} />}
        </div>
      )}

      <Waffle dash={def} metrics={target.metrics} label={target.label} />
      <KeyStats dash={def} metrics={target.metrics} />
      {def.tech && <TechBuckets def={def.tech} now={parseMonth(target.date).t} />}
      {def.note && <p className="font-mono text-[9.5px] leading-snug text-dull">{def.note}</p>}
    </div>
  );
}

/** Phones: a floating card with the date and chart; tap to open the whole dashboard */
export function DashboardFloating({ def, states, active }: { def: DashboardDef; states: ChapterState[]; active: number }) {
  const [open, setOpen] = useState(false);
  const p = useTween(active);
  const s = stateAt(states, p);
  const target = states[active] ?? states[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className="fixed inset-x-2 z-30 rounded-xl border border-[#ddd] bg-background px-3 pt-2.5 pb-1 shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
      >
        <div className="absolute top-2.5 left-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open the full dashboard"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#111] text-[#fffff8]"
          >
            <Maximize2 size={14} strokeWidth={2.25} />
          </button>
          <DatePill date={target.date} small />
        </div>
        <LinesChart def={def.lines} states={states} now={s.t} height={112} maxMilestones={2} />
      </div>

      {open && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-background px-4 pt-4 pb-10" role="dialog" aria-label="Dashboard">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close the dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-md border-[1.5px] border-[#111]"
            >
              <X size={18} />
            </button>
          </div>
          <Dashboard def={def} states={states} active={active} />
        </div>
      )}
    </>
  );
}
