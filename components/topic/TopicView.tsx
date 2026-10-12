import Link from "next/link";
import { BarChart3, BookOpen, PenLine } from "lucide-react";
import { collectNotes } from "@/lib/footnotes";
import type { Topic } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";
import TopicScroll from "./TopicScroll";
import QuestionChips from "./QuestionChips";
import ChapterBody from "./ChapterBody";
import Footnotes from "./Footnotes";
import Sources from "./Sources";
import Trends from "./Trends";

/** Short name for the left timeline: the part of the title before the colon */
const shortTitle = (title: string) => (title.includes(":") ? title.split(":")[0] : title);

/** The whole reading page for one topic (used by the site and the phone version) */
export default function TopicView({ topic }: { topic: Topic }) {
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
  const editLink = (
    <Link href={`/topics/${topic.slug}/edit`} className="inline-flex items-center gap-1 no-underline hover:text-[#111]">
      <PenLine size={14} /> Edit
    </Link>
  );

  if (!topic.chapters.length) {
    return (
      <div className="mx-auto max-w-[1166px] px-4 pb-24 min-[731px]:px-8">
        <SiteHeader title={topic.title} byline={topic.author} />
        <div className="prose-acrain max-w-[700px]">
          <p className="text-[#555]">No chapters yet.</p>
        </div>
        <Link
          href={`/topics/${topic.slug}/edit`}
          className="mt-6 inline-block rounded-md border-[1.5px] border-[#111] bg-[#111] px-3 py-1 text-[1.3rem] text-background no-underline"
        >
          Write the first chapter
        </Link>
      </div>
    );
  }

  return (
    <TopicScroll
      header={<SiteHeader title={topic.title} byline={topic.author} />}
      def={topic.dashboard}
      states={states}
      navItems={topic.chapters.map((c) => ({ id: c.id, label: shortTitle(c.title) }))}
    >
      {topic.subtitle.trim() && (
        <div className="prose-acrain">
          {topic.subtitle
            .trim()
            .split(/\n\s*\n/)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>
      )}
      <QuestionChips questions={topic.questions} />

      <p className="mt-14 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-[#777]">
        <span>Started {topic.started}</span>
        {sep}
        <span>Updated {topic.updated}</span>
        {sep}
        {editLink}
        {topic.chapters.length > 1 && (
          <>
            {sep}
            <a href="#trends" className="inline-flex items-center gap-1 no-underline hover:text-[#111]">
              <BarChart3 size={14} /> Trends
            </a>
          </>
        )}
        {topic.sources.length > 0 && (
          <>
            {sep}
            <a href="#sources" className="inline-flex items-center gap-1 no-underline hover:text-[#111]">
              <BookOpen size={14} /> Sources
            </a>
          </>
        )}
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
