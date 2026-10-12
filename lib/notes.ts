// Notes: the basic unit of Acrain. Notes link to each other with [[Note title]].

export type Note = {
  id: string;
  title: string;
  body: string;
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

/** Notes whose text links to this one */
export function backlinks(notes: Note[], note: Note) {
  return notes.filter((n) => n.id !== note.id && linksIn(n.body).some((t) => findNote(notes, t)?.id === note.id));
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
