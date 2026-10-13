"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize, Redo2, Undo2 } from "lucide-react";
import {
  addUnder,
  boardBounds,
  bounds,
  bringFront,
  endPoint,
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
  type End,
  type Framed,
  type History,
  type Rect,
  type Shape,
} from "@/lib/board";
import { ArrowLabels, Draft, EndDots, LinesLayer } from "./Lines";
import NotePicker from "./NotePicker";
import ShapeBar from "./ShapeBar";
import Shapes, { type Corner } from "./Shapes";
import ToolRail, { INK_SIZES, type MakeTool, type Tool } from "./ToolRail";

type Cam = { x: number; y: number; k: number };
type P = { x: number; y: number };
type Op =
  | { kind: "pan"; start: P; cam: Cam; moved: boolean }
  | { kind: "pinch"; dist: number; mid: P; cam: Cam }
  | { kind: "move"; id: string; start: P; orig: Rect; before: Shape[]; moved: boolean }
  | { kind: "resize"; id: string; corner: Corner; start: P; orig: Rect; before: Shape[] }
  | { kind: "create"; tool: MakeTool; start: P; startWorld: P; id: string | null; before: Shape[] }
  | { kind: "ink"; points: [number, number, number][]; pen: boolean; before: Shape[] }
  | { kind: "connect"; from: End; a: P; start: P; over: string | null; moved: boolean; before: Shape[] }
  | { kind: "erase"; before: Shape[]; removed: Set<string> }
  | { kind: "pick"; id: string; start: P; cam: Cam; moved: boolean }
  | { kind: "end"; id: string; which: "from" | "to"; before: Shape[]; moved: boolean };

const TAP = 6;
const MIN_K = 0.2;
const MAX_K = 4;
const CAM_KEY = "acrain-board-cam";
const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));
const DEFAULT = { box: { w: 168, h: 64 }, sticky: { w: 170, h: 150 }, text: { w: 220, h: 30 } };

function loadCam(key: string): Cam | null {
  try {
    // The first canvas keeps where you were looking on the old single board
    const c = JSON.parse(localStorage.getItem(`${CAM_KEY}:${key}`) ?? (key === "first" ? localStorage.getItem(CAM_KEY) : null) ?? "null");
    return c && typeof c.k === "number" ? c : null;
  } catch {
    return null;
  }
}

