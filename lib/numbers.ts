const UNITS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };

/** "47B" → 47e9, "1.2t" → 1.2e12, "$20K" → 20000, "-25%" → -25. Returns NaN if unreadable. */
export function parseShort(text: string): number {
  const s = text.trim().replace(/[$,%\s]/g, "").toLowerCase();
  if (!s) return NaN;
  const m = s.match(/^(-?\d*\.?\d+)([kmbt])?$/);
  if (!m) return NaN;
  return Number(m[1]) * (m[2] ? UNITS[m[2]] : 1);
}

/** 47e9 → "47B", 1500 → "1.5K", 0.3 → "0.3" */
export function formatShort(n: number): string {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  for (const [u, v] of [["T", 1e12], ["B", 1e9], ["M", 1e6], ["K", 1e3]] as const) {
    if (abs >= v) return `${+(n / v).toFixed(2)}${u}`;
  }
  return String(+n.toFixed(4));
}
