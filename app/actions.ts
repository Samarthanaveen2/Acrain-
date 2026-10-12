"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { freeSlug, getTopic, isSlug, writeTopic } from "@/lib/topics";
import { newTopicMeta } from "@/lib/templates";
import type { Topic } from "@/lib/types";

const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const cantSave = (e: unknown) =>
  `Couldn't save (${e instanceof Error ? e.message : String(e)}). Saving works when Acrain runs on your own computer with "npm run dev".`;

export async function createTopic(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Give the topic a title");
  const slug = freeSlug(title);
  writeTopic({
    ...newTopicMeta(slug, {
      title,
      span: String(formData.get("span") ?? "").trim(),
      summary: String(formData.get("summary") ?? "").trim(),
      author: String(formData.get("author") ?? "").trim() || "Samartha",
      today: today(),
    }),
    chapters: [],
  });
  revalidatePath("/");
  redirect(`/topics/${slug}/edit`);
}

export async function saveTopic(topic: Topic): Promise<{ ok: true; updated: string } | { ok: false; error: string }> {
  if (!isSlug(topic.slug) || !getTopic(topic.slug)) return { ok: false, error: "This topic no longer exists." };
  if (!Array.isArray(topic.chapters)) return { ok: false, error: "Nothing to save." };
  for (const c of topic.chapters) {
    if (!/^\d{4}-\d{2}$/.test(c.date)) return { ok: false, error: `"${c.title || "Untitled chapter"}" needs a month.` };
  }
  const updated = today();
  try {
    writeTopic({ ...topic, updated });
  } catch (e) {
    return { ok: false, error: cantSave(e) };
  }
  revalidatePath("/");
  revalidatePath(`/topics/${topic.slug}`);
  revalidatePath(`/topics/${topic.slug}/edit`);
  return { ok: true, updated };
}
