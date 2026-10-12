// Builds the phone version (a single HTML page published as a claude.ai artifact).
// Usage: node phone/build.mjs  →  phone/dist/acrain.html
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "phone", "dist");
fs.mkdirSync(out, { recursive: true });

// Swap the Next.js-only pieces for phone versions
const swaps = {
  "next/link": path.join(root, "phone/link-shim.tsx"),
  "@/app/actions": path.join(root, "phone/actions.ts"),
};

// --app builds the native iPhone app's web files (phone/app-www) instead of the claude.ai page
const forApp = process.argv.includes("--app");

const result = await build({
  entryPoints: [path.join(root, forApp ? "phone/app-entry.ts" : "phone/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  jsx: "automatic",
  target: "es2020",
  write: false,
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: path.join(root, "tsconfig.json"),
  plugins: [
    {
      name: "phone-swaps",
      setup(b) {
        b.onResolve({ filter: /^(next\/link|@\/app\/actions)$/ }, (args) => ({ path: swaps[args.path] }));
      },
    },
  ],
});
const js = result.outputFiles[0].text;

// Tailwind, compiled from the same globals.css the site uses
const cssFile = path.join(out, "tw.css");
execFileSync("npx", ["@tailwindcss/cli", "-i", path.join(root, "app/globals.css"), "-o", cssFile, "--minify"], {
  cwd: root,
  stdio: "inherit",
});
const css = fs.readFileSync(cssFile, "utf8");

// ET Book, inlined (artifact pages can only load fonts from Google Fonts)
const font = (f) => `data:font/woff;base64,${fs.readFileSync(path.join(root, "app/fonts", f)).toString("base64")}`;
const fonts = `
@font-face{font-family:"ET Book";src:url(${font("et-book-roman-line-figures.woff")}) format("woff");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"ET Book";src:url(${font("et-book-display-italic-old-style-figures.woff")}) format("woff");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"ET Book";src:url(${font("et-book-bold-line-figures.woff")}) format("woff");font-weight:700;font-style:normal;font-display:swap}
:root{--font-et-book:"ET Book"}`;

const html = `<title>Acrain</title>
<style>${fonts}
${css}
html,body{background:#fffff8}</style>
<div id="acrain-root"></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
`;
if (forApp) {
  const www = path.join(root, "phone/app-www");
  fs.mkdirSync(www, { recursive: true });
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light">
${html}`;
  fs.writeFileSync(path.join(www, "index.html"), page.replace(/(<\/script>\s*)$/, "$1</body></html>").replace("<title>Acrain</title>", "<title>Acrain</title></head><body>"));
  console.log(`phone/app-www/index.html: ${(page.length / 1024).toFixed(0)} KB`);
} else {
  fs.writeFileSync(path.join(out, "acrain.html"), html);
  console.log(`phone/dist/acrain.html: ${(html.length / 1024).toFixed(0)} KB`);
}
