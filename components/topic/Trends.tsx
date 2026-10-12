import type { Chapter, DashboardDef } from "@/lib/types";
import ChartBlock from "./ChartBlock";

/** One small line chart per dashboard metric, built from each chapter's numbers */
export default function Trends({ def, chapters }: { def: DashboardDef; chapters: Chapter[] }) {
  if (chapters.length < 2 || !def.metrics.length) return null;
  return (
    <section id="trends" className="scroll-mt-20 border-t border-rule/30 pt-8">
      <h2 className="text-[1.6rem]">Trends</h2>
      <p className="mt-1 text-[1rem] text-dull">Drawn from each chapter&rsquo;s dashboard numbers.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {def.metrics.map((m) => (
          <ChartBlock
            key={m.key}
            compact
            spec={{
              type: "line",
              title: m.label,
              points: chapters.map((c) => ({ key: c.date, value: c.metrics[m.key] ?? 0 })),
            }}
          />
        ))}
      </div>
    </section>
  );
}
