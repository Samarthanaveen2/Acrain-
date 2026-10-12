import Link from "next/link";
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
      </div>

      <section id="topics" className="scroll-mt-8 pt-12">
        <div className="flex items-baseline justify-between gap-4 border-b border-[#666]/40 pb-2">
          <h2 className="text-[2.2rem]">Topics</h2>
          <Link
            href="/new"
            className="rounded-md border-[1.5px] border-[#111] bg-[#111] px-2.5 py-0.5 text-[1.2rem] text-background no-underline hover:bg-transparent hover:text-[#111]"
          >
            + New topic
          </Link>
        </div>
        {topics.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {topics.map((t) => (
              <TopicCard
                key={t.slug}
                href={`/topics/${t.slug}`}
                span={t.span}
                title={t.title}
                summary={t.summary}
                status={`${t.chapterCount} ${t.chapterCount === 1 ? "chapter" : "chapters"}`}
              />
            ))}
          </div>
        ) : (
          <div className="prose-acrain mt-6 max-w-[700px]">
            <p className="text-[#555]">
              No topics yet. Start one with <b>New topic</b>: give it a title, then write it chapter by chapter while the
              ai-2027-style dashboard fills in beside you.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
