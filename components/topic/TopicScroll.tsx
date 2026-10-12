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
    let frame = 0;
    // The active chapter is the last one whose top has passed the middle of the screen.
    // Reading positions (rather than watching crossings) stays right after jumps to #links.
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.5;
      let current = 0;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= line) current = Number(el.dataset.chapter);
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
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
