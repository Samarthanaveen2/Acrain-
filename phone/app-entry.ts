// Entry for the native iPhone app (Capacitor). Notes are stored on the phone itself
// (iOS app storage via @capacitor/preferences), behind the same small db API the
// claude.ai version uses, so the rest of the app is unchanged.
//
// Storage layout: one key per collection ("acrain-db:notes", "acrain-db:canvases", …), so saving
// a drawing never rewrites your notes. Writes are batched and go out at least every few hundred
// milliseconds, and straight away when the app goes to the background. The original single key
// ("acrain-db") from older versions is read once and then left untouched as a safety copy.
import { Preferences } from "@capacitor/preferences";

type Listener = (snap: { docs: { data(): Record<string, unknown> }[] }) => void;
const OLD_KEY = "acrain-db";
const PREFIX = "acrain-db:";
const MARKER = "acrain-db:__split";
let data: Record<string, Record<string, unknown>> = {};
const subs = new Map<string, Set<Listener>>();

const collectionOf = (path: string) => path.split("/")[0];
const keyFor = (c: string) => PREFIX + c;
const collectionData = (c: string) => Object.fromEntries(Object.entries(data).filter(([p]) => collectionOf(p) === c));

// ---- Writing: batched per collection, one write at a time ----
const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let writing: Promise<void> = Promise.resolve();
function flush() {
  clearTimeout(timer);
  timer = undefined;
  if (!pending.size) return writing;
  const cs = [...pending];
  pending.clear();
  writing = writing.then(async () => {
    for (const c of cs) {
      try {
        await Preferences.set({ key: keyFor(c), value: JSON.stringify(collectionData(c)) });
      } catch {
        pending.add(c); // try again on the next flush
      }
    }
  });
  return writing;
}
function schedule(c: string) {
  pending.add(c);
  timer ??= setTimeout(flush, 250);
}
document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
window.addEventListener("pagehide", () => void flush());

// ---- Reading: the split keys if they're complete, otherwise the old single key (then split it) ----
const ready = (async () => {
  try {
    const { keys } = await Preferences.keys();
    if (keys.includes(MARKER)) {
      for (const k of keys) {
        if (!k.startsWith(PREFIX) || k === MARKER) continue;
        const { value } = await Preferences.get({ key: k });
        if (value) Object.assign(data, JSON.parse(value));
      }
      return;
    }
    const { value } = await Preferences.get({ key: OLD_KEY });
    data = value ? JSON.parse(value) : {};
    // Write every collection under its own key before trusting the split layout
    for (const c of new Set(Object.keys(data).map(collectionOf))) {
      await Preferences.set({ key: keyFor(c), value: JSON.stringify(collectionData(c)) });
    }
    await Preferences.set({ key: MARKER, value: "1" });
  } catch {
    data = data ?? {};
  }
})();

// Each document is copied once when saved; everyone reads that copy (the app never changes data in place)
const snap = (collection: string) => ({
  docs: Object.entries(data)
    .filter(([path]) => collectionOf(path) === collection)
    .map(([, value]) => ({ data: () => value })),
});
const fire = (path: string) => {
  const c = collectionOf(path);
  subs.get(c)?.forEach((f) => f(snap(c)));
};

const db = {
  doc: (path: string) => ({
    async set(d: Record<string, unknown>) {
      await ready;
      data[path] = structuredClone(d);
      schedule(collectionOf(path));
      fire(path);
    },
    async delete() {
      await ready;
      delete data[path];
      schedule(collectionOf(path));
      fire(path);
    },
  }),
  collection: (c: string) => ({
    onSnapshot(next: Listener) {
      if (!subs.has(c)) subs.set(c, new Set());
      subs.get(c)!.add(next);
      ready.then(() => next(snap(c)));
      return () => subs.get(c)?.delete(next);
    },
  }),
};

document.documentElement.classList.add("app");
// The app is never zoomed as a whole page; only the canvas zooms (it handles its own pinch)
for (const g of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(g, (e) => e.preventDefault());

(window as unknown as { claude: unknown }).claude = { use: async (name: string) => (name === "db" ? db : null) };

// Start the app only after the storage above is in place
void import("./main");
