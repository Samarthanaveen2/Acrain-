import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Chapter, ChapterKind, Topic, TopicMeta } from "./types";

const TOPICS_DIR = path.join(process.cwd(), "content", "topics");

export function listTopicSlugs(): string[] {
  return fs
    .readdirSync(TOPICS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(TOPICS_DIR, d.name, "topic.json")))
    .map((d) => d.name)
    .sort();
}

function readMeta(slug: string): TopicMeta {
  const raw = fs.readFileSync(path.join(TOPICS_DIR, slug, "topic.json"), "utf8");
  return { ...JSON.parse(raw), slug } as TopicMeta;
}

function readChapters(slug: string): Chapter[] {
  const dir = path.join(TOPICS_DIR, slug, "chapters");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
      const where = `${slug}/chapters/${file}`;
      if (typeof data.date !== "string" || !/^\d{4}-\d{2}$/.test(data.date)) {
        throw new Error(`${where}: "date" must be a quoted "YYYY-MM" string`);
      }
      if (typeof data.title !== "string") throw new Error(`${where}: missing "title"`);
      return {
        id: file.replace(/\.md$/, "").replace(/^\d+-/, ""),
        title: data.title,
        kind: (data.kind === "reported" ? "reported" : "forecast") as ChapterKind,
        date: data.date,
        label: String(data.label ?? ""),
        level: Number(data.level ?? 0),
        share: data.share ?? {},
        metrics: data.metrics ?? {},
        body: content,
      };
    });
}

export function getTopic(slug: string): Topic | null {
  if (!listTopicSlugs().includes(slug)) return null;
  return { ...readMeta(slug), chapters: readChapters(slug) };
}

export function listTopics(): (TopicMeta & { chapterCount: number })[] {
  return listTopicSlugs().map((slug) => ({
    ...readMeta(slug),
    chapterCount: readChapters(slug).length,
  }));
}