/** The Playground: an endless board. Tools on the right edge; two fingers move around. */
export default function Board({
  camKey = "main",
  onChange,
  board,
  noteTitles,
  onSave,
  onOpenNote,
  focus,
}: {
  /** Each canvas remembers its own camera */
  camKey?: string;
  /** Hears about every change straight away (saving still waits a moment) */
  onChange?: (shapes: Shape[]) => void;
  board: BoardData | null;
  /** Your notes, for linking boxes to them */
  noteTitles: string[];
  onSave: (b: BoardData) => void;
  onOpenNote: (title: string) => void;
  /** A shape to fly to (from a note) */
  focus?: string | null;
}) {
  const view = useRef<HTMLDivElement>(null);
  // iOS would otherwise pinch-zoom or bounce the whole app while you work on the canvas
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener("touchmove", stop, { passive: false });
    el.addEventListener("gesturestart", stop);
    el.addEventListener("gesturechange", stop);
    return () => {
      el.removeEventListener("touchmove", stop);
      el.removeEventListener("gesturestart", stop);
      el.removeEventListener("gesturechange", stop);
    };
  }, []);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cam, setCamState] = useState<Cam>(() => loadCam(camKey) ?? { x: 40, y: 80, k: 1 });
  const camRef = useRef(cam);
  // Fingers can move faster than the screen redraws: keep the newest camera, and draw it once per frame
  const frame = useRef(0);
  const setCam = useCallback((c: Cam) => {
    camRef.current = c;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setCamState(camRef.current);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  // Handle sizes follow the zoom once it settles; changing them every frame would restyle every shape
  const [kSettled, setKSettled] = useState(cam.k);
  useEffect(() => {
    const t = setTimeout(() => setKSettled(cam.k), 120);
    return () => clearTimeout(t);
  }, [cam.k]);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(`${CAM_KEY}:${camKey}`, JSON.stringify(cam));
      } catch {
        // private mode: the camera just won't be remembered
      }
    }, 300);
    return () => clearTimeout(t);
  }, [cam, camKey]);

  const [shapes, setShapes] = useState<Shape[] | null>(board ? board.shapes : null);
  const [hist, setHist] = useState<History>({ past: [], future: [] });
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [snapped, setSnapped] = useState<string | null>(null);
  const editBefore = useRef<Shape[] | null>(null);
  const [ink, setInk] = useState({ colour: "#111", size: INK_SIZES[0] });
  const [inkDraft, setInkDraft] = useState<{ points: [number, number, number][]; pen: boolean } | null>(null);
  const [arrowDraft, setArrowDraft] = useState<{ a: P; b: P } | null>(null);
  // The box a connection's end is about to attach to
  const [target, setTarget] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  // The board arrives from storage once; after that, this screen owns it
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first load from storage
    if (shapes === null && board) setShapes(board.shapes);
  }, [board, shapes]);

  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  });
  useEffect(() => {
    if (shapes) changeRef.current?.(shapes);
  }, [shapes]);

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
  useEffect(() => {
    const now = () => {
      if (latest.current && latest.current !== lastSaved.current) {
        lastSaved.current = latest.current;
        saveRef.current({ shapes: latest.current });
      }
    };
    // The app going to the background (or being closed) saves straight away
    const hidden = () => document.visibilityState === "hidden" && now();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", now);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", now);
      now();
    };
  }, []);

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

  // The eraser removes whatever it touches (ink, arrows, boxes); one undo brings it all back
  const erase = (cx: number, cy: number) => {
    const o = op.current;
    if (o?.kind !== "erase") return;
    const hits = new Set<string>();
    for (const [dx, dy] of [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]]) {
      const id = document.elementFromPoint(cx + dx, cy + dy)?.closest("[data-shape]")?.getAttribute("data-shape");
      if (id && !o.removed.has(id)) hits.add(id);
    }
    if (!hits.size) return;
    hits.forEach((id) => o.removed.add(id));
    setShapes((list) => {
      let next = list ?? [];
      hits.forEach((id) => (next = remove(next, id)));
      return next;
    });
  };

  const startPinch = () => {
    const cur = op.current;
    // A second finger cancels whatever the first one was doing
    if (cur && (cur.kind === "move" || cur.kind === "resize" || cur.kind === "create" || cur.kind === "erase" || cur.kind === "end")) setShapes(cur.before);
    setTarget(null);
    setInkDraft(null);
    setArrowDraft(null);
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

    const endEl = t.closest("[data-end]");
    if (tool === "select" && endEl) {
      op.current = {
        kind: "end",
        id: endEl.getAttribute("data-arrow")!,
        which: endEl.getAttribute("data-end") as "from" | "to",
        before: all,
        moved: false,
      };
      return;
    }
    if (tool === "select") {
      if (handle && shape && isFramed(shape) && selected === shape.id) {
        op.current = { kind: "resize", id: shape.id, corner: handle, start: p, orig: bounds(shape)!, before: all };
      } else if (shape && isFramed(shape)) {
        op.current = { kind: "move", id: shape.id, start: p, orig: bounds(shape)!, before: all, moved: false };
      } else if (shape) op.current = { kind: "pick", id: shape.id, start: p, cam: camRef.current, moved: false };
      else op.current = { kind: "pan", start: p, cam: camRef.current, moved: false };
      return;
    }
    const w = toWorld(p);
    if (tool === "pen") {
      const pen = e.pointerType === "pen";
      op.current = { kind: "ink", points: [[w.x, w.y, pen ? e.pressure || 0.5 : 0.5]], pen, before: all };
      setInkDraft({ points: (op.current as { points: [number, number, number][] }).points, pen });
      setSelected(null);
      return;
    }
    if (tool === "eraser") {
      op.current = { kind: "erase", before: all, removed: new Set() };
      erase(e.clientX, e.clientY);
      return;
    }
    if (tool === "connect") {
      const from: End = shape && isFramed(shape) ? { shape: shape.id } : w;
      const r = shape && isFramed(shape) ? bounds(shape)! : null;
      const a = r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : w;
      op.current = { kind: "connect", from, a, start: p, over: null, moved: false, before: all };
      setSelected(null);
      return;
    }
    if (tool === "box" || tool === "sticky" || tool === "text") op.current = { kind: "create", tool, start: p, startWorld: w, id: null, before: all };
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
    if (o.kind === "ink") {
      const w = toWorld(p);
      o.points = [...o.points, [w.x, w.y, o.pen ? e.pressure || 0.5 : 0.5]];
      setInkDraft({ points: o.points, pen: o.pen });
      return;
    }
    if (o.kind === "erase") {
      erase(e.clientX, e.clientY);
      return;
    }
    if (o.kind === "end") {
      o.moved = true;
      const arrow = o.before.find((x) => x.id === o.id);
      if (arrow?.type !== "arrow") return;
      const other = o.which === "from" ? arrow.to : arrow.from;
      // The dot under the finger hides what's beneath it, so look through the whole stack of elements
      let over: string | null = null;
      for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
        const id = el.closest("[data-shape]")?.getAttribute("data-shape");
        const hit = id ? o.before.find((x) => x.id === id) : null;
        if (hit && isFramed(hit) && !("shape" in other && other.shape === hit.id)) {
          over = hit.id;
          break;
        }
      }
      setTarget(over);
      const end: End = over ? { shape: over } : toWorld(p);
      setShapes(patch(o.before, o.id, { [o.which]: end } as Partial<Shape>));
      return;
    }
    if (o.kind === "connect") {
      if (!o.moved && Math.hypot(p.x - o.start.x, p.y - o.start.y) < TAP) return;
      o.moved = true;
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-shape]")?.getAttribute("data-shape") ?? null;
      const target = under && "shape" in o.from && o.from.shape === under ? null : under;
      const ts = target ? all.find((x) => x.id === target) : null;
      o.over = ts && isFramed(ts) ? ts.id : null;
      const r = ts && isFramed(ts) ? bounds(ts)! : null;
      setArrowDraft({ a: o.a, b: r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : toWorld(p) });
      return;
    }
    const dx = p.x - ("start" in o ? o.start.x : 0);
    const dy = p.y - ("start" in o ? o.start.y : 0);
    const far = Math.hypot(dx, dy) >= TAP;
    const k = camRef.current.k;
    if (o.kind === "pick") {
      if (!o.moved && !far) return;
      o.moved = true;
      setCam({ ...o.cam, x: o.cam.x + dx, y: o.cam.y + dy });
    } else if (o.kind === "pan") {
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
    setInkDraft(null);
    setArrowDraft(null);
    setTarget(null);
    if (!o || e.type === "pointercancel") {
      if (o && (o.kind === "move" || o.kind === "resize" || o.kind === "create" || o.kind === "erase" || o.kind === "end")) setShapes(o.before);
      return;
    }
    if (o.kind === "end") {
      if (!o.moved) return;
      const a = all.find((x) => x.id === o.id);
      // Both ends in the same spot isn't a connection: put it back
      if (a?.type === "arrow") {
        const p1 = endPoint(a.from, a.to, all);
        const p2 = endPoint(a.to, a.from, all);
        if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 12) return setShapes(o.before);
      }
      setHist((h) => record(h, o.before));
      return;
    }
    if (o.kind === "ink") {
      // Keep the stroke light: drop points that are almost on top of the last one
      const minGap = 1.2 / camRef.current.k;
      const pts = o.points.filter((q, i, arr) => i === 0 || i === arr.length - 1 || Math.hypot(q[0] - arr[i - 1][0], q[1] - arr[i - 1][1]) >= minGap);
      commit([...o.before, { id: newId(), type: "ink", points: pts, colour: ink.colour, size: ink.size, pen: o.pen }], o.before);
      return;
    }
    if (o.kind === "erase") {
      if (o.removed.size) setHist((h) => record(h, o.before));
      return;
    }
    if (o.kind === "connect") {
      if (!o.moved) return;
      const end = toWorld(local(e));
      const to: End = o.over ? { shape: o.over } : end;
      if (!o.over && "x" in o.from && Math.hypot(end.x - o.from.x, end.y - o.from.y) < 12) return;
      commit([...o.before, { id: newId(), type: "arrow", from: o.from, to }], o.before);
      return;
    }
    if (o.kind === "pick") {
      if (!o.moved) setSelected(o.id);
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
  const setText = (id: string, text: string) =>
    setShapes((list) => (list ? patch(list, id, list.find((x) => x.id === id)?.type === "arrow" ? { label: text } : { text }) : list));

  const empty = shapes !== null && shapes.length === 0;
  // A big board only draws what's near the screen
  const visible =
    all.length > 150 && size.w
      ? all.filter((s) => {
          if (s.id === selected || s.id === editing) return true;
          const r = bounds(s, all);
          if (!r) return false;
          const x0 = -cam.x / cam.k - size.w / cam.k / 2;
          const y0 = -cam.y / cam.k - size.h / cam.k / 2;
          const x1 = x0 + (size.w / cam.k) * 2;
          const y1 = y0 + (size.h / cam.k) * 2;
          return r.x + r.w >= x0 && r.x <= x1 && r.y + r.h >= y0 && r.y <= y1;
        })
      : all;

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
      <div
        className="bd-world"
        style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})`, ["--k" as string]: kSettled }}
      >
        {shapes && <LinesLayer shapes={shapes} layer="arrows" selected={selected} />}
        {shapes && <ArrowLabels shapes={shapes} editing={editing} onText={setText} onEditEnd={endEdit} />}
        {shapes && (
          <Shapes
            shapes={visible}
            selected={selected}
            editing={editing}
            snapped={bump ?? snapped}
            target={target}
            onText={setText}
            onEditEnd={endEdit}
            onMeasure={(id, h) => setShapes((list) => (list ? patch(list, id, { h }) : list))}
            onOpenNote={onOpenNote}
          />
        )}
        {shapes && <LinesLayer shapes={shapes} layer="ink" selected={selected} />}
        {shapes && <EndDots shapes={shapes} selected={selected} k={cam.k} />}
        <Draft ink={inkDraft ? { ...inkDraft, colour: ink.colour, size: ink.size } : null} arrow={arrowDraft} />
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
          ink={ink}
          onInk={setInk}
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
          onNote={() => setLinking(sel.id)}
        />
      )}

      {linking && (
        <NotePicker
          titles={noteTitles}
          current={(all.find((x) => x.id === linking) as { note?: string } | undefined)?.note}
          onPick={(title) => {
            act((s) => patch(s, linking, { note: title } as Partial<Shape>));
            setLinking(null);
          }}
          onUnlink={() => {
            act((s) => patch(s, linking, { note: undefined } as Partial<Shape>));
            setLinking(null);
          }}
          onClose={() => setLinking(null)}
        />
      )}
    </div>
  );
}

function makeShape(tool: MakeTool, id: string, r: Rect): Shape {
  if (tool === "box") return { id, type: "box", ...r, text: "", colour: "paper" };
  if (tool === "sticky") return { id, type: "sticky", ...r, text: "", colour: "gold" };
  return { id, type: "text", x: r.x, y: r.y, w: r.w, h: r.h, text: "", size: "m" };
}
