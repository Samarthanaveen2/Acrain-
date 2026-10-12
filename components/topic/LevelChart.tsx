"use client";

import { useId } from "react";
import { parseMonth } from "@/lib/dates";
import type { ChapterState } from "@/lib/types";

const W = 320;
const H = 168;
const PAD = { l: 8, r: 10, t: 8, b: 20 };
const BAND_FILLS = ["#f7f7ef", "#f0f0f0"];

/** Catmull-Rom spline through points, as an SVG path */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export default function LevelChart({
  states,
  active,
  bands,
}: {
  states: ChapterState[];
  active: number;
  bands: string[];
}) {
  const ts = states.map((s) => parseMonth(s.date).t);
  const t0 = Math.floor(Math.min(...ts));
  const t1 = Math.max(Math.ceil(Math.max(...ts)), t0 + 1);
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / bands.length) * (H - PAD.t - PAD.b);
  const pts = states.map((s, i) => [x(ts[i]), y(s.level)] as [number, number]);
  const path = smoothPath(pts);
  const [cx, cy] = pts[active] ?? pts[0];
  const progress = (cx - PAD.l) / (W - PAD.l - PAD.r);
  const bandH = (H - PAD.t - PAD.b) / bands.length;
  // useId output contains characters that break url(#…) references
  const clipId = `lvl${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const years = Array.from({ length: t1 - t0 + 1 }, (_, i) => t0 + i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Level over time">
      <defs>
        <clipPath id={clipId}>
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            style={{
              transform: `scaleX(${(PAD.l + progress * (W - PAD.l - PAD.r) + 1) / W})`,
              transformOrigin: "0 0",
              transition: "transform 500ms ease-in-out",
            }}
          />
        </clipPath>
      </defs>

      {bands.map((name, i) => (
        <rect
          key={name}
          x={PAD.l}
          y={PAD.t + (bands.length - 1 - i) * bandH}
          width={W - PAD.l - PAD.r}
          height={bandH}
          fill={BAND_FILLS[i % 2]}
        />
      ))}

      {years.map((yr, i) => (
        <g key={yr}>
          <line x1={x(yr)} x2={x(yr)} y1={PAD.t} y2={H - PAD.b} stroke="#cfcfcf" strokeWidth={0.75} />
          <text
            x={x(yr)}
            y={H - 6}
            fontSize={9.5}
            textAnchor={i === 0 ? "start" : i === years.length - 1 ? "end" : "middle"}
            className="font-mono"
            fill="#666"
          >
            {yr}
          </text>
        </g>
      ))}

      {bands.map((name, i) => (
        <text
          key={name}
          x={PAD.l + 6}
          y={PAD.t + (bands.length - 1 - i) * bandH + 13}
          fontSize={9.5}
          className="font-mono"
          fill="#666"
          stroke={BAND_FILLS[i % 2]}
          strokeWidth={4}
          paintOrder="stroke"
        >
          {name}
        </text>
      ))}

      <path d={path} fill="none" stroke="#b4b4ac" strokeWidth={1.5} strokeDasharray="3 3" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.5} clipPath={`url(#${clipId})`} />

      <g style={{ transform: `translate(${cx}px, ${cy}px)`, transition: "transform 500ms ease-in-out" }}>
        <circle r={7} fill="var(--accent)" opacity={0.18} />
        <circle r={4} fill="var(--accent)" stroke="#fffff8" strokeWidth={1.5} />
      </g>
    </svg>
  );
}
