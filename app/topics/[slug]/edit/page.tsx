import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTopic } from "@/lib/topics";
import TopicEditor from "@/components/editor/TopicEditor";

export const metadata = { title: "Editing · Acrain" };

export default function EditPage({ params }: PageProps<"/topics/[slug]/edit">) {
  return (
    <Suspense fallback={<p className="p-6 font-mono text-[13px] text-[#777]">Loading editor…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/topics/[slug]/edit">["params"] }) {
  // Always read the latest files, never a cached copy
  await connection();
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();
  return <TopicEditor initial={topic} />;
}
