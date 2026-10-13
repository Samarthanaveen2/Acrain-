"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { fmtDate } from "@/lib/notes";
import { depthOf, maxDepth, sharedLayers, type Stack } from "@/lib/stacks";

/** All your stacks, plus what they reveal together: shared layers and where you could plug in */
export default function StacksHome({
  stacks,
  status,
  onCreate,
}: {
  stacks: Stack[];
  status: "loading" | "ready";
  onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const list = [...stacks].sort((a, b) => b.updated.localeCompare(a.updated));
  const shared = sharedLayers(stacks);
  const plugs = stacks.flatMap((s) => s.layers.filter((l) => l.plugIn).map((layer) => ({ stack: s, layer })));

  const h2 = "mt-10 font-mono text-[11px] tracking-wide text-[#777] uppercase";

  return (
    <div className="mx-auto max-w-[700px] px-4 pb-10">
      <SiteHeader title="Stacks" />
      <p className="-mt-6 mb-6 max-w-[34rem] text-[1.3rem] leading-snug text-[#555]">
        Everything you use sits on a stack of other things. Write down how it works, layer by layer, and see who really holds the
        power.
      </p>

      {adding ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            await onCreate(title.trim());
            setTitle("");
            setAdding(false);
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            aria-label="Stack name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Something you used today"
            className="min-w-0 flex-1 rounded-md border-[1.5px] border-[#111] bg-transparent px-3 py-1.5 text-[1.5rem] outline-none"
          />
          <button type="submit" disabled={!title.trim()} className="rounded-md bg-[#111] px-3 text-[1.25rem] text-[#fffff8] disabled:opacity-40">
            Start
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111] px-3 py-1.5 text-[1.3rem]"
        >
          <Plus size={17} /> New stack
        </button>
      )}

      {status === "loading" && <p className="mt-6 font-mono text-[12px] text-[#777]">Loading…</p>}
      {status === "ready" && list.length === 0 && (
        <p className="mt-6 max-w-[32rem] text-[1.2rem] leading-snug text-[#777] italic">
          Pick something you used today: an app, a drink, a phone. What&rsquo;s the top layer? What does it sit on? What does that sit
          on?
        </p>
      )}

      {list.length > 0 && (
        <ol className="mt-6 border-t border-[#666]/25">
          {list.map((s) => {
            const chokes = s.layers.filter((l) => l.choke).length;
            const risks = s.layers.filter((l) => l.threat === "at-risk" || l.threat === "being-eaten").length;
            const plugIns = s.layers.filter((l) => l.plugIn).length;
            return (
              <li key={s.id} className="border-b border-[#666]/25">
                <Link href={`/stacks/${s.id}`} className="flex items-center gap-4 py-3.5 no-underline">
                  <Silhouette stack={s} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1.7rem] leading-tight">{s.title}</span>
                    <span className="mt-0.5 block font-mono text-[10.5px] text-[#888]">
                      {s.layers.length} {s.layers.length === 1 ? "layer" : "layers"} · {maxDepth(s) + 1} deep · {fmtDate(s.updated)}
                    </span>
                    {(chokes || risks || plugIns) > 0 && (
                      <span className="mt-0.5 flex gap-2.5 font-mono text-[10.5px]">
                        {chokes > 0 && <span className="text-[#8b0000]">{chokes} chokepoint{chokes > 1 ? "s" : ""}</span>}
                        {risks > 0 && <span className="text-[#c77400]">{risks} at risk</span>}
                        {plugIns > 0 && <span className="text-[var(--path-b)]">{plugIns} way{plugIns > 1 ? "s" : ""} in</span>}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {stacks.length > 1 && (
        <section>
          <h2 className={h2}>What the world runs on</h2>
          {shared.length === 0 ? (
            <p className="mt-2 text-[1.15rem] leading-snug text-[#888] italic">
              When the same layer shows up under different stacks (the same name, or the same linked note), it appears here.
            </p>
          ) : (
            <ul className="mt-2">
              {shared.map((s) => (
                <li key={s.key} className="border-b border-[#666]/15 py-2.5">
                  <span className="text-[1.45rem]">{s.name}</span>{" "}
                  <span className="font-mono text-[10.5px] text-[#888]">under {s.places.length} stacks</span>
                  <span className="mt-0.5 block text-[1.15rem]">
                    {s.places.map((p, i) => (
                      <span key={p.stack.id}>
                        {i > 0 && <span className="text-[#aaa]"> · </span>}
                        <Link href={`/stacks/${p.stack.id}?focus=${p.layer.id}`} className="text-[var(--path-b)]">
                          {p.stack.title}
                        </Link>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {plugs.length > 0 && (
        <section>
          <h2 className={h2}>Where I could plug in</h2>
          <ul className="mt-2">
            {plugs.map(({ stack, layer }) => (
              <li key={`${stack.id}:${layer.id}`} className="border-b border-[#666]/15 py-2.5">
                <Link href={`/stacks/${stack.id}?focus=${layer.id}`} className="no-underline">
                  <span className="text-[1.4rem]">{layer.name}</span>{" "}
                  <span className="font-mono text-[10.5px] text-[#888]">in {stack.title}</span>
                  {layer.plugHow && <span className="mt-0.5 block text-[1.15rem] text-[#555]">{layer.plugHow}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A tiny picture of the stack's shape: how wide each level is */
function Silhouette({ stack }: { stack: Stack }) {
  const rows: number[] = [];
  for (const l of stack.layers) {
    const d = Math.min(5, depthOf(stack, l.id));
    rows[d] = (rows[d] ?? 0) + 1;
  }
  return (
    <svg width="44" height="40" viewBox="0 0 44 40" aria-hidden className="shrink-0">
      {rows.map((n, d) => {
        const count = Math.min(n, 7);
        return Array.from({ length: count }, (_, i) => (
          <circle key={`${d}-${i}`} cx={22 + (i - (count - 1) / 2) * 6} cy={4 + d * 7} r={d === 0 ? 3.2 : 2.2} fill={d === 0 ? "#111" : "#8a8a80"} />
        ));
      })}
    </svg>
  );
}
