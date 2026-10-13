import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import SiteHeader from "@/components/SiteHeader";
import ComingSoon from "@/components/ComingSoon";
import NotesHome from "@/components/notes/NotesHome";
import NoteView from "@/components/notes/NoteView";
import NoteEditor from "@/components/notes/NoteEditor";
import StacksHome from "@/components/stacks/StacksHome";
import StackView from "@/components/stacks/StackView";
import { findNote, freeId, type Note } from "@/lib/notes";
import { layersForNote, newStack, type Stack } from "@/lib/stacks";
import { NotesContext } from "@/components/notes/rich/context";
import { createNote, deleteNote, saveNote, subscribeNotes } from "./notes-store";
import { back, navigate, usePath } from "./router";
import TabBar from "./TabBar";
import Settings from "./Settings";
import { deleteStack, saveStack, subscribeStacks } from "./stacks-store";

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

function useStacks() {
  const [state, setState] = useState<{ status: "loading" | "ready"; stacks: Stack[] }>({ status: "loading", stacks: [] });
  useEffect(() => {
    let stop: (() => void) | undefined;
    let alive = true;
    subscribeStacks((stacks) => alive && setState({ status: "ready", stacks })).then((s) => (alive ? (stop = s) : s()));
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
    if (existing) return navigate(`/notes/${existing.id}`, { replace: true });
    const now = new Date().toISOString();
    const note: Note = { id: freeId(notes, t), title: t.trim(), body: "", tags: [], created: now, updated: now };
    try {
      await createNote(note);
      navigate(`/notes/${note.id}/edit`, { replace: true });
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

function Screen({ path, status, notes, stacks }: { path: string; status: Status; notes: Note[]; stacks: { status: "loading" | "ready"; stacks: Stack[] } }){
  const [route, query = ""] = path.split("?");
  const m = route.match(/^\/notes\/([^/]+)(\/edit)?$/);
  const restore = async (list: Note[], stackList: Stack[]) => {
    for (const n of list) await createNote(n);
    for (const st of stackList) await saveStack(st);
  };

  if (route === "/new-note") {
    const title = new URLSearchParams(query).get("title") ?? "";
    if (status !== "ready") return <p className={`${wrap} pt-10 font-mono text-[13px] text-[#777]`}>Loading…</p>;
    return <NewNote key={title} notes={notes} initialTitle={title} />;
  }
  if (route === "/stacks")
    return (
      <StacksHome
        stacks={stacks.stacks}
        status={stacks.status}
        onCreate={async (title) => {
          const st = newStack(title, stacks.stacks);
          await saveStack(st);
          navigate(`/stacks/${st.id}`);
        }}
      />
    );
  const sm = route.match(/^\/stacks\/([^/]+)$/);
  if (sm) {
    const st = stacks.stacks.find((x) => x.id === sm[1]);
    if (!st) return <p className={`${wrap} pt-10 font-mono text-[13px] text-[#777]`}>{stacks.status === "loading" ? "Loading…" : "Stack not found."}</p>;
    return (
      <StackView
        key={`${st.id}:${query}`}
        stack={st}
        stacks={stacks.stacks}
        notes={notes}
        focus={new URLSearchParams(query).get("focus")}
        onSave={saveStack}
        onDelete={async () => {
          await deleteStack(st.id);
          navigate("/stacks", { root: true });
        }}
        onBack={back}
      />
    );
  }
  if (route === "/settings") return <Settings notes={notes} stacks={stacks.stacks} onRestore={restore} />;
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
            onBack={back}
            onDone={() => navigate(`/notes/${note.id}`, { replace: true })}
            onDelete={async (n) => {
              await deleteNote(n.id);
              navigate("/", { root: true });
            }}
          />
        ) : (
          <NoteView
            key={note.id}
            note={note}
            notes={notes}
            onBack={back}
            inStacks={layersForNote(stacks.stacks, note.title).map(({ stack, layer }) => ({
              href: `/stacks/${stack.id}?focus=${layer.id}`,
              stack: stack.title,
              layer: layer.parent ? layer.name : "",
            }))}
          />
        )}
      </NotesContext.Provider>
    );
  }
  const tag = new URLSearchParams(query).get("tag");
  return <NotesHome key={tag ?? ""} notes={notes} status={status} initialTag={tag} />;
}

function App() {
  const path = usePath();
  const { status, notes } = useNotes();
  const stacks = useStacks();
  // The editor gets the whole screen (and the keyboard); everywhere else shows the tabs
  const editing = /\/edit$/.test(path.split("?")[0]);
  return (
    <>
      <div className={editing ? "" : "pb-tabbar"}>
        <Screen path={path} status={status} notes={notes} stacks={stacks} />
      </div>
      {!editing && <TabBar path={path} />}
    </>
  );
}

createRoot(document.getElementById("acrain-root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
