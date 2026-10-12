// Notes: the basic unit of Acrain. Notes link to each other with [[Note title]].

/** The editor's document (TipTap/ProseMirror JSON) */
export type RichDoc = { type: string; attrs?: Record<string, unknown>; text?: string; content?: RichDoc[]; marks?: { type: string; attrs?: Record<string, unknown> }[] };

export type Note = {
  id: string;
  title: string;
  /** Older notes: Markdown text. Newer notes keep `doc` and a plain-text copy here for search. */
  body: string;
  doc?: RichDoc;
  tags: string[];
  /** ISO timestamps */
  created: string;
  updated: string;
};

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "note"
  );
}

/** [[Title]] or [[Title|shown text]] */
export const WIKILINK = /\[\[([^\]|\n]+?)(?:\|([^\]\n]+))?\]\]/g;

/** Titles this note links to, in order, without duplicates */
export function linksIn(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(WIKILINK)) {
    const t = m[1].trim();
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out;
}

/** Finds a note by title (case-insensitive) or id */
export function findNote(notes: Note[], ref: string) {
  const r = ref.trim().toLowerCase();
  return notes.find((n) => n.title.trim().toLowerCase() === r) ?? notes.find((n) => n.id === slugify(ref));
}

function walk(node: RichDoc | undefined, visit: (n: RichDoc) => void) {
  if (!node) return;
  visit(node);
  node.content?.forEach((c) => walk(c, visit));
}

/** Titles a note links to, from its rich document or (older notes) its [[Markdown]] */
export function noteLinks(note: Note): string[] {
  if (!note.doc) return linksIn(note.body);
  const out: string[] = [];
  walk(note.doc, (n) => {
    const t = n.type === "noteLink" ? String(n.attrs?.title ?? "").trim() : "";
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  });
  return out;
}

/** Footnote texts in reading order */
export function footnotesIn(doc: RichDoc | undefined): string[] {
  const out: string[] = [];
  walk(doc, (n) => n.type === "footnote" && out.push(String(n.attrs?.text ?? "")));
  return out;
}

/** Plain text of a rich document, for search and the home list */
export function docText(doc: RichDoc | undefined): string {
  const parts: string[] = [];
  walk(doc, (n) => {
    if (n.type === "text" && n.text) parts.push(n.text);
    else if (n.type === "noteLink") parts.push(String(n.attrs?.title ?? ""));
    else if (n.type === "paragraph" || n.type === "heading") parts.push("\n");
  });
  return parts.join("").replace(/\n+/g, "\n").trim();
}

/** Points [[from]] links in a rich document at a renamed note */
export function renameInDoc(doc: RichDoc, from: string, to: string): RichDoc {
  const f = from.trim().toLowerCase();
  const fix = (n: RichDoc): RichDoc => ({
    ...n,
    ...(n.type === "noteLink" && String(n.attrs?.title ?? "").trim().toLowerCase() === f ? { attrs: { ...n.attrs, title: to } } : {}),
    ...(n.content ? { content: n.content.map(fix) } : {}),
  });
  return fix(doc);
}

/** Notes that link to this one */
export function backlinks(notes: Note[], note: Note) {
  return notes.filter((n) => n.id !== note.id && noteLinks(n).some((t) => findNote(notes, t)?.id === note.id));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inlineMd(text: string, notes: Record<string, string>) {
  return esc(text)
    .replace(/\[\^([^\]]+)\]/g, (_, k: string) => `<span data-footnote data-text="${esc(notes[k.toLowerCase()] ?? "")}"></span>`)
    .replace(/\[\[([^\]|\n]+?)(?:\|[^\]\n]+)?\]\]/g, (_, t: string) => `<span data-note-link="${t.trim()}">${t.trim()}</span>`)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/** Converts an older Markdown note into HTML the rich editor understands (charts, boxes, footnotes, links) */
export function markdownToHtml(md: string): string {
  const notes: Record<string, string> = {};
  let text = md.replace(/^\[\^([^\]]+)\]:[ \t]*(.*)$/gm, (_, k: string, v: string) => {
    notes[k.toLowerCase()] = v;
    return "";
  });
  const blocks: string[] = [];
  text = text.replace(/```chart\n([\s\S]*?)```/g, (_, src: string) => {
    const attrs = { chartType: "line", title: "", unit: "", points: [] as { key: string; value: number }[] };
    for (const line of src.split("\n")) {
      const i = line.indexOf(":");
      if (i <= 0) continue;
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (k === "type") attrs.chartType = v === "bar" ? "bar" : "line";
      else if (k === "title") attrs.title = v;
      else if (k === "unit") attrs.unit = v;
      else attrs.points.push({ key: line.slice(0, line.lastIndexOf(":")).trim(), value: Number(line.slice(line.lastIndexOf(":") + 1).replace(/[,$%\s]/g, "")) || 0 });
    }
    blocks.push(`<div data-chart data-spec="${esc(JSON.stringify(attrs))}"></div>`);
    return `\n\n@@BLOCK${blocks.length - 1}@@\n\n`;
  });
  text = text.replace(/:::expand\[([^\]\n]*)\]?\n?([\s\S]*?):::/g, (_, title: string, inner: string) => {
    const paras = inner.trim().split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${inlineMd(p.trim(), notes)}</p>`);
    blocks.push(`<div data-deep-dive data-title="${esc(title.trim())}">${paras.join("") || "<p></p>"}</div>`);
    return `\n\n@@BLOCK${blocks.length - 1}@@\n\n`;
  });
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const b = p.match(/^@@BLOCK(\d+)@@$/);
      if (b) return blocks[Number(b[1])];
      const h = p.match(/^(#{1,3})\s+(.*)$/);
      if (h) return `<h2>${inlineMd(h[2], notes)}</h2>`;
      if (/^[-*]\s/.test(p)) return `<ul>${p.split("\n").map((l) => `<li><p>${inlineMd(l.replace(/^[-*]\s+/, ""), notes)}</p></li>`).join("")}</ul>`;
      return `<p>${p.split("\n").map((l) => inlineMd(l, notes)).join("<br>")}</p>`;
    })
    .join("");
}

/** Turns [[links]] into Markdown links: existing notes → /notes/<id>, missing ones → /new-note?title=… */
export function resolveWikilinks(body: string, notes: Note[]) {
  // Leave code blocks (charts) untouched
  return body
    .split(/(```[\s\S]*?```)/g)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(WIKILINK, (_, title: string, alias?: string) => {
            const text = (alias ?? title).trim().replace(/[[\]]/g, "");
            const hit = findNote(notes, title);
            return hit ? `[${text}](/notes/${hit.id})` : `[${text}](/new-note?title=${encodeURIComponent(title.trim())})`;
          }),
    )
    .join("");
}

/** Renames [[Old]] / [[Old|x]] to [[New]] / [[New|x]] */
export function renameLinks(body: string, from: string, to: string) {
  const f = from.trim().toLowerCase();
  return body.replace(WIKILINK, (all, title: string, alias?: string) =>
    title.trim().toLowerCase() === f ? `[[${to}${alias ? `|${alias}` : ""}]]` : all,
  );
}

export function freeId(notes: Note[], title: string) {
  const base = slugify(title);
  const taken = new Set(notes.map((n) => n.id));
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

export function parseTags(text: string) {
  return [
    ...new Set(
      text
        .split(/[,#]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
