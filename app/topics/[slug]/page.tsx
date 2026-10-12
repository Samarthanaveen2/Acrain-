import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopic, listTopicSlugs } from "@/lib/topics";
import TopicHeader from "@/components/topic/TopicHeader";
import TopicScroll from "@/components/topic/TopicScroll";
import ChapterBody from "@/components/topic/ChapterBody";
import Sources from "@/components/topic/Sources";
import Trends from "@/components/topic/Trends";

export function generateStaticParams() {
  return listTopicSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/topics/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  return topic ? { title: `${topic.title} · Acrain`, description: topic.summary } : {};
}

export default async function TopicPage({ params }: PageProps<"/topics/[slug]">) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const states = topic.chapters.map(({ date, label, level, share, metrics }) => ({ date, label, level, share, metrics }));

  return (
    <article className="mx-auto max-w-6xl px-4 pb-24">
      <TopicHeader topic={topic} />
      <TopicScroll def={topic.dashboard} states={states} kinds={topic.chapters.map((c) => c.kind)}>
        <div className="grid gap-14">
          {topic.chapters.map((c, i) => (
            <section key={c.id} id={c.id} data-chapter={i} className="scroll-mt-24">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-dull">
                {c.kind === "reported" ? "Reported" : "My forecast"}
              </p>
              <h2 className="mt-1.5 text-[1.9rem] leading-tight sm:text-[2.2rem]">
                <a href={`#${c.id}`} className="no-underline hover:text-accent">
                  {c.title}
                </a>
              </h2>
              <div className="mt-4">
                <ChapterBody id={c.id} body={c.body} />
              </div>
            </section>
          ))}
          <Trends def={topic.dashboard} chapters={topic.chapters} />
          <Sources sources={topic.sources} />
        </div>
      </TopicScroll>
    </article>
  );
}
