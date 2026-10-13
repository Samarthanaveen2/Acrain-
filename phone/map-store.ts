import { useEffect, useState } from "react";
import type { Positions, Positions3 } from "@/lib/map";
import { getDb } from "./store";

// Where dots sit on the Map: map/layout (flat, where you dragged them) and map/layout3d (the night sky)

export function useMapLayout() {
  const [state, setState] = useState<{ flat: Positions; space: Positions3 } | null>(null);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let alive = true;
    getDb().then((db) => {
      if (!alive) return;
      if (!db) return setState({ flat: {}, space: {} });
      stop = db.collection("map").onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => d.data());
          setState({
            flat: (docs.find((d) => d?.kind === "layout")?.positions as Positions) ?? {},
            space: (docs.find((d) => d?.kind === "layout3d")?.positions as Positions3) ?? {},
          });
        },
        () => setState({ flat: {}, space: {} }),
      );
    });
    return () => {
      alive = false;
      stop?.();
    };
  }, []);
  return state;
}

export async function saveLayout(positions: Positions) {
  const db = await getDb();
  if (!db) return;
  await db.doc("map/layout").set({ kind: "layout", positions });
}

export async function saveLayout3d(positions: Positions3) {
  const db = await getDb();
  if (!db) return;
  await db.doc("map/layout3d").set({ kind: "layout3d", positions });
}
