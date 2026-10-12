import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import SiteHeader from "@/components/SiteHeader";
import ComingSoon from "@/components/ComingSoon";
import NotesHome from "@/components/notes/NotesHome";
import NoteView from "@/components/notes/NoteView";
import NoteEditor from "@/components/notes/NoteEditor";
import NotesMap from "@/components/notes/NotesMap";
import NotesTimeline from "@/components/notes/NotesTimeline";
import { findNote, freeId, type Note } from "@/lib/notes";
import { NotesContext } from "@/components/notes/rich/context";
import { createNote, deleteNote, saveNote, subscribeNotes } from "./notes-store";
import { navigate, usePath } from "./router";

type Status = "loading" | "offline" | "ready";
const wrap = "mx-auto max-w-[1166px] px-4 pb-24 min-[731px]:px-8";

function useNotes() {
  const [state, setState] = useState<{ status: Status; notes: Note[] }>({ status: "loading", notes: [] });
  useEffect(() => {
    let stop: (() => void) | undefined;
    let alive = true;
    subscribeNotes(
      (notes) => alive && setState({ status: "ready", notes }),
      () => alive && setState((s) => ({ ...s, status: "offline" })),
    ).then((s) => (alive ? (stop = s) : s()));
    return () => {
      alive = false;
      stop?.();
    };
  }, []);
  return state;
}

/** Creates a note (from a [[link]] or the New note button) and opens it for writing */
function NewNote({ notes, initialTitle }: { notes: Note[]; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState("");
  const started = useRef(false);

  const create = async (t: string) => {
    if (started.current || !t.trim()) return;
    started.current = true;
    const existing = findNote(notes, t);
    if (existing) return navigate(`/notes/${existing.id}`);
    const now = new Date().toISOString();
    const note: Note = { id: freeId(notes, t), title: t.trim(), body: "", tags: [], created: now, updated: now };
    try {
      await createNote(note);
      navigate(`/notes/${note.id}/edit`);
    } catch (e) {
      started.current = false;
      setError(`Couldn't create the note (${(e as { message?: string })?.message ?? String(e)}).`);
    }
  };

  // Coming from a [[link]]: the title is known, so create straight away
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time create when opened from a [[link]]
    if (initialTitle) create(initialTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={wrap}>
      <SiteHeader title="New note" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create(title);
        }}
        className="grid max-w-[700px] gap-5"
      >
        <input
          aria-label="Title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the idea?"
          className="w-full rounded-md border-[1.5px] border-[#111] bg-background px-3 py-2 text-[1.8rem] outline-none"
        />
        {error && <p className="font-mono text-[13px] text-[#8b0000]">{error}</p>}
        <div>
          <button type="submit" className="rounded-md border-[1.5px] border-[#111] bg-[#111] px-4 py-1.5 text-[1.3rem] text-background">
            Start writing
          </button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const path = usePath();
  const { status, notes } = useNotes();
  const [route, query = ""] = path.split("?");
  const m = route.match(/^\/notes\/([^/]+)(\/edit)?$/);

  if (route === "/new-note") {
    const title = new URLSearchParams(query).get("title") ?? "";
    if (status !== "ready") return <p className={`${wrap} pt-10 font-mono text-[13px] text-[#777]`}>Loading…</p>;
    return <NewNote key={title} notes={notes} initialTitle={title} />;
  }
  if (route === "/map") return <NotesMap notes={notes} />;
  if (route === "/timeline") return <NotesTimeline notes={notes} />;
  if (route === "/about")
    return (
      <ComingSoon title="About">
        <p>Acrain is where I think about the world: notes on ideas, and the connections between them.</p>
      </ComingSoon>
    );
  const openNote = (title: string) => {
    const hit = findNote(notes, title);
    navigate(hit ? `/notes/${hit.id}` : `/new-note?title=${encodeURIComponent(title)}`);
  };
  if (m) {
    const note = notes.find((n) => n.id === m[1]);
    if (!note)
      return <p className={`${wrap} pt-10 font-mono text-[13px] text-[#777]`}>{status === "loading" ? "Loading…" : "Note not found."}</p>;
    return (
      <NotesContext.Provider value={{ notes, openNote }}>
        {m[2] ? (
      <NoteEditor
        key={note.id}
        initial={note}
        notes={notes}
        onSave={(n, prev) => saveNote(n, prev, notes)}
        onDelete={async (n) => {
          await deleteNote(n.id);
          navigate("/");
        }}
      />
    ) : (
      <NoteView key={note.id} note={note} notes={notes} />
        )}
      </NotesContext.Provider>
    );
  }
  const tag = new URLSearchParams(query).get("tag");
  return (
    <NotesHome
      key={tag ?? ""}
      notes={notes}
      status={status}
      initialTag={tag}
      onRestore={async (list) => {
        for (const n of list) await createNote(n);
      }}
    />
  );
}

createRoot(document.getElementById("acrain-root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
