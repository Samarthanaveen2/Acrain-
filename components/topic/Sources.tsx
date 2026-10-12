import type { Source } from "@/lib/types";

export default function Sources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <section id="sources" className="scroll-mt-20 border-t border-rule/30 pt-8">
      <h2 className="text-[1.6rem]">Sources</h2>
      <ol className="mt-3 grid gap-2 text-[1rem] leading-snug">
        {sources.map((s, i) => (
          <li key={s.id} className="grid grid-cols-[1.8rem_minmax(0,1fr)]">
            <span className="font-mono text-[13px] text-dull">{i + 1}.</span>
            <span>
              <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-rule/40 underline-offset-2 hover:text-accent">
                {s.title}
              </a>
              <span className="text-dull">
                {" "}
                · {s.publisher}, {s.date}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
