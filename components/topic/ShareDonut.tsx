"use client";

import { Icon } from "@/lib/icons";
import type { ShareDef } from "@/lib/types";

const COLORS = ["var(--accent)", "#111", "#2f2f2f", "#4d4d4d", "#6f6f6f", "#8f8f8f"];

/** ai-2027's "Compute" donut: thick ring, near-black slices, the lead slice in accent, icons on slices */
export default function ShareDonut({ def, values, size = 100 }: { def: ShareDef; values: Record<string, number>; size?: number }) {
  const R = 62;
  const r = 38;
  const total = def.parts.reduce((s, p) => s + Math.max(0, values[p.key] ?? 0), 0) || 1;
  const fracs = def.parts.map((p) => Math.max(0, values[p.key] ?? 0) / total);
  const starts = fracs.map((_, i) => -Math.PI / 2 + fracs.slice(0, i).reduce((a, b) => a + b, 0) * Math.PI * 2);
  const pt = (rad: number, a: number) => [Math.cos(a) * rad, Math.sin(a) * rad];
  const slices = def.parts.map((p, i) => {
    const frac = fracs[i];
    const a0 = starts[i];
    const a1 = a0 + frac * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = pt(R, a0);
    const [x1, y1] = pt(R, a1);
    const [x2, y2] = pt(r, a1);
    const [x3, y3] = pt(r, a0);
    const d = `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`;
    const [ix, iy] = pt((R + r) / 2, (a0 + a1) / 2);
    return { p, i, d, frac, ix, iy };
  });

  return (
    <svg viewBox="-66 -66 132 132" width={size} height={size} role="img" aria-label={def.label}>
      {slices.map((s) =>
        s.frac > 0.0005 ? (
          <path key={s.p.key} d={s.d} fill={COLORS[s.i % COLORS.length]} stroke="#fffff8" strokeWidth={1.5}>
            <title>{`${s.p.label}: ${Math.round(s.frac * 100)}%`}</title>
          </path>
        ) : null,
      )}
      {slices.map((s) =>
        s.frac >= 0.09 && s.p.icon ? (
          <Icon key={`i-${s.p.key}`} name={s.p.icon} size={12} x={s.ix - 6} y={s.iy - 6} strokeWidth={2.25} className="pointer-events-none text-[#fffff8]" />
        ) : null,
      )}
      <text y={4} textAnchor="middle" className="font-mono" fontSize={11.5} fontWeight={700} fill="#111">
        {def.label}
      </text>
    </svg>
  );
}
