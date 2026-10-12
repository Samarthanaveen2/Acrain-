import type { TopicMeta } from "@/lib/types";
import QuestionChips from "./QuestionChips";

export default function TopicHeader({ topic }: { topic: TopicMeta }) {
  return (
    <header className="pt-12 pb-10 sm:pt-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-dull">{topic.span}</p>
      <h1 className="mt-3 text-[2.5rem] leading-[1.05] sm:text-[3.5rem]">{topic.title}</h1>
      <p className="mt-4 max-w-[40rem] text-[1.3rem] italic leading-snug sm:text-[1.45rem]">{topic.subtitle}</p>
      <p className="mt-5 text-[1rem] text-dull">
        by <span className="text-accent">{topic.author}</span> · started {topic.started} · updated {topic.updated}
      </p>
      <div className="mt-8">
        <QuestionChips questions={topic.questions} />
      </div>
    </header>
  );
}
