import type { Format } from "@number-flow/react";
import type { MetricDef } from "./types";

/** NumberFlow props for a metric, matching ai-2027's "$8B/yr", "-25%", "2042" style */
export function metricFlow(def: MetricDef, value: number): { value: number; format: Format; prefix?: string; suffix?: string } {
  const compact = Math.abs(value) >= 10000;
  switch (def.format) {
    case "currency":
      return {
        value,
        prefix: "$",
        suffix: def.suffix,
        format: { notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 0 },
      };
    case "percent":
      return { value: value / 100, suffix: def.suffix, format: { style: "percent", maximumFractionDigits: 0 } };
    case "year":
      return { value, suffix: def.suffix, format: { useGrouping: false } };
    default:
      return {
        value,
        suffix: def.suffix,
        format: { notation: compact ? "compact" : "standard", maximumFractionDigits: compact || Math.abs(value) < 10 ? 1 : 0 },
      };
  }
}
