import type { Board } from "@/lib/board";
import { getDb } from "./store";

// The Playground lives in one document, board/main, next to your notes

export async function subscribeBoard(next: (b: Board) => void) {
  const db = await getDb();
  if (!db) {
    next({ shapes: [] });
    return () => {};
  }
  return db.collection("board").onSnapshot(
    (snap) => {
      const doc = snap.docs.map((d) => d.data()).find((d) => Array.isArray(d?.shapes));
      next((doc as unknown as Board) ?? { shapes: [] });
    },
    () => next({ shapes: [] }),
  );
}

export async function saveBoard(board: Board) {
  const db = await getDb();
  if (!db) return;
  await db.doc("board/main").set(JSON.parse(JSON.stringify({ ...board, updated: new Date().toISOString() })));
}
