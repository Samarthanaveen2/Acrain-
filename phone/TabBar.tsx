import { CalendarDays, Network, NotebookPen, Plus, Settings } from "lucide-react";
import { navigate } from "./router";

const tabs = [
  { path: "/", label: "Notes", icon: NotebookPen },
  { path: "/map", label: "Map", icon: Network },
  { path: "/new-note", label: "New", icon: Plus, primary: true },
  { path: "/timeline", label: "Timeline", icon: CalendarDays },
  { path: "/settings", label: "Settings", icon: Settings },
];

/** iOS-style bottom tabs, sitting above the home bar */
export default function TabBar({ path }: { path: string }) {
  const current = path.split("?")[0];
  return (
    <nav aria-label="Main" className="tab-bar fixed inset-x-0 bottom-0 z-30 border-t border-[#666]/25 bg-[#fffff8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[600px] items-end justify-around px-2 pt-1.5">
        {tabs.map((t) => {
          const on = t.path === "/" ? current === "/" : current.startsWith(t.path);
          const Icon = t.icon;
          return (
            <button
              key={t.path}
              type="button"
              aria-label={t.label}
              aria-current={on ? "page" : undefined}
              onClick={() => navigate(t.path, { root: !t.primary })}
              className="flex min-w-[3.6rem] flex-col items-center gap-0.5 pb-1"
            >
              {t.primary ? (
                <span className="flex h-[34px] w-[46px] items-center justify-center rounded-[10px] bg-[#111] text-[#fffff8]">
                  <Icon size={22} strokeWidth={2.25} />
                </span>
              ) : (
                <Icon size={23} strokeWidth={on ? 2.3 : 1.7} className={on ? "text-[#111]" : "text-[#8a8a80]"} />
              )}
              <span className={`font-mono text-[10px] ${on ? "text-[#111]" : "text-[#8a8a80]"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
