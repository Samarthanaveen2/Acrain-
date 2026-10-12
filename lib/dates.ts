const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10" → { year: 2026, month: 10, monthName: "Oct", t: 2026.75 } */
export function parseMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m, monthName: MONTHS[m - 1], t: y + (m - 1) / 12 };
}
