"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  FogExp2,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { colourOf, neighboursOf, type Graph, type Positions3 } from "@/lib/map";
import type { MapHandle } from "./MapCanvas";
import { coreTexture, GHOST, glowOf, haloTexture, nebulaTexture, ringTexture, SKY } from "./glow";

type Props = {
  graph: Graph;
  positions: Positions3;
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** Tag → paper colour (the glow version is worked out here) */
  colours: Map<string, string>;
  theme?: string | null;
  /** Groups to put a soft nebula behind (paper colours) */
  halos?: { key: string; colour: string; ids: string[] }[];
  /** Height covered by the peek card at the bottom */
  bottomInset?: number;
  /** WebGL isn't available on this device */
  onUnavailable?: () => void;
  ref?: Ref<MapHandle>;
};

type Star = {
  id: string;
  pos: Vector3;
  colour: Color;
  ghost: boolean;
  degree: number;
  halo: Sprite;
  core: Sprite;
  alpha: number;
  label?: HTMLSpanElement | null;
};

const TAP_PX = 6;
const TAP_MS = 320;
const HIT_PX = 24;
const MAX_LABELS = 24;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The night-sky map: notes as glowing stars in 3D, linked by fine threads. Drag to spin, pinch to zoom, tap a star. */
export default function MapSpace(props: Props) {
  const { graph, ref } = props;
  const box = useRef<HTMLDivElement>(null);
  const labelBox = useRef<HTMLDivElement>(null);
  // Everything the render loop reads, refreshed after each render
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });

  // The three.js world, made once
  const world = useRef<{
    renderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    controls: OrbitControls;
    textures: Record<"halo" | "core" | "ring" | "nebula", Texture>;
    stars: Star[];
    byId: Map<string, Star>;
    links: LineSegments;
    pulses: Points;
    nebulae: Sprite[];
    fly: ((to: Vector3, distance?: number, ms?: number) => void) | null;
    fit: (ms?: number) => void;
    frame: (ids: string[], centre?: string) => void;
  } | null>(null);

  // ---- Set up the scene, controls and render loop ----
  useEffect(() => {
    const el = box.current!;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      live.current.onUnavailable?.();
      return;
    }
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(new Color(SKY), 1);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.display = "block";
    el.prepend(renderer.domElement);

    const scene = new Scene();
    scene.fog = new FogExp2(SKY, 0.0016);
    const camera = new PerspectiveCamera(55, 1, 1, 9000);
    camera.position.set(0, 120, 600);

    const textures = { halo: haloTexture(), core: coreTexture(), ring: ringTexture(), nebula: nebulaTexture() };

    // Far-off stars for depth; they don't fade with the fog
    const sky = new BufferGeometry();
    const N = 1400;
    const pts = new Float32Array(N * 3);
    const cols = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = 2600 + Math.random() * 2600;
      const s = Math.sqrt(1 - u * u);
      pts.set([Math.cos(t) * s * r, u * r, Math.sin(t) * s * r], i * 3);
      const b = 0.25 + Math.pow(Math.random(), 2.2) * 0.75;
      const warm = Math.random() < 0.2;
      cols.set([b * (warm ? 1 : 0.85), b * 0.9, b * (warm ? 0.8 : 1)], i * 3);
    }
    sky.setAttribute("position", new BufferAttribute(pts, 3));
    sky.setAttribute("color", new BufferAttribute(cols, 3));
    const skyPoints = new Points(
      sky,
      new PointsMaterial({
        size: 2.2,
        map: textures.core,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        fog: false,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    scene.add(skyPoints);

    // Threads between notes: per-vertex colour with alpha
    const links = new LineSegments(
      new BufferGeometry(),
      new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false }),
    );
    scene.add(links);

    // Little lights that travel along the picked note's links
    const pulseGeo = new BufferGeometry();
    pulseGeo.setAttribute("position", new BufferAttribute(new Float32Array(3 * 256), 3));
    pulseGeo.setAttribute("color", new BufferAttribute(new Float32Array(3 * 256), 3));
    pulseGeo.setDrawRange(0, 0);
    const pulses = new Points(
      pulseGeo,
      new PointsMaterial({
        size: 9,
        map: textures.core,
        vertexColors: true,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    scene.add(pulses);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.8;
    controls.screenSpacePanning = true;
    controls.minDistance = 25;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.55;

    // Auto-spin rests while you touch it, and for a few seconds after
    let touching = false;
    let lastTouch = -1e9;
    controls.addEventListener("start", () => {
      touching = true;
      flight = null;
    });
    controls.addEventListener("end", () => {
      touching = false;
      lastTouch = performance.now();
    });

    // Camera flights (tap a star, Fit, opening)
    let flight: { t0: number; ms: number; fromT: Vector3; toT: Vector3; fromP: Vector3; toP: Vector3 } | null = null;
    const fly = (to: Vector3, distance?: number, ms = 650) => {
      const dir = camera.position.clone().sub(controls.target);
      const d = distance ?? Math.min(dir.length(), 240);
      dir.normalize();
      flight = {
        t0: performance.now(),
        ms: reduced ? 1 : ms,
        fromT: controls.target.clone(),
        toT: to.clone(),
        fromP: camera.position.clone(),
        toP: to.clone().add(dir.multiplyScalar(d)),
      };
    };
    const bounds = () => {
      const stars = world.current?.stars ?? [];
      const c = new Vector3();
      if (!stars.length) return { c, r: 120 };
      stars.forEach((s) => c.add(s.pos));
      c.divideScalar(stars.length);
      const r = Math.max(80, ...stars.map((s) => s.pos.distanceTo(c)));
      return { c, r };
    };
    const fit = (ms = 750) => {
      const { c, r } = bounds();
      const half = Math.atan(Math.tan(((camera.fov / 2) * Math.PI) / 180) * Math.min(1, camera.aspect));
      const d = (r * 0.92) / Math.sin(half);
      controls.maxDistance = Math.max(d * 3, 800);
      fly(c, d, ms);
    };

    /** Moves the camera so these stars fill the view; `centre` puts one star in the middle */
    const frameStars = (ids: string[], centre?: string) => {
      const w = world.current;
      const ps = ids.map((id) => w?.byId.get(id)?.pos).filter((p): p is Vector3 => !!p);
      if (!ps.length) return;
      const c = centre && w?.byId.get(centre) ? w.byId.get(centre)!.pos.clone() : ps.reduce((a, p) => a.add(p), new Vector3()).divideScalar(ps.length);
      const r = Math.max(45, ...ps.map((p) => p.distanceTo(c)));
      const visibleH = Math.max(160, size.h - (centre ? (live.current.bottomInset ?? 0) : 0));
      const aspect = size.w / visibleH;
      const vHalf = Math.atan(Math.tan(((camera.fov / 2) * Math.PI) / 180) * (visibleH / size.h));
      const half = Math.min(vHalf, Math.atan(Math.tan(vHalf) * aspect));
      fly(c, (r * 1.15) / Math.sin(half) + 20);
    };

    // Star sizes follow the size of the sky, so they look the same with 5 notes or 500
    let unit = 1;
    world.current = {
      renderer,
      scene,
      camera,
      controls,
      textures,
      stars: [],
      byId: new Map(),
      links,
      pulses,
      nebulae: [],
      fly,
      fit,
      frame: frameStars,
    };

    // Size: fill the box, keep the picked note above the peek card
    let size = { w: 1, h: 1 };
    let offsetY = 0;
    const resize = () => {
      size = { w: el.clientWidth || 1, h: el.clientHeight || 1 };
      renderer.setSize(size.w, size.h, false);
      renderer.domElement.style.width = `${size.w}px`;
      renderer.domElement.style.height = `${size.h}px`;
      camera.aspect = size.w / size.h;
      camera.setViewOffset(size.w, size.h, 0, offsetY, size.w, size.h);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Taps: a quick touch that barely moved picks the nearest star on screen
    let down: { x: number; y: number; t: number } | null = null;
    let fingers = 0;
    const onDown = (e: PointerEvent) => {
      fingers++;
      down = fingers === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    };
    const onUp = (e: PointerEvent) => {
      fingers = Math.max(0, fingers - 1);
      const d = down;
      down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_PX || performance.now() - d.t > TAP_MS) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let best: Star | null = null;
      let bestD = Infinity;
      const v = new Vector3();
      for (const s of world.current!.stars) {
        v.copy(s.pos).project(camera);
        if (v.z > 1) continue;
        const sx = ((v.x + 1) / 2) * size.w;
        const sy = ((1 - v.y) / 2) * size.h;
        const dist = Math.hypot(sx - x, sy - y) + v.z * 4; // nearer stars win close calls
        if (dist < bestD) {
          bestD = dist;
          best = s;
        }
      }
      const { selected, onSelect } = live.current;
      if (best && bestD < HIT_PX + 4) onSelect(best.id === selected ? null : best.id);
      else onSelect(null);
    };
    const onCancel = () => {
      fingers = 0;
      down = null;
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onCancel);

    // ---- The render loop ----
    let raf = 0;
    let running = false;
    const v = new Vector3();
    const tmp = new Color();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const w = world.current!;
      const { selected, theme, bottomInset = 0 } = live.current;
      const t = now / 1000;
      const extent = bounds();
      unit = Math.max(0.6, extent.r / 130);

      // Keep the picked star centred in the space above the card
      const wantOffset = selected ? bottomInset / 2 : 0;
      if (Math.abs(wantOffset - offsetY) > 0.5) {
        offsetY += (wantOffset - offsetY) * 0.15;
        camera.setViewOffset(size.w, size.h, 0, offsetY, size.w, size.h);
        camera.updateProjectionMatrix();
      }

      if (flight) {
        const p = Math.min(1, (now - flight.t0) / flight.ms);
        const e = ease(p);
        controls.target.lerpVectors(flight.fromT, flight.toT, e);
        camera.position.lerpVectors(flight.fromP, flight.toP, e);
        if (p >= 1) flight = null;
      }
      controls.autoRotate = !reduced && !selected && !touching && !flight && now - lastTouch > 4000;
      controls.update();

      // Who's in focus: the picked note and its neighbours, or a theme
      const near = selected ? neighboursOf(live.current.graph, selected) : null;
      const themed = theme && !selected ? new Set(live.current.graph.nodes.filter((n) => n.note?.tags.includes(theme)).map((n) => n.id)) : null;
      const inFocus = (s: Star) => (selected ? s.id === selected || near!.has(s.id) : themed ? themed.has(s.id) : true);
      const focusing = !!(selected || theme);
      // Fog thins as you zoom out, so near stars are bright and far ones fade at any distance
      const camD = camera.position.distanceTo(controls.target) + extent.r * 0.6;
      const fogTarget = (focusing ? 1.25 : 0.85) / camD;
      (scene.fog as FogExp2).density += (fogTarget - (scene.fog as FogExp2).density) * 0.08;

      // A crowded sky gets smaller, softer halos so it doesn't wash out to white
      const crowd = Math.min(1, Math.sqrt(40 / Math.max(1, w.stars.length)));
      for (const [i, s] of w.stars.entries()) {
        const target = focusing ? (inFocus(s) ? 1 : 0.1) : 1;
        s.alpha += (target - s.alpha) * 0.12;
        const breathe = s.ghost ? 0.55 + 0.3 * Math.sin(t * 1.6 + i) : 1;
        const on = s.id === selected;
        const base = (s.ghost ? 16 : (34 + Math.min(50, Math.sqrt(s.degree) * 16)) * (0.5 + 0.5 * crowd)) * unit;
        const pulse = on ? 1.25 + 0.1 * Math.sin(t * 3) : 1;
        s.halo.scale.setScalar(base * pulse);
        (s.halo.material as SpriteMaterial).opacity = s.alpha * breathe * (s.ghost ? 0.3 : on ? 1 : 0.75 * (0.3 + 0.7 * crowd));
        (s.core.material as SpriteMaterial).opacity = s.alpha * breathe * (s.ghost ? 0.9 : 1);
        s.core.scale.setScalar((s.ghost ? 11 : (on ? 13 : 9) + Math.min(5, s.degree * 0.8)) * unit);
      }

      // Threads: coloured by the stars they join; the picked note's light up
      const geo = w.links.geometry;
      const col = geo.getAttribute("color") as BufferAttribute | undefined;
      if (col) {
        const arr = col.array as Float32Array;
        const pickedColour = selected ? w.byId.get(selected)?.colour : null;
        live.current.graph.edges.forEach((e, k) => {
          const a = w.byId.get(e.a);
          const b = w.byId.get(e.b);
          if (!a || !b) return;
          const lit = selected ? e.a === selected || e.b === selected : theme ? inFocus(a) && inFocus(b) : false;
          const ghost = a.ghost || b.ghost;
          const alpha = focusing ? (lit ? 0.95 : 0.04) : ghost ? 0.18 : 0.4;
          [a, b].forEach((s, j) => {
            tmp.copy(lit && pickedColour ? pickedColour : s.colour);
            arr.set([tmp.r, tmp.g, tmp.b, alpha], (k * 2 + j) * 4);
          });
        });
        col.needsUpdate = true;
      }

      // Pulses travel outward from the picked note
      const pg = w.pulses.geometry;
      let count = 0;
      if (selected && !reduced) {
        const from = w.byId.get(selected);
        const pos = pg.getAttribute("position") as BufferAttribute;
        const pc = pg.getAttribute("color") as BufferAttribute;
        if (from) {
          for (const id of near!) {
            const to = w.byId.get(id);
            if (!to) continue;
            for (let q = 0; q < 2 && count < 256; q++) {
              const f = (t * 0.45 + q * 0.5 + (id.length % 7) * 0.13) % 1;
              v.lerpVectors(from.pos, to.pos, f);
              pos.setXYZ(count, v.x, v.y, v.z);
              const fade = Math.sin(f * Math.PI);
              pc.setXYZ(count, from.colour.r * fade, from.colour.g * fade, from.colour.b * fade);
              count++;
            }
          }
          pos.needsUpdate = true;
          pc.needsUpdate = true;
        }
      }
      pg.setDrawRange(0, count);

      // Nebulae breathe very slowly
      w.nebulae.forEach((n, i) => {
        const m = n.material as SpriteMaterial;
        m.opacity = (n.userData.base as number) * (0.85 + 0.15 * Math.sin(t * 0.4 + i));
      });

      skyPoints.rotation.y = t * 0.004;
      renderer.render(scene, camera);
      placeLabels(w.stars, camera, size, selected, near, focusing, inFocus);
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    // Opening: drift in from far away
    requestAnimationFrame(() => {
      const { c, r } = bounds();
      camera.position.copy(c).add(new Vector3(0.35, 0.45, 1).normalize().multiplyScalar(r * 7));
      controls.target.copy(c);
      fit(reduced ? 1 : 1300);
    });
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onCancel);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as unknown as { geometry?: BufferGeometry; material?: { dispose(): void } | { dispose(): void }[] };
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
        else m.material?.dispose();
      });
      Object.values(textures).forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      world.current = null;
    };
  }, []);

  // ---- Build stars and threads whenever the notes change ----
  const { positions, colours, halos, theme } = props;
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    const prev = new Map(w.stars.map((s) => [s.id, s.alpha]));
    for (const s of w.stars) {
      w.scene.remove(s.halo, s.core);
      s.halo.material.dispose();
      s.core.material.dispose();
    }
    w.stars = graph.nodes
      .filter((n) => positions[n.id])
      .map((n) => {
        const [x, y, z] = positions[n.id];
        const ghost = !n.note;
        const colour = new Color(ghost ? GHOST : glowOf(colourOf(n, colours)));
        const halo = new Sprite(
          new SpriteMaterial({ map: w.textures.halo, color: colour, transparent: true, blending: AdditiveBlending, depthWrite: false }),
        );
        const core = new Sprite(
          new SpriteMaterial({
            map: ghost ? w.textures.ring : w.textures.core,
            color: ghost ? colour : colour.clone().lerp(new Color("#ffffff"), 0.55),
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        );
        halo.position.set(x, y, z);
        core.position.set(x, y, z);
        w.scene.add(halo, core);
        return { id: n.id, pos: new Vector3(x, y, z), colour, ghost, degree: n.degree, halo, core, alpha: prev.get(n.id) ?? 0 };
      });
    w.byId = new Map(w.stars.map((s) => [s.id, s]));
    const pos = new Float32Array(graph.edges.length * 6);
    graph.edges.forEach((e, k) => {
      const a = w.byId.get(e.a)?.pos;
      const b = w.byId.get(e.b)?.pos;
      if (a && b) pos.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6);
    });
    w.links.geometry.dispose();
    w.links.geometry = new BufferGeometry();
    w.links.geometry.setAttribute("position", new BufferAttribute(pos, 3));
    w.links.geometry.setAttribute("color", new BufferAttribute(new Float32Array(graph.edges.length * 8), 4));
    // Hook each label span to its star
    const spans = labelBox.current?.querySelectorAll<HTMLSpanElement>("[data-label]") ?? [];
    spans.forEach((sp) => {
      const s = w.byId.get(sp.dataset.label!);
      if (s) s.label = sp;
    });
  }, [graph, positions, colours]);

  // ---- Nebulae behind themes and groups ----
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    w.nebulae.forEach((n) => {
      w.scene.remove(n);
      n.material.dispose();
    });
    w.nebulae = (halos ?? []).flatMap((h) => {
      const ps = h.ids.map((id) => w.byId.get(id)?.pos).filter((p): p is Vector3 => !!p);
      if (!ps.length) return [];
      const c = ps.reduce((acc, p) => acc.add(p), new Vector3()).divideScalar(ps.length);
      const spread = Math.max(...ps.map((p) => p.distanceTo(c)));
      const n = new Sprite(
        new SpriteMaterial({
          map: w.textures.nebula,
          color: new Color(glowOf(h.colour)),
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        }),
      );
      n.position.copy(c);
      n.scale.setScalar(spread * 2.6 + 90);
      n.userData.base = theme ? 0.2 : 0.11;
      n.renderOrder = -1;
      w.scene.add(n);
      return [n];
    });
  }, [halos, theme, graph, positions]);

  useImperativeHandle(
    ref,
    () => ({
      fit: () => world.current?.fit(),
      centreOn: (id: string) => {
        const g = live.current.graph;
        world.current?.frame([id, ...neighboursOf(g, id)], id);
      },
    }),
    [],
  );

  // Fly to a newly picked star so it and its neighbours fill the space above the card;
  // a picked theme gets framed as a whole, and "All" zooms back out
  const { selected, bottomInset } = props;
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    if (selected) w.frame([selected, ...neighboursOf(graph, selected)], selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-frame only when the pick or the card size changes
  }, [selected, bottomInset]);
  const firstTheme = useRef(true);
  useEffect(() => {
    const w = world.current;
    if (!w || selected) return;
    if (firstTheme.current) {
      firstTheme.current = false;
      return;
    }
    if (theme) w.frame(graph.nodes.filter((n) => n.note?.tags.includes(theme)).map((n) => n.id));
    else w.fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the theme changes
  }, [theme]);

  return (
    <div ref={box} className="map-space relative h-full w-full overflow-hidden" aria-label="3D map of notes and their links" role="img">
      <div ref={labelBox} className="pointer-events-none absolute inset-0 overflow-hidden">
        {graph.nodes.map((n) => (
          <span key={n.id} data-label={n.id} className="map-space-label" style={{ opacity: 0 }}>
            {n.title.length > 28 ? `${n.title.slice(0, 27)}…` : n.title}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Puts names next to the stars that matter most right now, skipping any that would overlap */
function placeLabels(
  stars: Star[],
  camera: PerspectiveCamera,
  size: { w: number; h: number },
  selected: string | null,
  near: Set<string> | null,
  focusing: boolean,
  inFocus: (s: Star) => boolean,
) {
  const v = new Vector3();
  const cands: { s: Star; x: number; y: number; z: number; score: number }[] = [];
  for (const s of stars) {
    if (!s.label) continue;
    v.copy(s.pos).project(camera);
    const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    if (!visible || (focusing && !inFocus(s))) {
      s.label.style.opacity = "0";
      continue;
    }
    const x = ((v.x + 1) / 2) * size.w;
    const y = ((1 - v.y) / 2) * size.h;
    const score = (s.id === selected ? 100 : near?.has(s.id) ? 50 : 0) + s.degree * 2 + (1 - v.z) * 60 - (s.ghost ? 3 : 0);
    cands.push({ s, x, y, z: v.z, score });
  }
  cands.sort((a, b) => b.score - a.score);
  const placed: { l: number; r: number; t: number; b: number }[] = [];
  const limit = stars.length > 200 ? 12 : stars.length > 80 ? 16 : MAX_LABELS;
  for (const c of cands) {
    const w = Math.min(190, c.s.label!.textContent!.length * 7 + 6);
    const box = { l: c.x - w / 2, r: c.x + w / 2, t: c.y + 9, b: c.y + 27 };
    const clash = placed.some((p) => !(box.r < p.l || box.l > p.r || box.b < p.t || box.t > p.b));
    const show = placed.length < limit && (!clash || c.s.id === selected);
    if (show) placed.push(box);
    const depthFade = Math.max(0.55, Math.min(1, 2.2 - c.z * 1.6));
    c.s.label!.style.opacity = show ? String(c.s.id === selected ? 1 : depthFade * Math.min(1, c.s.alpha + 0.05)) : "0";
    c.s.label!.style.transform = `translate(${c.x}px, ${c.y + 10}px) translateX(-50%)`;
    c.s.label!.dataset.on = c.s.id === selected ? "1" : "";
  }
}
