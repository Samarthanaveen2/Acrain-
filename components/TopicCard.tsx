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
      className="group block rounded-md border-[1.5px] border-[#111] px-4 py-3 no-underline transition-colors hover:bg-[#111]/[0.03]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[13px] text-[#777]">{span}</span>
        {status && (
          <span className="font-mono text-[13px] text-[#777]">
            {status}
          </span>
        )}
      </div>
      <h3 className="mt-1 text-[1.9rem] leading-tight">{title}</h3>
      <p className="mt-1.5 text-[1.25rem] leading-snug text-[#444]">{summary}</p>
    </Link>
  );
}
