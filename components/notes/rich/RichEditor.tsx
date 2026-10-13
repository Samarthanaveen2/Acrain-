"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { BarChart3, Bold, Heading2, Italic, Link2, List, ListCollapse, Network, Superscript } from "lucide-react";
import type { RichDoc } from "@/lib/notes";
import { Chart, DeepDive, Footnote, NoteLink } from "./blocks";

export const extensions = (placeholder = "") => [
  StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }),
  Placeholder.configure({ placeholder }),
  DeepDive,
  Footnote,
  Chart,
  NoteLink,
];

type Panel = null | "note" | "link";

function Tool({ on, label, icon, children, onClick }: { on?: boolean; label: string; icon: React.ReactNode; children?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[12px] whitespace-nowrap ${on ? "bg-[#111] text-[#fffff8]" : "text-[#222] hover:bg-[#111]/[0.06]"}`}
    >
      {icon}
      {children}
    </button>
  );
}

function Toolbar({ editor, panel, setPanel }: { editor: Editor; panel: Panel; setPanel: (p: Panel) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h: e.isActive("heading"),
      list: e.isActive("bulletList"),
      link: e.isActive("link"),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <div className="flex gap-0.5 overflow-x-auto px-1.5 py-1 [scrollbar-width:none]">
      <Tool label="Bold" on={s.bold} icon={<Bold size={16} />} onClick={() => c().toggleBold().run()} />
      <Tool label="Italic" on={s.italic} icon={<Italic size={16} />} onClick={() => c().toggleItalic().run()} />
      <Tool label="Heading" on={s.h} icon={<Heading2 size={16} />} onClick={() => c().toggleHeading({ level: 2 }).run()} />
      <Tool label="List" on={s.list} icon={<List size={16} />} onClick={() => c().toggleBulletList().run()} />
      <span className="mx-1 w-px shrink-0 self-stretch bg-[#ddd]" />
      <Tool label="Link to a note" on={panel === "note"} icon={<Network size={15} />} onClick={() => setPanel(panel === "note" ? null : "note")}>
        Note
      </Tool>
      <Tool label="Web link" on={s.link || panel === "link"} icon={<Link2 size={15} />} onClick={() => setPanel(panel === "link" ? null : "link")}>
        Link
      </Tool>
      <Tool
        label="Deep-dive box"
        icon={<ListCollapse size={15} />}
        onClick={() =>
          c()
            .insertContent([
              { type: "deepDive", attrs: { title: "" }, content: [{ type: "paragraph" }] },
              { type: "paragraph" },
            ])
            .run()
        }
      >
        Box
      </Tool>
      <Tool label="Footnote" icon={<Superscript size={15} />} onClick={() => c().insertContent({ type: "footnote", attrs: { text: "" } }).run()}>
        Footnote
      </Tool>
      <Tool label="Chart" icon={<BarChart3 size={15} />} onClick={() => c().insertContent([{ type: "chart" }, { type: "paragraph" }]).run()}>
        Chart
      </Tool>
    </div>
  );
}

/** Picks (or names a new) note to link to; inserts it at the cursor */
function NotePicker({ editor, titles, close }: { editor: Editor; titles: string[]; close: () => void }) {
  const [q, setQ] = useState("");
  const s = q.trim();
  const matches = titles.filter((t) => t.toLowerCase().includes(s.toLowerCase())).slice(0, 12);
  const isNew = s && !titles.some((t) => t.toLowerCase() === s.toLowerCase());
  const pick = (title: string) => {
    editor.chain().focus().insertContent([{ type: "noteLink", attrs: { title } }, { type: "text", text: " " }]).run();
    close();
  };
  return (
    <div className="border-t border-[#ddd] px-2.5 py-2">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && s && (e.preventDefault(), pick(matches.find((m) => m.toLowerCase() === s.toLowerCase()) ?? s))}
        placeholder="Which note? Type to find one, or a new title"
        aria-label="Note to link"
        className="w-full rounded-md border border-[#c9c9bf] bg-[#fffff8] px-2.5 py-1.5 text-[1.15rem] outline-none focus:border-[#111]"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {matches.map((t) => (
          <button key={t} type="button" onClick={() => pick(t)} className="rounded-md border border-[#111] px-2 py-0.5 text-[1.1rem]">
            {t}
          </button>
        ))}
        {isNew && (
          <button type="button" onClick={() => pick(s)} className="rounded-md border border-dashed border-[#111] px-2 py-0.5 text-[1.1rem]">
            + New note &ldquo;{s}&rdquo;
          </button>
        )}
        {!matches.length && !isNew && <span className="font-mono text-[12px] text-[#888]">No other notes yet. Type a title to link a new one.</span>}
      </div>
    </div>
  );
}

function LinkPanel({ editor, close }: { editor: Editor; close: () => void }) {
  const [url, setUrl] = useState(String(editor.getAttributes("link").href ?? ""));
  const apply = () => {
    const href = url.trim() ? (/^https?:\/\//.test(url.trim()) ? url.trim() : `https://${url.trim()}`) : "";
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!href) chain.unsetLink().run();
    else if (editor.state.selection.empty && !editor.isActive("link"))
      chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    else chain.setLink({ href }).run();
    close();
  };
  return (
    <div className="flex gap-2 border-t border-[#ddd] px-2.5 py-2">
      <input
        autoFocus
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
        placeholder="Paste a web address"
        aria-label="Web address"
        className="min-w-0 flex-1 rounded-md border border-[#c9c9bf] bg-[#fffff8] px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-[#111]"
      />
      <button type="button" onClick={apply} className="rounded-md bg-[#111] px-3 font-mono text-[12px] text-[#fffff8]">
        {url.trim() ? "Add" : "Remove"}
      </button>
    </div>
  );
}

/** The writing area: what you see is what the note looks like */
export default function RichEditor({
  initial,
  onChange,
  titles,
  placeholder,
}: {
  initial: RichDoc | string;
  onChange: (doc: RichDoc, text: string) => void;
  titles: string[];
  placeholder?: string;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const editor = useEditor({
    extensions: extensions(placeholder),
    content: initial,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose-acrain rich-doc", "aria-label": "Note text" } },
    onUpdate: ({ editor: e }) => {
      onChange(e.getJSON() as RichDoc, e.getText());
      // Typing [[ opens the note picker, like other notes apps
      const { from } = e.state.selection;
      if (e.state.doc.textBetween(Math.max(0, from - 2), from) === "[[") {
        e.chain().deleteRange({ from: from - 2, to: from }).run();
        setPanel("note");
      }
    },
  });

  if (!editor) return <div className="min-h-[18rem] rounded-lg border-[1.5px] border-[#c9c9bf]" />;

  return (
    <div className="min-w-0 rounded-lg border-[1.5px] border-[#c9c9bf]">
      <div className="sticky top-[calc(var(--safe-top)+52px)] z-10 rounded-t-lg border-b border-[#ddd] bg-[#fffff8]">
        <Toolbar editor={editor} panel={panel} setPanel={setPanel} />
        {panel === "note" && <NotePicker editor={editor} titles={titles} close={() => setPanel(null)} />}
        {panel === "link" && <LinkPanel editor={editor} close={() => setPanel(null)} />}
      </div>
      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}
