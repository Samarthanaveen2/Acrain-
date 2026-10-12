import { useEffect, useState } from "react";
import type { Positions } from "@/lib/map";
import { getDb } from "./store";

// Where you've dragged dots on the Map, one document at map/layout

export function useMapLayout() {
  const [positions, setPositions] = useState<Positions | null>(null);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let alive = true;
    getDb().then((db) => {
      if (!alive) return;
      if (!db) return setPositions({});
      stop = db.collection("map").onSnapshot(
        (snap) => {
          const doc = snap.docs.map((d) => d.data()).find((d) => d?.kind === "layout");
          setPositions((doc?.positions as Positions) ?? {});
        },
        () => setPositions({}),
      );
    });
    return () => {
      alive = false;
      stop?.();
    };
  }, []);
  return positions;
}

export async function saveLayout(positions: Positions) {
  const db = await getDb();
  if (!db) return;
  await db.doc("map/layout").set({ kind: "layout", positions });
}
