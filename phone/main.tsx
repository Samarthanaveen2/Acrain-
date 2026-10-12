import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import SiteHeader from "@/components/SiteHeader";
import TopicCard from "@/components/TopicCard";
import ComingSoon from "@/components/ComingSoon";
import TopicView from "@/components/topic/TopicView";
import TopicEditor from "@/components/editor/TopicEditor";
import { newTopicMeta } from "@/lib/templates";
import type { Topic } from "@/lib/types";
import { getDb, slugify, writeTopic } from "./store";
import { navigate, usePath } from "./router";
import Link from "./link-shim";

type Load = { state: "loading" } | { state: "offline" } | { state: "ready"; topics: Topic[] };

const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const wrap = "mx-auto max-w-[1166px] px-4 pb-24 min-[731px]:px-8";
const input =
  "mt-1.5 w-full rounded-md border-[1.5px] border-[#111] bg-background px-3 py-2 text-[1.3rem] outline-none focus:border-accent";
const button =
  "rounded-md border-[1.5px] border-[#111] bg-[#111] px-4 py-1.5 text-[1.3rem] text-background hover:bg-transparent hover:text-[#111] disabled:opacity-50";

function useTopics(): Load {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  useEffect(() => {
    let stop: (() => void) | undefined;
    getDb().then((db) => {
      if (!db) return setLoad({ state: "offline" });
      stop = db.collection("topics").onSnapshot(
        (snap) =>
          setLoad({
            state: "ready",
            topics: snap.docs
              .map((d) => d.data() as unknown as Topic)
              .filter(Boolean)
              .sort((a, b) => a.title.localeCompare(b.title)),
          }),
        () => setLoad({ state: "offline" }),
      );
    });
    return () => stop?.();
  }, []);
  return load;
}

function Home({ load }: { load: Load }) {
  const topics = load.state === "ready" ? load.topics : [];
  return (
    <div className={wrap}>
      <SiteHeader title="Acrain" byline="Samartha" />
      <div className="prose-acrain max-w-[700px]">
        <p>A personal forecast of the next decade, and the options I&rsquo;m keeping open.</p>
      </div>
      <section id="topics" className="scroll-mt-8 pt-12">
        <div className="flex items-baseline justify-between gap-4 border-b border-[#666]/40 pb-2">
          <h2 className="text-[2.2rem]">Topics</h2>
          {load.state === "ready" && (
            <Link
              href="/new"
              className="rounded-md border-[1.5px] border-[#111] bg-[#111] px-2.5 py-0.5 text-[1.2rem] text-background no-underline"
            >
              + New topic
            </Link>
          )}
        </div>
        {load.state === "loading" && <p className="mt-6 font-mono text-[13px] text-[#777]">Loading your topics…</p>}
        {load.state === "offline" && (
          <p className="mt-6 max-w-[700px] text-[1.25rem] text-[#555]">
            Your saved topics can&rsquo;t load in this view. Open this page in claude.ai while signed in to read and write.
          </p>
        )}
        {load.state === "ready" &&
          (topics.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {topics.map((t) => (
                <TopicCard
                  key={t.slug}
                  href={`/topics/${t.slug}`}
                  span={t.span}
                  title={t.title}
                  summary={t.summary}
                  status={`${t.chapters.length} ${t.chapters.length === 1 ? "chapter" : "chapters"}`}
                />
              ))}
            </div>
          ) : (
            <div className="prose-acrain mt-6 max-w-[700px]">
              <p className="text-[#555]">
                No topics yet. Tap <b>New topic</b>, give it a title, then write it chapter by chapter while the
                ai-2027-style dashboard fills in beside you.
              </p>
            </div>
          ))}
      </section>
    </div>
  );
}

function NewTopic({ topics }: { topics: Topic[] }) {
  const [title, setTitle] = useState("");
  const [span, setSpan] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const base = slugify(title) || "topic";
    const taken = new Set(topics.map((t) => t.slug));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    try {
      await writeTopic({
        ...newTopicMeta(slug, { title: title.trim(), span: span.trim(), summary: summary.trim(), author: "Samartha", today: today() }),
        chapters: [],
      });
      navigate(`/topics/${slug}/edit`);
    } catch (err) {
      setError(`Couldn't create the topic (${(err as { message?: string })?.message ?? String(err)}).`);
      setBusy(false);
    }
  };
  return (
    <div className={wrap}>
      <SiteHeader title="New topic" />
      <form onSubmit={submit} className="grid max-w-[700px] gap-6">
        <label className="block text-[1.3rem]">
          Title
          <input id="new-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. AI 2030" className={input} />
        </label>
        <label className="block text-[1.3rem]">
          Time span <span className="text-[#777]">(optional)</span>
          <input id="new-span" value={span} onChange={(e) => setSpan(e.target.value)} placeholder="e.g. 2026 → 2030" className={input} />
        </label>
        <label className="block text-[1.3rem]">
          One-line summary <span className="text-[#777]">(optional)</span>
          <input id="new-summary" value={summary} onChange={(e) => setSummary(e.target.value)} className={input} />
        </label>
        <p className="font-mono text-[13px] leading-relaxed text-[#777]">
          The topic starts with ai-2027&rsquo;s dashboard: AI R&amp;D lines, Hacking / Coding / Politics / Bioweapons /
          Robotics / Forecasting, Compute, agent copies, key stats and tech buckets. You fill in every number.
        </p>
        {error && <p className="font-mono text-[13px] text-[#8b0000]">{error}</p>}
        <div>
          <button type="submit" disabled={busy} className={button}>
            {busy ? "Creating…" : "Create and start writing"}
          </button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const path = usePath();
  const load = useTopics();
  const topics = load.state === "ready" ? load.topics : [];
  const m = path.match(/^\/topics\/([^/]+)(\/edit)?$/);

  if (path === "/new") return <NewTopic topics={topics} />;
  if (path === "/optionality")
    return (
      <ComingSoon title="Optionality">
        <p>A map of every path you&rsquo;re keeping open across all topics. Coming in a later phase.</p>
      </ComingSoon>
    );
  if (path === "/about")
    return (
      <ComingSoon title="About">
        <p>Acrain is my own version of ai-2027.com: scenarios written for one reader, me.</p>
      </ComingSoon>
    );
  if (m) {
    const topic = topics.find((t) => t.slug === m[1]);
    if (!topic) return <div className={`${wrap} pt-10 font-mono text-[13px] text-[#777]`}>{load.state === "loading" ? "Loading…" : "Topic not found."}</div>;
    // The editor keeps its own copy while you write; remount only when switching topics
    return m[2] ? <TopicEditor key={topic.slug} initial={topic} /> : <TopicView key={topic.slug + topic.updated} topic={topic} />;
  }
  return <Home load={load} />;
}

createRoot(document.getElementById("acrain-root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
