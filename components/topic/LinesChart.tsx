"use client";

import { parseMonth } from "@/lib/dates";
import { Icon } from "@/lib/icons";
import type { ChapterState, LinesDef } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtT = (t: number) => {
  const y = Math.floor(t + 1e-6);
  return `${MONTHS[Math.min(11, Math.round((t - y) * 12))]} ${y}`;
};

type Pt = { t: number; v: Record<string, number>; label?: string };

/** Monotone cubic curve through points with increasing x (no overshoot, no kinks) */
function smooth(pts: [number, number][]) {
  const n = pts.length;
  if (!n) return "";
  if (n < 3) return pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const m = pts.slice(0, -1).map((p, i) => (pts[i + 1][1] - p[1]) / (pts[i + 1][0] - p[0] || 1e-9));
  const tg = pts.map((_, i) => (i === 0 ? m[0] : i === n - 1 ? m[n - 2] : m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      tg[i] = tg[i + 1] = 0;
      continue;
    }
    const a = tg[i] / m[i];
    const b = tg[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      tg[i] = k * a * m[i];
      tg[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = (x1 - x0) / 3;
    d += ` C${(x0 + h).toFixed(1)},${(y0 + tg[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - tg[i + 1] * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

/**
 * ai-2027's top chart: several lines from the start of history up to "now",
 * stretching to fill the width as time passes, with named milestones on the
 * lead line and an icon where each line ends.
 */
export default function LinesChart({
  def,
  states,
  now,
  height = 138,
  maxMilestones = 3,
}: {
  def: LinesDef;
  states: ChapterState[];
  /** Current time as a fractional year (tweened) */
  now: number;
  height?: number;
  maxMilestones?: number;
}) {
  const W = 430;
  const H = height;
  const PAD = { l: 2, r: 22, t: 30, b: 18 };
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;

  // Every known point, in time order; labels only where the milestone name changes
  const all: Pt[] = [
    ...(def.history ?? []).map((h) => ({ t: parseMonth(h.date).t, v: h.values, label: h.label })),
    ...states.map((s) => ({ t: parseMonth(s.date).t, v: s.lines, label: s.label })),
  ].sort((a, b) => a.t - b.t);
  let lastLabel = "";
  for (const p of all) {
    if (p.label && p.label === lastLabel) p.label = undefined;
    else if (p.label) lastLabel = p.label;
  }

  const t0 = all[0]?.t ?? now;
  const t1 = Math.max(now, t0 + 0.25);
  const tf = (v: number) => (def.log ? Math.log10(Math.max(v, 1e-6)) : v);

  // Value of a series at time t (interpolated; log-linear on log charts)
  const at = (key: string, t: number) => {
    let prev = all[0];
    for (const p of all) {
      if (p.t >= t) {
        const a = tf(prev.v[key] ?? 0);
        const b = tf(p.v[key] ?? 0);
        const f = p.t === prev.t ? 1 : (t - prev.t) / (p.t - prev.t);
        return a + (b - a) * f;
      }
      prev = p;
    }
    return tf(prev.v[key] ?? 0);
  };

  const visible = all.filter((p) => p.t < t1);
  const series = def.series.map((s) => ({
    ...s,
    pts: [...visible.map((p) => [p.t, tf(p.v[s.key] ?? 0)] as [number, number]), [t1, at(s.key, t1)] as [number, number]],
  }));
  const ys = series.flatMap((s) => s.pts.map((p) => p[1]));
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = hi - lo || 1;
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * pw;
  const y = (v: number) => PAD.t + (1 - (v - (lo - span * 0.04)) / (span * 1.08)) * ph;

  // End-of-line icons, nudged apart so they don't overlap
  const ends = series
    .map((s, i) => ({ i, icon: s.icon, label: s.label, y: y(s.pts[s.pts.length - 1][1]) }))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 14);

  // Milestones on the lead line: the latest few, dropping any that would collide
  const lead = def.series[0]?.key;
  const charW = 6.1;
  const milestones: { t: number; label: string; x: number; y: number }[] = [];
  for (const p of [...visible].reverse()) {
    if (!p.label || milestones.length >= maxMilestones) continue;
    const mx = x(p.t);
    const w = p.label.length * charW;
    const clash = milestones.some((m) => Math.abs(m.x - mx) < (w + m.label.length * charW) / 2 + 8);
    if (!clash) milestones.push({ t: p.t, label: p.label, x: mx, y: y(at(lead, p.t)) });
  }
  const clampX = (cx: number, w: number) => Math.min(Math.max(cx, PAD.l + w / 2), W - PAD.r - w / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={def.label}>
      <title>{def.label}</title>
      {series
        .map((s, i) => ({ s, i }))
        .reverse()
        .map(({ s, i }) => (
          <path
            key={s.key}
            d={smooth(s.pts.map(([t, v]) => [x(t), y(v)]))}
            fill="none"
            stroke={i === 0 ? "var(--accent)" : "#555"}
            strokeOpacity={i === 0 ? 0.8 : 0.9}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}

      {milestones.map((m) => {
        const w = m.label.length * charW;
        const dateW = 8 * charW;
        return (
          <g key={`${m.label}-${m.t}`}>
            <circle cx={m.x} cy={m.y} r={1.6} fill="#fffff8" />
            <text x={clampX(m.x, w)} y={Math.max(11, m.y - 9)} textAnchor="middle" className="font-mono" fontSize={10} fontWeight={700} fill="#111">
              {m.label}
            </text>
            <text x={clampX(m.x, dateW)} y={H - 3} textAnchor="middle" className="font-mono" fontSize={10} fill="#111">
              {fmtT(m.t)}
            </text>
          </g>
        );
      })}

      {ends.map((e) => (
        <g key={e.i} transform={`translate(${W - 10}, ${e.y})`}>
          <title>{e.label}</title>
          <circle r={7} fill="#111" />
          <Icon name={e.icon} size={9} x={-4.5} y={-4.5} strokeWidth={2.75} className="text-[#fffff8]" />
        </g>
      ))}
    </svg>
  );
}
