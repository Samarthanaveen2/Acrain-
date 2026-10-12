import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkExpand from "@/lib/remark-expand";
import { parseChartSpec } from "@/lib/chart-spec";
import ChartBlock, { ChartError } from "./ChartBlock";

type HastNode = { type: string; tagName?: string; value?: string; properties?: { className?: unknown }; children?: HastNode[] };

/** If a <pre> holds a ```chart fence, return the fence's text */
function chartSource(node?: HastNode): string | null {
  const code = node?.children?.[0];
  if (code?.tagName !== "code") return null;
  const cls = code.properties?.className;
  if (!Array.isArray(cls) || !cls.includes("language-chart")) return null;
  return (code.children ?? []).map((c) => c.value ?? "").join("");
}

export default function ChapterBody({ id, body }: { id: string; body: string }) {
  return (
    <div className="prose-acrain">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkExpand]}
        // Footnote ids must be unique across chapters on the same page
        remarkRehypeOptions={{ clobberPrefix: `${id}-`, footnoteLabel: "Notes" }}
        components={{
          a: ({ href, children, node, ...rest }) => {
            const external = href?.startsWith("http");
            return (
              <a href={href} {...rest} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
                {children}
              </a>
            );
          },
          pre: ({ node, children, ...rest }) => {
            const src = chartSource(node as HastNode);
            if (src === null) return <pre {...rest}>{children}</pre>;
            const parsed = parseChartSpec(src);
            return "spec" in parsed ? <ChartBlock spec={parsed.spec} /> : <ChartError message={parsed.error} />;
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
