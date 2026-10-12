import SiteHeader from "./SiteHeader";

export default function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1166px] px-4 pb-24 min-[731px]:px-8">
      <SiteHeader title={title} />
      <div className="prose-acrain max-w-[700px]">{children}</div>
    </div>
  );
}
