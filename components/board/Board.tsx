"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize, Redo2, Undo2 } from "lucide-react";
import {
  addUnder,
  boardBounds,
  bounds,
  bringFront,
  duplicate,
  isFramed,
  newId,
  patch,
  record,
  redo,
  remove,
  sendBack,
  snapStack,
  stackChain,
  undo,
  type Board as BoardData,
  type Framed,
  type History,
  type Rect,
  type Shape,
} from "@/lib/board";
import ShapeBar from "./ShapeBar";
import Shapes, { type Corner } from "./Shapes";
import ToolRail, { type Tool } from "./ToolRail";

type Cam = { x: number; y: number; k: number };
type P = { x: number; y: number };
type Op =
  | { kind: "pan"; start: P; cam: Cam; moved: boolean }
  | { kind: "pinch"; dist: number; mid: P; cam: Cam }
  | { kind: "move"; id: string; start: P; orig: Rect; before: Shape[]; moved: boolean }
  | { kind: "resize"; id: string; corner: Corner; start: P; orig: Rect; before: Shape[] }
  | { kind: "create"; tool: Exclude<Tool, "select">; start: P; startWorld: P; id: string | null; before: Shape[] };

const TAP = 6;
const MIN_K = 0.2;
const MAX_K = 4;
const CAM_KEY = "acrain-board-cam";
const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));
const DEFAULT = { box: { w: 168, h: 64 }, sticky: { w: 170, h: 150 }, text: { w: 220, h: 30 } };

function loadCam(): Cam | null {
  try {
    const c = JSON.parse(localStorage.getItem(CAM_KEY) ?? "null");
    return c && typeof c.k === "number" ? c : null;
  } catch {
    return null;
  }
}

