import ReactMarkdown from "react-markdown";
import type { Note } from "@/lib/footnotes";

/** ai-2027's footnote list: big bracketed numbers in the margin, back-arrow to the text */
export default function Footnotes({ notes }: { notes: Note[] }) {
  if (!notes.length) return null;
  return (
    <section id="footnotes" className="scroll-mt-8 pt-6">
      <h2 className="text-[2rem]">Footnotes</h2>
      <ol className="mt-6 grid gap-7">
        {notes.map((n) => (
          <li key={n.n} id={`fn-${n.n}`} className="grid scroll-mt-24 grid-cols-[4.2rem_minmax(0,1fr)]">
            <span className="text-[2rem] leading-[2rem]">[{n.n}]</span>
            <div className="prose-acrain">
              <p>
                <ReactMarkdown
                  allowedElements={["a", "em", "strong", "code"]}
                  unwrapDisallowed
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {n.text}
                </ReactMarkdown>{" "}
                <a href={`#fnref-${n.n}`} aria-label={`Back to note ${n.n}`} className="!no-underline">
                  ↩
                </a>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
