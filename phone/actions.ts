// Replaces app/actions.ts in the phone build: saves to the page's online storage instead of files
import type { Topic } from "@/lib/types";
import { writeTopic } from "./store";

const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export async function saveTopic(topic: Topic): Promise<{ ok: true; updated: string } | { ok: false; error: string }> {
  for (const c of topic.chapters) {
    if (!/^\d{4}-\d{2}$/.test(c.date)) return { ok: false, error: `"${c.title || "Untitled chapter"}" needs a month.` };
  }
  const updated = today();
  try {
    await writeTopic({ ...topic, updated });
    return { ok: true, updated };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    return {
      ok: false,
      error:
        code === "invalid_argument"
          ? "Couldn't save: only the page's owner or editors can save, and a topic must stay under 256 KB."
          : `Couldn't save (${(e as { message?: string })?.message ?? String(e)}). Try again in a moment.`,
    };
  }
}

export async function createTopic() {
  throw new Error("Not used in the phone build");
}
