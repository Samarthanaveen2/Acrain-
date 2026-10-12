import Link from "next/link";

export type TopicCardProps = {
  href: string;
  title: string;
  span: string;
  summary: string;
  status?: string;
};

export default function TopicCard({ href, title, span, summary, status }: TopicCardProps) {
  return (
    <Link
      href={href}
      className="graph-border-box group block px-4 py-3 no-underline transition-colors hover:bg-dull-bg/60"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-wider text-dull">{span}</span>
        {status && (
          <span className="rounded-sm bg-dull-bg px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dull">
            {status}
          </span>
        )}
      </div>
      <h3 className="mt-1 text-[1.45rem] leading-tight group-hover:text-accent transition-colors">{title}</h3>
      <p className="mt-1 text-[1.05rem] leading-snug text-dull">{summary}</p>
    </Link>
  );
}
