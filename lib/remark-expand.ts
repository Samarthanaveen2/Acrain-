import { visit } from "unist-util-visit";
import type { Root } from "mdast";
// Registers the containerDirective node type on mdast's Root
import type {} from "mdast-util-directive";

/**
 * Turns `:::expand[Title] … :::` blocks (from remark-directive) into
 * <details class="expand"><summary>Title</summary>…</details>.
 */
export default function remarkExpand() {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type !== "containerDirective" || node.name !== "expand") return;
      node.data = { ...node.data, hName: "details", hProperties: { className: ["expand"] } };
      const first = node.children[0];
      if (first && first.type === "paragraph" && first.data?.directiveLabel) {
        first.data = { ...first.data, hName: "summary" };
      }
    });
  };
}
