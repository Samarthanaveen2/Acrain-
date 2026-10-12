import { useSyncExternalStore } from "react";

// In-memory routing for the phone page (artifact pages can't use URL paths)
let path = "/";
const listeners = new Set<() => void>();

export function navigate(to: string) {
  const [p, hash] = to.split("#");
  path = p || "/";
  listeners.forEach((l) => l());
  requestAnimationFrame(() => {
    const el = hash ? document.getElementById(hash) : null;
    if (el) el.scrollIntoView();
    else window.scrollTo(0, 0);
  });
}

export function usePath() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => path,
    () => path,
  );
}
