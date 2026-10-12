"use client";

import { useEffect, useRef, useState } from "react";
import type { ChapterState, DashboardDef } from "@/lib/types";
import { Dashboard, DashboardCompact } from "./Dashboard";

/**
 * Two-column scroll story: chapters on the left (server-rendered, passed as children,
 * each marked with data-chapter="<index>"), sticky dashboard on the right that follows
 * whichever chapter crosses the middle of the screen.
 */
export default function TopicScroll({
  def,
  states,
  kinds,
  children,
}: {
  def: DashboardDef;
  states: ChapterState[];
  kinds: string[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-chapter]") ?? []);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.chapter));
        }
      },
      // A thin line just above the middle of the viewport
      { rootMargin: "-45% 0px -54% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 md:hidden">
        <DashboardCompact def={def} states={states} active={active} />
      </div>
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <div className="min-w-0">{children}</div>
        <aside className="hidden md:block" aria-label="Dashboard">
          <div className="sticky top-5" data-testid="dashboard" data-active={active}>
            <Dashboard def={def} states={states} active={active} kinds={kinds} />
          </div>
        </aside>
      </div>
    </div>
  );
}
