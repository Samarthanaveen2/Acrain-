import { CanvasTexture, SRGBColorSpace } from "three";
import { UNTAGGED } from "@/lib/map";

// The night-sky map's look: brighter versions of the ai-2027 colours, and soft light textures drawn once

const GLOW: Record<string, string> = {
  "#2a623d": "#5fd38a", // green
  "#31566f": "#6fb3e8", // blue
  "#c77400": "#ffb347", // orange
  "#8b0000": "#ff6b6b", // red
  "#6b4c8a": "#b58cff", // purple
  "#3f7f7a": "#5ed6c8", // teal
  "#8a6d3b": "#e0c070", // ochre
  "#a0466b": "#ff7fb5", // plum
  "#55606e": "#a7b4c8", // slate
  [UNTAGGED]: "#f4efdf", // warm white for untagged notes
};
export const glowOf = (paperColour: string) => GLOW[paperColour] ?? paperColour;
export const GHOST = "#8d93a6";
export const SKY = "#05070d";

function texture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Wide soft halo: most of the "glow" */
export const haloTexture = () =>
  texture(128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,0.85)");
    r.addColorStop(0.18, "rgba(255,255,255,0.45)");
    r.addColorStop(0.45, "rgba(255,255,255,0.12)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });

/** Small bright core of a star */
export const coreTexture = () =>
  texture(64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.35, "rgba(255,255,255,0.95)");
    r.addColorStop(0.55, "rgba(255,255,255,0.35)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });

/** A thin ring, for ideas you've linked to but not written yet */
export const ringTexture = () =>
  texture(64, (g, s) => {
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = s * 0.06;
    g.setLineDash([s * 0.12, s * 0.08]);
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2);
    g.stroke();
  });

/** A very soft cloud behind a theme or a group of linked notes */
export const nebulaTexture = () =>
  texture(256, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,0.5)");
    r.addColorStop(0.4, "rgba(255,255,255,0.2)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
