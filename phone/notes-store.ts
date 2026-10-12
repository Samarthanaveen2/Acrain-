import type { Note } from "@/lib/notes";
import { renameLinks } from "@/lib/notes";
import { getDb } from "./store";

// Notes live in the artifact's db, one document per note at notes/<id>

export async function subscribeNotes(next: (notes: Note[]) => void, fail: () => void) {
  const db = await getDb();
  if (!db) {
    fail();
    return () => {};
  }
  return db.collection("notes").onSnapshot(
    (snap) => next(snap.docs.map((d) => d.data() as unknown as Note).filter((n) => n && n.id)),
    fail,
  );
}

async function put(note: Note) {
  const db = await getDb();
  if (!db) throw new Error("Online saving isn't available in this view");
  await db.doc(`notes/${note.id}`).set(JSON.parse(JSON.stringify(note)));
}

/** Saves a note; if its title changed, rewrites [[Old title]] links in the other notes */
export async function saveNote(note: Note, previousTitle: string, all: Note[]) {
  await put(note);
  if (previousTitle && previousTitle.trim().toLowerCase() !== note.title.trim().toLowerCase()) {
    for (const other of all) {
      if (other.id === note.id) continue;
      const body = renameLinks(other.body, previousTitle, note.title);
      if (body !== other.body) await put({ ...other, body });
    }
  }
}

export async function createNote(note: Note) {
  await put(note);
}

export async function deleteNote(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Online saving isn't available in this view");
  await db.doc(`notes/${id}`).delete();
}
