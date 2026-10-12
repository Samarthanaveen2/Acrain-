import { parseMonth } from "@/lib/dates";
import type { ChartSpec } from "@/lib/chart-spec";

const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const fmt = (v: number) => compactFmt.format(v);

const MONTH_KEY = /^\d{4}-\d{2}$/;
const YEAR_KEY = /^\d{4}$/;

/** A round step so the y axis gets about four gridlines */
function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function xLabel(key: string) {
  if (MONTH_KEY.test(key)) {
    const d = parseMonth(key);
    return `${d.monthName} '${String(d.year).slice(2)}`;
  }
  return key;
}

/** ai-2027-style chart: thin rules, mono labels, faint watermark */
export default function ChartBlock({ spec, compact = false }: { spec: ChartSpec; compact?: boolean }) {
  const W = compact ? 320 : 520;
  const H = compact ? 170 : 260;
  const fs = compact ? 11 : 13;
  // Top padding leaves room for the value label above the highest point
  const PAD = { l: compact ? 34 : 44, r: 14, t: fs + 10, b: compact ? 24 : 30 };
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;

  const values = spec.points.map((p) => p.value);
  const lo = Math.min(0, ...values);
  const step = niceStep(Math.max(...values) - lo || 1);
  const top = Math.ceil(Math.max(...values, 0) / step) * step || step;
  const bottom = Math.floor(lo / step) * step;
  const y = (v: number) => PAD.t + (1 - (v - bottom) / (top - bottom)) * ph;
  const ticks: number[] = [];
  for (let v = bottom; v <= top + step / 2; v += step) ticks.push(v);

  const n = spec.points.length;
  const timeAxis = spec.type === "line" && spec.points.every((p) => MONTH_KEY.test(p.key) || YEAR_KEY.test(p.key));
  const ts = spec.points.map((p) => (MONTH_KEY.test(p.key) ? parseMonth(p.key).t : Number(p.key)));
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const band = pw / n;
  const x = (i: number) =>
    spec.type === "bar"
      ? PAD.l + band * (i + 0.5)
      : timeAxis && tMax > tMin
        ? PAD.l + ((ts[i] - tMin) / (tMax - tMin)) * pw
        : PAD.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);

  // X labels: whole years on a long time axis, otherwise the points themselves,
  // dropping any label that would sit too close to the one before it
  const candidates: { x: number; text: string; anchor: "start" | "middle" | "end" }[] =
    timeAxis && tMax - tMin >= 2
      ? Array.from({ length: Math.floor(tMax) - Math.ceil(tMin) + 1 }, (_, i) => {
          const yr = Math.ceil(tMin) + i;
          return { x: PAD.l + ((yr - tMin) / (tMax - tMin)) * pw, text: String(yr), anchor: "middle" as const };
        })
      : spec.points.map((p, i) => ({
          x: x(i),
          text: xLabel(p.key),
          anchor: spec.type === "bar" ? ("middle" as const) : i === 0 ? ("start" as const) : i === n - 1 ? ("end" as const) : ("middle" as const),
        }));
  const minGap = fs * 5;
  const xLabels: typeof candidates = [];
  for (const c of candidates) {
    const last = xLabels[xLabels.length - 1];
    if (!last || c.x - last.x >= minGap) xLabels.push(c);
  }

  const line = spec.points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(n - 1)},${y(Math.max(bottom, 0))} L${x(0)},${y(Math.max(bottom, 0))} Z`;

  return (
    <figure className={`graph-border-box relative ${compact ? "px-3 pt-2 pb-1" : "px-4 pt-3 pb-2"}`}>
      {spec.title && (
        <figcaption className={`pr-12 ${compact ? "text-[1rem] leading-snug" : "text-[1.15rem] leading-snug"}`}>
          {spec.title}
          {spec.unit && <span className="text-dull"> ({spec.unit})</span>}
        </figcaption>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block h-auto w-full" role="img" aria-label={spec.title ?? "Chart"}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#64645f" : "#e2e2da"} strokeWidth={v === 0 ? 1 : 0.75} />
            <text x={PAD.l - 6} y={y(v) + fs * 0.35} fontSize={fs} textAnchor="end" className="font-mono" fill="#666">
              {fmt(v)}
            </text>
          </g>
        ))}

        {spec.type === "bar"
          ? spec.points.map((p, i) => {
              const bw = Math.min(band * 0.62, 56);
              const rectTop = y(Math.max(p.value, 0));
              const rectBottom = y(Math.min(p.value, 0));
              return (
                <g key={`${p.key}-${i}`}>
                  <rect x={x(i) - bw / 2} y={rectTop} width={bw} height={rectBottom - rectTop} fill="var(--accent)" rx={1.5} />
                  <text x={x(i)} y={y(Math.max(p.value, 0)) - 5} fontSize={fs} textAnchor="middle" className="font-mono" fill="#000">
                    {fmt(p.value)}
                  </text>
                </g>
              );
            })
          : (
              <>
                <path d={area} fill="var(--accent)" opacity={0.08} />
                <path d={line} fill="none" stroke="var(--accent)" strokeWidth={compact ? 1.75 : 2.25} strokeLinejoin="round" />
                {spec.points.map((p, i) => (
                  <circle key={`${p.key}-${i}`} cx={x(i)} cy={y(p.value)} r={i === n - 1 ? 3.5 : 2.25} fill={i === n - 1 ? "var(--accent)" : "#fffff8"} stroke="var(--accent)" strokeWidth={1.5} />
                ))}
                <text x={x(n - 1)} y={y(spec.points[n - 1].value) - 8} fontSize={fs} textAnchor="end" className="font-mono" fill="#000">
                  {fmt(spec.points[n - 1].value)}
                </text>
              </>
            )}

        {xLabels.map((l) => (
          <text key={`${l.text}-${l.x}`} x={l.x} y={H - (compact ? 7 : 9)} fontSize={fs} textAnchor={l.anchor} className="font-mono" fill="#666">
            {l.text}
          </text>
        ))}
      </svg>
      <span className="pointer-events-none absolute top-2 right-2.5 font-mono text-[10px] text-dull opacity-50">acrain</span>
    </figure>
  );
}

export function ChartError({ message }: { message: string }) {
  return (
    <div className="rounded-md border-[1.5px] border-dashed border-[#c77400] px-3 py-2 font-mono text-[13px] text-[#8a5000]">
      Chart can&rsquo;t be drawn: {message}
    </div>
  );
}
