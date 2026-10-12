import { useSyncExternalStore } from "react";

// In-memory routing with a back stack (the app has no browser URL bar)
let stack: string[] = ["/"];
const listeners = new Set<() => void>();

function show(to: string) {
  listeners.forEach((l) => l());
  const hash = to.split("#")[1];
  requestAnimationFrame(() => {
    const el = hash ? document.getElementById(hash) : null;
    if (el) el.scrollIntoView();
    else window.scrollTo(0, 0);
  });
}

/** Go to a screen. Tabs reset the history; `replace` swaps the current screen (e.g. after creating a note). */
export function navigate(to: string, opts: { replace?: boolean; root?: boolean } = {}) {
  const path = to.split("#")[0] || "/";
  if (opts.root) stack = [path];
  else if (opts.replace) stack = [...stack.slice(0, -1), path];
  else if (stack[stack.length - 1] !== path) stack = [...stack, path];
  show(to);
}

export function back() {
  stack = stack.length > 1 ? stack.slice(0, -1) : ["/"];
  show(stack[stack.length - 1]);
}

export const canGoBack = () => stack.length > 1;

export function usePath() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => stack[stack.length - 1],
    () => stack[stack.length - 1],
  );
}
