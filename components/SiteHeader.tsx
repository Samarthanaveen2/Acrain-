import Link from "next/link";

const links = [
  { href: "/#topics", label: "Topics" },
  { href: "/optionality", label: "Optionality" },
];

/** ai-2027's header: huge serif title and byline on the left, plain nav on the right with a boxed last link */
export default function SiteHeader({ title, byline }: { title: string; byline?: React.ReactNode }) {
  return (
    <header className="flex flex-col-reverse gap-3 pt-2 pb-10 min-[731px]:flex-row min-[731px]:items-start min-[731px]:justify-between min-[731px]:pt-8">
      <div className="min-w-0">
        <h1 className="text-[4.2rem] leading-[1.02] tracking-[-0.01em] min-[731px]:text-[4.7rem]">{title}</h1>
        {byline && <p className="mt-3 text-[1.75rem] leading-tight tracking-[-0.035em]">{byline}</p>}
      </div>
      <nav className="flex shrink-0 items-center justify-end gap-1 text-[1.6rem] min-[731px]:pt-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="px-3 py-1 no-underline hover:underline">
            {l.label}
          </Link>
        ))}
        <Link href="/about" className="ml-2 rounded-md border-[1.5px] border-[#111] px-2 py-0.5 no-underline hover:bg-[#111] hover:text-background">
          About
        </Link>
      </nav>
    </header>
  );
}
