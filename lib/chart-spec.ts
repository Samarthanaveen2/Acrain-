export type ChartType = "line" | "bar";

export type ChartSpec = {
  type: ChartType;
  title?: string;
  unit?: string;
  points: { key: string; value: number }[];
};

const SETTINGS = new Set(["type", "title", "unit"]);

/**
 * Parses a ```chart block:
 *   type: line          # line | bar
 *   title: PS5 games on PC
 *   unit: games
 *   2026-10: 2
 *   2027-03: 25
 * Every line that isn't a setting is a data point "label: number".
 */
export function parseChartSpec(src: string): { spec: ChartSpec } | { error: string } {
  const spec: ChartSpec = { type: "line", points: [] };
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const first = line.indexOf(":");
    if (first <= 0) return { error: `Line ${i + 1}: expected "label: value", got "${line}"` };
    const setting = line.slice(0, first).trim().toLowerCase();
    if (SETTINGS.has(setting)) {
      const raw = line.slice(first + 1).trim();
      if (setting === "type") {
        if (raw !== "line" && raw !== "bar") return { error: `Line ${i + 1}: type must be "line" or "bar"` };
        spec.type = raw;
      } else {
        spec[setting as "title" | "unit"] = raw;
      }
      continue;
    }
    // Data labels may contain colons ("Q1: 2027: 40"), so split on the last one
    const at = line.lastIndexOf(":");
    const key = line.slice(0, at).trim();
    const raw = line.slice(at + 1).trim();
    const value = Number(raw.replace(/[,$%\s]/g, ""));
    if (!raw || Number.isNaN(value)) return { error: `Line ${i + 1}: "${raw}" isn't a number` };
    spec.points.push({ key, value });
  }
  if (!spec.points.length) return { error: "Add at least one data point, like 2027-03: 25" };
  return { spec };
}
