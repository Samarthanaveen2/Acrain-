import type { Topic } from "@/lib/types";

// The artifact's db capability; one document per topic at topics/<slug>
type Doc = { set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> };
type Snap = { docs: { data(): Record<string, unknown> | undefined }[] };
export type DB = {
  doc(path: string): Doc;
  collection(path: string): { onSnapshot(next: (s: Snap) => void, err?: (e: { code: string }) => void): () => void };
};

let dbPromise: Promise<DB | null> | null = null;
export function getDb(): Promise<DB | null> {
  const claude = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
  dbPromise ??= claude ? (claude.use("db") as Promise<DB | null>) : Promise.resolve(null);
  return dbPromise;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Chapter ids become readable anchors from their titles, like the file-based app */
export function normalize(topic: Topic): Topic {
  const used = new Set<string>();
  return {
    ...topic,
    chapters: topic.chapters.map((c, i) => {
      let id = slugify(c.title) || `chapter-${i + 1}`;
      while (used.has(id)) id = `${id}-${i + 1}`;
      used.add(id);
      return { ...c, id };
    }),
  };
}

export async function writeTopic(topic: Topic) {
  const db = await getDb();
  if (!db) throw new Error("Online saving isn't available in this view");
  await db.doc(`topics/${topic.slug}`).set(JSON.parse(JSON.stringify(normalize(topic))));
}
