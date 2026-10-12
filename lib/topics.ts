import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Chapter, ChapterKind, Topic, TopicMeta } from "./types";

// Every read and write of topic content goes through this module, so a
// database can replace the files later without touching the pages.

const TOPICS_DIR = path.join(process.cwd(), "content", "topics");
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isSlug(s: string) {
  return SLUG.test(s);
}

export function listTopicSlugs(): string[] {
  if (!fs.existsSync(TOPICS_DIR)) return [];
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
      const date = String(data.date ?? "");
      if (!/^\d{4}-\d{2}$/.test(date)) throw new Error(`${where}: "date" must be a quoted "YYYY-MM" string`);
      return {
        id: file.replace(/\.md$/, "").replace(/^\d+-/, ""),
        title: String(data.title ?? ""),
        kind: (data.kind === "reported" ? "reported" : "forecast") as ChapterKind,
        date,
        label: String(data.label ?? ""),
        lines: data.lines ?? {},
        capabilities: data.capabilities ?? {},
        share: data.share ?? {},
        metrics: data.metrics ?? {},
        body: content.replace(/^\n/, ""),
      };
    });
}

export function getTopic(slug: string): Topic | null {
  if (!isSlug(slug) || !listTopicSlugs().includes(slug)) return null;
  return { ...readMeta(slug), chapters: readChapters(slug) };
}

export function listTopics(): (TopicMeta & { chapterCount: number })[] {
  return listTopicSlugs().map((slug) => ({
    ...readMeta(slug),
    chapterCount: readChapters(slug).length,
  }));
}

/** Writes topic.json and one Markdown file per chapter, removing chapters that were deleted */
export function writeTopic(topic: Topic) {
  if (!isSlug(topic.slug)) throw new Error(`"${topic.slug}" isn't a valid topic name`);
  const dir = path.join(TOPICS_DIR, topic.slug);
  const chapDir = path.join(dir, "chapters");
  fs.mkdirSync(chapDir, { recursive: true });

  const { slug: _slug, chapters, ...meta } = topic;
  fs.writeFileSync(path.join(dir, "topic.json"), JSON.stringify(meta, null, 2) + "\n");

  const used = new Set<string>();
  const written = new Set<string>();
  chapters.forEach((c, i) => {
    let id = slugify(c.title) || `chapter-${i + 1}`;
    while (used.has(id)) id = `${id}-${i + 1}`;
    used.add(id);
    const file = `${String(i + 1).padStart(2, "0")}-${id}.md`;
    const front = {
      title: c.title,
      kind: c.kind,
      date: c.date,
      label: c.label,
      lines: c.lines,
      capabilities: c.capabilities,
      share: c.share,
      metrics: c.metrics,
    };
    fs.writeFileSync(path.join(chapDir, file), matter.stringify(`\n${c.body.trim()}\n`, front));
    written.add(file);
  });
  for (const f of fs.readdirSync(chapDir)) {
    if (f.endsWith(".md") && !written.has(f)) fs.unlinkSync(path.join(chapDir, f));
  }
}

/** A free slug for a new topic title: "ai-2030", then "ai-2030-2", … */
export function freeSlug(title: string) {
  const base = slugify(title) || "topic";
  const taken = new Set(listTopicSlugs());
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}
