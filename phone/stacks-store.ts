import type { Stack } from "@/lib/stacks";
import { getDb } from "./store";

// Stacks live next to notes in the app's storage, one document per stack at stacks/<id>

export async function subscribeStacks(next: (stacks: Stack[]) => void) {
  const db = await getDb();
  if (!db) {
    next([]);
    return () => {};
  }
  return db.collection("stacks").onSnapshot(
    (snap) => next(snap.docs.map((d) => d.data() as unknown as Stack).filter((s) => s && s.id && Array.isArray(s.layers))),
    () => next([]),
  );
}

export async function saveStack(stack: Stack) {
  const db = await getDb();
  if (!db) throw new Error("Saving isn't available in this view");
  await db.doc(`stacks/${stack.id}`).set(JSON.parse(JSON.stringify(stack)));
}

export async function deleteStack(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Saving isn't available in this view");
  await db.doc(`stacks/${id}`).delete();
}
