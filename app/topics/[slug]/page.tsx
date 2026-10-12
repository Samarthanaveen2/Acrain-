import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopic, listTopicSlugs } from "@/lib/topics";
import TopicView from "@/components/topic/TopicView";
export function generateStaticParams() {
  const slugs = listTopicSlugs();
  // Cache Components needs at least one param at build time, even with no topics yet
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "__none__" }];
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
  return <TopicView topic={topic} />;
}
