import { visit } from "unist-util-visit";
import type { Root } from "mdast";

export type Note = { n: number; label: string; text: string; chapter: string };

const DEF = /^\[\^([^\]]+)\]:[ \t]*(.*)$/gm;
const REF = /\[\^([^\]]+)\](?!:)/g;

/**
 * Numbers footnotes across all chapters in reading order, so the page shows
 * [1], [2], [3]… like ai-2027 instead of restarting in every chapter.
 * Definitions are single lines: "[^label]: text".
 */
export function collectNotes(chapters: { id: string; body: string }[]) {
  const notes: Note[] = [];
  const numbers: Record<string, Record<string, number>> = {};
  for (const c of chapters) {
    const defs = new Map<string, string>();
    for (const m of c.body.matchAll(DEF)) defs.set(m[1].toLowerCase(), m[2]);
    numbers[c.id] = {};
    const withoutDefs = c.body.replace(DEF, "");
    for (const m of withoutDefs.matchAll(REF)) {
      const label = m[1].toLowerCase();
      if (numbers[c.id][label] || !defs.has(label)) continue;
      const n = notes.length + 1;
      numbers[c.id][label] = n;
      notes.push({ n, label, text: defs.get(label)!, chapter: c.id });
    }
  }
  return { notes, numbers };
}

/** remark plugin: footnote references become <sup class="fn-ref"><a href="#fn-N">N</a></sup>; definitions are dropped */
export function remarkGlobalNotes({ numbers }: { numbers: Record<string, number> }) {
  return (tree: Root) => {
    const seen = new Set<number>();
    visit(tree, "footnoteReference", (node, index, parent) => {
      if (!parent || index === undefined) return;
      const n = numbers[node.identifier.toLowerCase()];
      if (!n) return;
      const first = !seen.has(n);
      seen.add(n);
      parent.children[index] = {
        type: "text",
        value: "",
        data: {
          hName: "sup",
          hProperties: { className: ["fn-ref"], ...(first ? { id: `fnref-${n}` } : {}) },
          hChildren: [{ type: "element", tagName: "a", properties: { href: `#fn-${n}` }, children: [{ type: "text", value: String(n) }] }],
        },
      };
    });
    tree.children = tree.children.filter((c) => c.type !== "footnoteDefinition");
  };
}