/** The Playground: an endless board. Tools on the right edge; two fingers move around. */
export default function Board({
  board,
  onSave,
  onOpenNote,
  focus,
}: {
  board: BoardData | null;
  onSave: (b: BoardData) => void;
  onOpenNote: (title: string) => void;
  /** A shape to fly to (from a note) */
  focus?: string | null;
}) {
  const view = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cam, setCamState] = useState<Cam>(() => loadCam() ?? { x: 40, y: 80, k: 1 });
  const camRef = useRef(cam);
  const setCam = useCallback((c: Cam) => {
    camRef.current = c;
    setCamState(c);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CAM_KEY, JSON.stringify(cam));
      } catch {
        // private mode: the camera just won't be remembered
      }
    }, 300);
    return () => clearTimeout(t);
  }, [cam]);

  const [shapes, setShapes] = useState<Shape[] | null>(board ? board.shapes : null);
  const [hist, setHist] = useState<History>({ past: [], future: [] });
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [snapped, setSnapped] = useState<string | null>(null);
  const editBefore = useRef<Shape[] | null>(null);

  // The board arrives from storage once; after that, this screen owns it
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first load from storage
    if (shapes === null && board) setShapes(board.shapes);
  }, [board, shapes]);

  // Save shortly after any change
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  });
  const lastSaved = useRef<Shape[] | null>(null);
  useEffect(() => {
    if (!shapes) return;
    if (lastSaved.current === null) {
      lastSaved.current = shapes;
      return;
    }
    if (lastSaved.current === shapes) return;
    const t = setTimeout(() => {
      lastSaved.current = shapes;
      saveRef.current({ shapes });
    }, 500);
    return () => clearTimeout(t);
  }, [shapes]);
  // Leaving the screen saves straight away
  const latest = useRef(shapes);
  useEffect(() => {
    latest.current = shapes;
  });
  useEffect(
    () => () => {
      if (latest.current && latest.current !== lastSaved.current) saveRef.current({ shapes: latest.current });
    },
    [],
  );

  useLayoutEffect(() => {
    const el = view.current!;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = shapes ?? [];
  const commit = (next: Shape[], before: Shape[] = all) => {
    setHist((h) => record(h, before));
    setShapes(next);
  };

  const toWorld = (p: P, c: Cam = camRef.current): P => ({ x: (p.x - c.x) / c.k, y: (p.y - c.y) / c.k });
  const local = (e: { clientX: number; clientY: number }): P => {
    const r = view.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const fit = () => {
    const b = boardBounds(all);
    if (!b || !size.w) return setCam({ x: size.w / 2, y: size.h / 3, k: 1 });
    const k = clampK(Math.min((size.w - 90) / Math.max(b.w, 1), (size.h - 80) / Math.max(b.h, 1), 1.4));
    setCam({ k, x: (size.w - 50) / 2 - (b.x + b.w / 2) * k, y: size.h / 2 - (b.y + b.h / 2) * k });
  };

  // Bring a shape into view: used when opening it for writing (keyboard) and when coming from a note
  const showShape = (id: string, where: "top" | "centre", list: Shape[] = all) => {
    const s = list.find((x) => x.id === id);
    const r = s && bounds(s, list);
    if (!r) return;
    const c = camRef.current;
    const k = where === "centre" ? Math.max(c.k, 0.9) : c.k;
    const sy = r.y * k + c.y;
    if (where === "top" && sy > 60 && sy < size.h * 0.35) return;
    setCam({ k, x: size.w / 2 - (r.x + r.w / 2) * k, y: (where === "top" ? size.h * 0.18 : size.h / 2) - (where === "top" ? r.y : r.y + r.h / 2) * k });
  };

  const startEdit = (id: string, before: Shape[] = all, list: Shape[] = all) => {
    editBefore.current = before;
    setSelected(id);
    setEditing(id);
    showShape(id, "top", list);
  };
  const endEdit = () => {
    if (!editing) return;
    const before = editBefore.current;
    editBefore.current = null;
    const s = all.find((x) => x.id === editing);
    setEditing(null);
    if (s?.type === "text" && !s.text.trim()) {
      // An empty text box isn't worth keeping
      setShapes(before ?? remove(all, s.id));
      setSelected(null);
      return;
    }
    if (before && before !== all) setHist((h) => record(h, before));
  };

  // Coming from a note: fly to that box
  const flown = useRef(false);
  useEffect(() => {
    if (!focus || flown.current || !shapes || !size.w) return;
    flown.current = true;
    showShape(focus, "centre", shapes);
    setSelected(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, shapes, size.w]);

  // ---- Gestures ----
  const pointers = useRef(new Map<number, P>());
  const op = useRef<Op | null>(null);
  // While a finger is busy, the selection bar steps aside
  const [busy, setBusy] = useState(false);

  const startPinch = () => {
    const cur = op.current;
    // A second finger cancels whatever the first one was doing
    if (cur && (cur.kind === "move" || cur.kind === "resize" || cur.kind === "create")) setShapes(cur.before);
    const [a, b] = [...pointers.current.values()];
    op.current = { kind: "pinch", dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, cam: camRef.current };
  };

  const down = (e: React.PointerEvent) => {
    if (!shapes) return;
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // not a real pointer (tests)
    }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    setBusy(true);
    if (pointers.current.size === 2) return startPinch();
    if (pointers.current.size > 2) return;
    if (editing) endEdit();

    const t = e.target as Element;
    const handle = t.closest("[data-handle]")?.getAttribute("data-handle") as Corner | null;
    const shapeId = t.closest("[data-shape]")?.getAttribute("data-shape") ?? null;
    const shape = shapeId ? all.find((s) => s.id === shapeId) : null;

    if (tool === "select") {
      if (handle && shape && isFramed(shape) && selected === shape.id) {
        op.current = { kind: "resize", id: shape.id, corner: handle, start: p, orig: bounds(shape)!, before: all };
      } else if (shape && isFramed(shape)) {
        op.current = { kind: "move", id: shape.id, start: p, orig: bounds(shape)!, before: all, moved: false };
      } else op.current = { kind: "pan", start: p, cam: camRef.current, moved: false };
      return;
    }
    op.current = { kind: "create", tool, start: p, startWorld: toWorld(p), id: null, before: all };
  };

  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const o = op.current;
    if (!o) return;
    if (o.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = clampK(o.cam.k * ((Math.hypot(b.x - a.x, b.y - a.y) || 1) / o.dist));
      const w = toWorld(o.mid, o.cam);
      setCam({ k, x: mid.x - w.x * k, y: mid.y - w.y * k });
      return;
    }
    const dx = p.x - ("start" in o ? o.start.x : 0);
    const dy = p.y - ("start" in o ? o.start.y : 0);
    const far = Math.hypot(dx, dy) >= TAP;
    const k = camRef.current.k;
    if (o.kind === "pan") {
      if (!o.moved && !far) return;
      o.moved = true;
      setCam({ ...o.cam, x: o.cam.x + dx, y: o.cam.y + dy });
    } else if (o.kind === "move") {
      if (!o.moved && !far) return;
      o.moved = true;
      let r = { ...o.orig, x: o.orig.x + dx / k, y: o.orig.y + dy / k };
      const s = o.before.find((x) => x.id === o.id);
      let to: string | null = null;
      if (s?.type === "box") ({ rect: r, to } = snapStack(o.before, o.id, r, 16 / k));
      setSnapped(to);
      setShapes(patch(o.before, o.id, { x: r.x, y: r.y }));
    } else if (o.kind === "resize") {
      const s = o.before.find((x) => x.id === o.id) as Framed;
      const minW = 40;
      const minH = s.type === "text" ? s.h : 30;
      let { x, y, w, h } = o.orig;
      if (o.corner.endsWith("e")) w = Math.max(minW, o.orig.w + dx / k);
      if (o.corner.endsWith("w")) {
        w = Math.max(minW, o.orig.w - dx / k);
        x = o.orig.x + o.orig.w - w;
      }
      if (s.type !== "text") {
        if (o.corner.startsWith("s")) h = Math.max(minH, o.orig.h + dy / k);
        if (o.corner.startsWith("n")) {
          h = Math.max(minH, o.orig.h - dy / k);
          y = o.orig.y + o.orig.h - h;
        }
      }
      let next = patch(o.before, o.id, { x, y, w, h });
      // Growing a slab in a stack pushes the slabs under it (or above it) along
      if (s.type === "box" && h !== o.orig.h) {
        const dirn = o.corner.startsWith("s") ? "below" : "above";
        const shift = dirn === "below" ? h - o.orig.h : -(h - o.orig.h);
        for (const b of stackChain(o.before, o.id, dirn)) next = patch(next, b.id, { y: b.y + shift });
      }
      setShapes(next);
    } else if (o.kind === "create") {
      if (!o.id && !far) return;
      if (o.tool === "text") return; // text is placed with a tap
      const a = o.startWorld;
      const b = toWorld(p);
      const r = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(30, Math.abs(b.x - a.x)), h: Math.max(30, Math.abs(b.y - a.y)) };
      if (!o.id) {
        o.id = newId();
        setShapes([...o.before, makeShape(o.tool, o.id, r)]);
      } else setShapes(patch([...o.before, makeShape(o.tool, o.id, r)], o.id, r));
    }
  };

  const up = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (!pointers.current.size) setBusy(false);
    const o = op.current;
    if (o?.kind === "pinch") {
      const rest = [...pointers.current.values()][0];
      op.current = rest ? { kind: "pan", start: rest, cam: camRef.current, moved: true } : null;
      return;
    }
    op.current = null;
    if (!o || e.type === "pointercancel") {
      if (o && (o.kind === "move" || o.kind === "resize" || o.kind === "create")) setShapes(o.before);
      return;
    }
    if (o.kind === "pan") {
      if (!o.moved) {
        setSelected(null);
        setEditing(null);
      }
    } else if (o.kind === "move") {
      if (!o.moved) {
        // Tap: select it; tap again to write in it
        if (selected === o.id) startEdit(o.id);
        else setSelected(o.id);
      } else {
        setHist((h) => record(h, o.before));
        setSelected(o.id);
        if (snapped) {
          const id = o.id;
          setSnapped(null);
          setBump(id);
        }
      }
    } else if (o.kind === "resize") {
      setHist((h) => record(h, o.before));
    } else if (o.kind === "create") {
      let id = o.id;
      let list = shapes!;
      if (!id) {
        // A tap: a shape of a comfortable size, centred where you tapped
        id = newId();
        const d = DEFAULT[o.tool];
        const w = o.startWorld;
        const r = { x: w.x - (o.tool === "text" ? 0 : d.w / 2), y: w.y - d.h / 2, w: d.w, h: d.h };
        list = [...o.before, makeShape(o.tool, id, r)];
        setShapes(list);
      }
      setTool("select");
      startEdit(id, o.before, list);
    }
  };

  // A little bump when a slab clicks into a stack
  const [bump, setBump] = useState<string | null>(null);
  useEffect(() => {
    if (!bump) return;
    const t = setTimeout(() => setBump(null), 320);
    return () => clearTimeout(t);
  }, [bump]);

  const wheel = (e: React.WheelEvent) => {
    const c = camRef.current;
    const p = local(e);
    if (e.ctrlKey || e.metaKey) {
      const k = clampK(c.k * Math.exp(-e.deltaY * 0.01));
      const w = toWorld(p);
      setCam({ k, x: p.x - w.x * k, y: p.y - w.y * k });
    } else setCam({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY });
  };

  // ---- Selection bar ----
  const sel = selected ? all.find((s) => s.id === selected) : null;
  const selRect = sel ? bounds(sel, all) : null;
  let bar: { left: number; top: number } | null = null;
  if (sel && selRect && !editing && !busy) {
    const left = Math.min(size.w - 150, Math.max(150, (selRect.x + selRect.w / 2) * cam.k + cam.x));
    let top = selRect.y * cam.k + cam.y - 58;
    if (top < 54) top = Math.max(54, (selRect.y + selRect.h) * cam.k + cam.y + 22); // never over the undo corner
    bar = { left, top };
  }
  const act = (fn: (s: Shape[]) => Shape[]) => commit(fn(all));

  const empty = shapes !== null && shapes.length === 0;

  return (
    <div
      ref={view}
      className="bd-view"
      style={{
        backgroundSize: `${24 * cam.k}px ${24 * cam.k}px`,
        backgroundPosition: `${cam.x}px ${cam.y}px`,
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onWheel={wheel}
    >
      <div className="bd-world" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})` }}>
        {shapes && (
          <Shapes
            shapes={shapes}
            selected={selected}
            editing={editing}
            k={cam.k}
            snapped={bump ?? snapped}
            onText={(id, text) => setShapes((list) => (list ? patch(list, id, { text }) : list))}
            onEditEnd={endEdit}
            onMeasure={(id, h) => setShapes((list) => (list ? patch(list, id, { h }) : list))}
            onOpenNote={onOpenNote}
          />
        )}
      </div>

      {empty && (
        <p className="pointer-events-none absolute inset-x-6 top-1/3 text-center text-[1.35rem] leading-snug text-[#999] italic">
          Pick a tool on the right and tap anywhere.
          <br />
          Two fingers to move around and zoom.
        </p>
      )}

      <div className="bd-corner" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Undo"
          disabled={!hist.past.length}
          onClick={() => {
            const r = undo(hist, all);
            if (r) {
              setHist(r.h);
              setShapes(r.shapes);
              setEditing(null);
            }
          }}
          className="bd-btn"
        >
          <Undo2 size={18} />
        </button>
        <button
          type="button"
          aria-label="Redo"
          disabled={!hist.future.length}
          onClick={() => {
            const r = redo(hist, all);
            if (r) {
              setHist(r.h);
              setShapes(r.shapes);
              setEditing(null);
            }
          }}
          className="bd-btn"
        >
          <Redo2 size={18} />
        </button>
        <button type="button" aria-label="Fit" onClick={fit} className="bd-btn">
          <Maximize size={16} />
        </button>
        <span className="font-mono text-[10px] text-[#888]">{Math.round(cam.k * 100)}%</span>
      </div>

      <div onPointerDown={(e) => e.stopPropagation()}>
        <ToolRail
          tool={tool}
          onTool={(t) => {
            setTool(t);
            setSelected(null);
            if (editing) endEdit();
          }}
        />
      </div>

      {sel && bar && (
        <ShapeBar
          shape={sel}
          left={bar.left}
          top={bar.top}
          onColour={(colour) => act((s) => patch(s, sel.id, { colour } as Partial<Shape>))}
          onSize={(z) => act((s) => patch(s, sel.id, { size: z } as Partial<Shape>))}
          onUnder={() => {
            const r = addUnder(all, sel.id);
            if (!r) return;
            setShapes(r.shapes);
            startEdit(r.id, all, r.shapes);
          }}
          onEdit={() => startEdit(sel.id)}
          onDuplicate={() => {
            const r = duplicate(all, sel.id);
            if (!r) return;
            commit(r.shapes);
            setSelected(r.id);
          }}
          onFront={() => act((s) => bringFront(s, sel.id))}
          onBack={() => act((s) => sendBack(s, sel.id))}
          onDelete={() => {
            act((s) => remove(s, sel.id));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function makeShape(tool: Exclude<Tool, "select">, id: string, r: Rect): Shape {
  if (tool === "box") return { id, type: "box", ...r, text: "", colour: "paper" };
  if (tool === "sticky") return { id, type: "sticky", ...r, text: "", colour: "gold" };
  return { id, type: "text", x: r.x, y: r.y, w: r.w, h: r.h, text: "", size: "m" };
}
