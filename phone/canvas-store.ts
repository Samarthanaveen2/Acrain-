import type { Canvas, Shape } from "@/lib/board";
import { getDb } from "./store";

// Each canvas is one document at canvases/<id>, next to your notes.
// The old single board (board/main) moves in once as "My first canvas"; the old copy is left as it was.

export async function subscribeCanvases(next: (canvases: Canvas[]) => void) {
  const db = await getDb();
  if (!db) {
    next([]);
    return () => {};
  }
  let moved = false;
  return db.collection("canvases").onSnapshot(
    (snap) => {
      const list = snap.docs.map((d) => d.data() as unknown as Canvas).filter((c) => c && c.id && Array.isArray(c.shapes));
      if (!list.length && !moved) {
        moved = true;
        let done = false;
        const stop: () => void = db.collection("board").onSnapshot((old) => {
          if (done) return;
          done = true;
          queueMicrotask(() => stop());
          const doc = old.docs.map((d) => d.data()).find((d) => Array.isArray(d?.shapes) && (d.shapes as Shape[]).length);
          if (!doc) return next([]);
          const now = new Date().toISOString();
          const first: Canvas = { id: "first", title: "My first canvas", shapes: doc.shapes as Shape[], created: now, updated: (doc.updated as string) ?? now };
          saveCanvas(first);
        });
        return;
      }
      next(list);
    },
    () => next([]),
  );
}

export async function saveCanvas(canvas: Canvas) {
  const db = await getDb();
  if (!db) return;
  await db.doc(`canvases/${canvas.id}`).set(JSON.parse(JSON.stringify({ ...canvas, updated: new Date().toISOString() })));
}

export async function deleteCanvas(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.doc(`canvases/${id}`).delete();
}
