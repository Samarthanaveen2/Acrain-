import Link from "next/link";

const links = [
  { href: "/#topics", label: "Topics" },
  { href: "/optionality", label: "Optionality" },
  { href: "/about", label: "About" },
];

export default function SiteNav() {
  return (
    <header className="border-b border-rule/30">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="font-bold tracking-[0.18em] text-[1.05rem] no-underline hover:text-accent transition-colors"
        >
          ACRAIN
        </Link>
        <ul className="flex items-center text-[1rem]">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block rounded-sm px-3 py-1 no-underline transition-colors hover:bg-accent hover:text-background"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
