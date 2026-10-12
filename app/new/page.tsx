import SiteHeader from "@/components/SiteHeader";
import { createTopic } from "@/app/actions";

export const metadata = { title: "New topic · Acrain" };

const input =
  "mt-1.5 w-full rounded-md border-[1.5px] border-[#111] bg-background px-3 py-2 text-[1.3rem] outline-none focus:border-accent";

export default function NewTopicPage() {
  return (
    <div className="mx-auto max-w-[1166px] px-4 pb-24 min-[731px]:px-8">
      <SiteHeader title="New topic" />
      <form action={createTopic} className="grid max-w-[700px] gap-6">
        <label className="block text-[1.3rem]">
          Title
          <input name="title" required autoFocus placeholder="e.g. AI 2030" className={input} />
        </label>
        <label className="block text-[1.3rem]">
          Time span <span className="text-[#777]">(optional)</span>
          <input name="span" placeholder="e.g. 2026 → 2030" className={input} />
        </label>
        <label className="block text-[1.3rem]">
          One-line summary <span className="text-[#777]">(optional, shown on the home page)</span>
          <input name="summary" className={input} />
        </label>
        <p className="font-mono text-[13px] leading-relaxed text-[#777]">
          The topic starts with ai-2027&rsquo;s dashboard: AI R&amp;D lines, Hacking / Coding / Politics / Bioweapons /
          Robotics / Forecasting, Compute, agent copies, key stats and tech buckets. You fill in every number.
        </p>
        <div>
          <button
            type="submit"
            className="rounded-md border-[1.5px] border-[#111] bg-[#111] px-4 py-1.5 text-[1.3rem] text-background hover:bg-transparent hover:text-[#111]"
          >
            Create and start writing
          </button>
        </div>
      </form>
    </div>
  );
}
