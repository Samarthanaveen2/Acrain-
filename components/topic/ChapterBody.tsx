import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkExpand from "@/lib/remark-expand";

export default function ChapterBody({ id, body }: { id: string; body: string }) {
  return (
    <div className="prose-acrain">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkExpand]}
        // Footnote ids must be unique across chapters on the same page
        remarkRehypeOptions={{ clobberPrefix: `${id}-`, footnoteLabel: "Notes" }}
        components={{
          a: ({ href, children, ...rest }) => {
            const external = href?.startsWith("http");
            return (
              <a href={href} {...rest} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
                {children}
              </a>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
