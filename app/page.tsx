import SiteHeader from "@/components/SiteHeader";
import TopicCard from "@/components/TopicCard";
import { listTopics } from "@/lib/topics";

export default function Home() {
  const topics = listTopics();
  return (
    <div className="mx-auto max-w-[1166px] px-4 pb-24 min-[731px]:px-8">
      <SiteHeader title="Acrain" byline="Samartha" />
      <div className="prose-acrain max-w-[700px]">
        <p>A personal forecast of the next decade, and the options I&rsquo;m keeping open.</p>
        <p>
          Each topic is a story I write about how something will unfold, chapter by chapter, with a dashboard that
          moves as I scroll. Where the future forks, I lay out the paths and what it costs to keep each one open.
        </p>
      </div>
      <p className="mt-10 font-mono text-[13px] text-[#777]">Started Oct 12, 2026</p>

      <section id="topics" className="scroll-mt-8 pt-10">
        <div className="flex items-baseline justify-between gap-4 border-b border-[#666]/40 pb-2">
          <h2 className="text-[2.2rem]">Topics</h2>
          <span className="font-mono text-[13px] text-[#777]">
            {topics.length} {topics.length === 1 ? "topic" : "topics"}
          </span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
