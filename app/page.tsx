import TopicCard from "@/components/TopicCard";
import { listTopics } from "@/lib/topics";

export default function Home() {
  const topics = listTopics();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24">
      <section className="pt-14 pb-10 sm:pt-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-dull">Started Oct 12, 2026</p>
        <h1 className="mt-3 text-[2.8rem] leading-[1.05] sm:text-[3.8rem]">Acrain</h1>
        <p className="mt-4 max-w-2xl text-[1.45rem] italic leading-snug sm:text-[1.65rem]">
          A personal forecast of the next decade, and the options I&rsquo;m keeping open.
        </p>
        <p className="mt-6 max-w-2xl text-dull">
          Each topic is a story I write about how something will unfold, chapter by chapter, with a dashboard that
          moves as I scroll. Where the future forks, I lay out the paths and what it costs to keep each one open.
        </p>
        <p className="mt-4 text-[1rem]">
          by <span className="text-accent">Samartha</span>
        </p>
      </section>

      <hr className="border-rule/30" />

      <section id="topics" className="scroll-mt-20 pt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[1.9rem]">Topics</h2>
          <span className="font-mono text-xs text-dull">
            {topics.length} {topics.length === 1 ? "topic" : "topics"}
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {topics.map((t) => (
            <TopicCard
              key={t.slug}
              href={`/topics/${t.slug}`}
              span={t.span}
              title={t.title}
              summary={t.summary}
              status={`${t.chapterCount} chapters`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
