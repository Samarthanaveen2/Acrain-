"use client";

import { useEffect, useRef, useState } from "react";
import type { ChapterState, DashboardDef } from "@/lib/types";
import { Dashboard, DashboardFloating } from "./Dashboard";
import SectionNav from "./SectionNav";

/**
 * The topic page grid (ai-2027's .main-grid): chapter timeline on the left,
 * the reading column, and a sticky dashboard on the right that follows the
 * chapter crossing the middle of the screen. Phones get a floating card.
 */
export default function TopicScroll({
  header,
  def,
  states,
  navItems,
  children,
}: {
  header: React.ReactNode;
  def: DashboardDef;
  states: ChapterState[];
  navItems: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [narrow, setNarrow] = useState(false);
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
    const mq = window.matchMedia("(max-width: 930px)");
    const onMq = () => setNarrow(mq.matches);
    onMq();
    update();
    mq.addEventListener("change", onMq);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      mq.removeEventListener("change", onMq);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className="topic-grid pb-40">
      <div style={{ gridArea: "header" }}>{header}</div>
      <div className="topic-toc pt-[44px]" style={{ gridArea: "toc" }}>
        <SectionNav items={navItems} />
      </div>
      <div className="min-w-0" style={{ gridArea: "content" }}>
        {children}
      </div>
      <aside className="topic-graph" style={{ gridArea: "graph" }} aria-label="Dashboard">
        <div className="sticky top-5" data-testid="dashboard" data-active={active}>
          <Dashboard def={def} states={states} active={active} />
        </div>
      </aside>
      {narrow && <DashboardFloating def={def} states={states} active={active} />}
    </div>
  );
}
