// Entry for the native iPhone app (Capacitor). Notes are stored on the phone itself
// (iOS app storage via @capacitor/preferences), behind the same small db API the
// claude.ai version uses, so the rest of the app is unchanged.
import { Preferences } from "@capacitor/preferences";

type Listener = (snap: { docs: { data(): Record<string, unknown> }[] }) => void;
const KEY = "acrain-db";
let data: Record<string, Record<string, unknown>> = {};
const subs = new Map<string, Set<Listener>>();

const ready = Preferences.get({ key: KEY })
  .then((r) => {
    data = r.value ? JSON.parse(r.value) : {};
  })
  .catch(() => {
    data = {};
  });

const snap = (collection: string) => ({
  docs: Object.entries(data)
    .filter(([path]) => path.startsWith(`${collection}/`))
    .map(([, value]) => ({ data: () => structuredClone(value) })),
});
const fire = (path: string) => {
  const c = path.split("/")[0];
  subs.get(c)?.forEach((f) => f(snap(c)));
};
const persist = () => Preferences.set({ key: KEY, value: JSON.stringify(data) });

const db = {
  doc: (path: string) => ({
    async set(d: Record<string, unknown>) {
      await ready;
      data[path] = structuredClone(d);
      await persist();
      fire(path);
    },
    async delete() {
      await ready;
      delete data[path];
      await persist();
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

(window as unknown as { claude: unknown }).claude = { use: async (name: string) => (name === "db" ? db : null) };

// Start the app only after the storage above is in place
void import("./main");
