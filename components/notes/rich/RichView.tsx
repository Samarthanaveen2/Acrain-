"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { RichDoc } from "@/lib/notes";
import { extensions } from "./RichEditor";

/** Reading a note: the same blocks as the editor, not editable */
export default function RichView({ doc }: { doc: RichDoc | string }) {
  const editor = useEditor(
    {
      extensions: extensions(),
      content: doc,
      editable: false,
      immediatelyRender: false,
      editorProps: { attributes: { class: "prose-acrain rich-doc" } },
    },
    [JSON.stringify(doc)],
  );
  return <EditorContent editor={editor} />;
}
