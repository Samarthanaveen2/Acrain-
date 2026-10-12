import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarChart3, BookOpen } from "lucide-react";
import { getTopic, listTopicSlugs } from "@/lib/topics";
import { collectNotes } from "@/lib/footnotes";
import SiteHeader from "@/components/SiteHeader";
import TopicScroll from "@/components/topic/TopicScroll";
import QuestionChips from "@/components/topic/QuestionChips";
import ChapterBody from "@/components/topic/ChapterBody";
import Footnotes from "@/components/topic/Footnotes";
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

/** Short name for the left timeline: the part of the title before the colon */
const shortTitle = (title: string) => (title.includes(":") ? title.split(":")[0] : title);

export default async function TopicPage({ params }: PageProps<"/topics/[slug]">) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const states = topic.chapters.map(({ date, label, lines, capabilities, share, metrics }) => ({
    date,
    label,
    lines,
    capabilities,
    share,
    metrics,
  }));
  const { notes, numbers } = collectNotes(topic.chapters);
  const sep = <span className="text-[#bbb]">|</span>;

  return (
    <TopicScroll
      header={<SiteHeader title={topic.title} byline={topic.author} />}
      def={topic.dashboard}
      states={states}
      navItems={topic.chapters.map((c) => ({ id: c.id, label: shortTitle(c.title) }))}
    >
      <div className="prose-acrain">
        {topic.subtitle.split(/\n\s*\n/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <QuestionChips questions={topic.questions} />

      <p className="mt-14 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-[#777]">
        <span>Started {topic.started}</span>
        {sep}
        <span>Updated {topic.updated}</span>
        {sep}
        <a href="#trends" className="inline-flex items-center gap-1 no-underline hover:text-[#111]">
          <BarChart3 size={14} /> Trends
        </a>
        {sep}
        <a href="#sources" className="inline-flex items-center gap-1 no-underline hover:text-[#111]">
          <BookOpen size={14} /> Sources
        </a>
      </p>

      <div className="grid gap-16">
        {topic.chapters.map((c, i) => (
          <section key={c.id} id={c.id} data-chapter={i} className="scroll-mt-[30vh]">
            {i > 0 && <hr className="mx-auto mb-14 w-[90%] border-0 border-t border-[#666]/40" />}
            <h2 className="text-[2.6rem] leading-[1.15] min-[731px]:text-[3rem]">
              <a href={`#${c.id}`} className="no-underline">
                {c.title}
              </a>
            </h2>
            <p className="mt-2 font-mono text-[12px] tracking-wide text-[#777]">
              {c.kind === "reported" ? "Reported" : "My forecast"}
            </p>
            <div className="mt-5">
              <ChapterBody body={c.body} notes={numbers[c.id]} />
            </div>
          </section>
        ))}
        <Trends def={topic.dashboard} chapters={topic.chapters} />
        <Footnotes notes={notes} />
        <Sources sources={topic.sources} />
      </div>
    </TopicScroll>
  );
}
