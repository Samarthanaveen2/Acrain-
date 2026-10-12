export default function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-14 pb-24 sm:pt-20">
      <h1 className="text-[2.4rem] leading-tight sm:text-[3rem]">{title}</h1>
      <div className="mt-4 text-dull">{children}</div>
    </div>
  );
}
