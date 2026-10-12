import type { Chapter, DashboardDef, TopicMeta } from "./types";

/**
 * The dashboard every new topic starts with: ai-2027.com's layout and categories.
 * Only the structure lives here. All numbers come from what you write in each chapter.
 */
export const AI_2027_DASHBOARD: DashboardDef = {
  "lines": {
    "label": "AI R&D progress multiplier: how much faster AI research goes with AI help",
    "log": true,
    "series": [
      {
        "key": "lead",
        "label": "Leading US lab",
        "icon": "sparkles"
      },
      {
        "key": "us",
        "label": "Other US labs",
        "icon": "building"
      },
      {
        "key": "china",
        "label": "Chinese labs",
        "icon": "flag"
      }
    ]
  },
  "capabilities": {
    "label": "AI Capabilities",
    "items": [
      {
        "key": "hacking",
        "label": "Hacking",
        "icon": "shield-alert"
      },
      {
        "key": "bio",
        "label": "Bioweapons",
        "icon": "biohazard"
      },
      {
        "key": "coding",
        "label": "Coding",
        "icon": "code-xml"
      },
      {
        "key": "robotics",
        "label": "Robotics",
        "icon": "bot"
      },
      {
        "key": "politics",
        "label": "Politics",
        "icon": "landmark"
      },
      {
        "key": "forecasting",
        "label": "Forecasting",
        "icon": "chart-line"
      }
    ]
  },
  "share": {
    "label": "Compute",
    "parts": [
      {
        "key": "lead",
        "label": "Leading US lab",
        "icon": "sparkles"
      },
      {
        "key": "us",
        "label": "Rest of US",
        "icon": "building"
      },
      {
        "key": "china",
        "label": "China",
        "icon": "flag"
      },
      {
        "key": "row",
        "label": "Rest of world",
        "icon": "globe"
      }
    ]
  },
  "waffle": {
    "text": "{copies} {label} copies thinking at {speed} human speed",
    "metric": "copies",
    "per": 5000
  },
  "metrics": [
    {
      "key": "copies",
      "label": "Agent copies"
    },
    {
      "key": "speed",
      "label": "Speed",
      "suffix": "x"
    },
    {
      "key": "approval",
      "label": "Approval",
      "format": "percent"
    },
    {
      "key": "revenue",
      "label": "Revenue",
      "format": "currency",
      "suffix": "/yr"
    },
    {
      "key": "valuation",
      "label": "Valuation",
      "format": "currency"
    },
    {
      "key": "importance",
      "label": "Importance",
      "format": "percent"
    },
    {
      "key": "datacenters",
      "label": "Datacenters",
      "format": "currency",
      "suffix": "/yr"
    },
    {
      "key": "timeline",
      "label": "Timeline",
      "format": "year"
    }
  ],
  "statGroups": [
    {
      "icon": "sparkles",
      "label": "Leading lab",
      "metrics": [
        "approval",
        "revenue",
        "valuation"
      ]
    },
    {
      "icon": "globe",
      "label": "World",
      "metrics": [
        "importance",
        "datacenters",
        "timeline"
      ]
    }
  ],
  "tech": {
    "buckets": [
      "Currently Exists",
      "Emerging Tech",
      "Science Fiction"
    ],
    "items": [
      {
        "key": "translate",
        "label": "Machine translation",
        "exists": "2016-01"
      },
      {
        "key": "chatbots",
        "label": "Chatbots",
        "icon": "bot",
        "exists": "2023-01"
      },
      {
        "key": "imagegen",
        "label": "AI image and video generation",
        "exists": "2024-01"
      },
      {
        "key": "robotaxi",
        "label": "Self-driving taxis",
        "icon": "car",
        "emerging": "2020-01",
        "exists": "2024-06"
      },
      {
        "key": "agents",
        "label": "AI coding agents",
        "icon": "code-xml",
        "emerging": "2024-10",
        "exists": "2025-09"
      },
      {
        "key": "longagents",
        "label": "Agents that work for days",
        "emerging": "2026-02"
      },
      {
        "key": "humanoids",
        "label": "Humanoid robots in homes",
        "icon": "bot",
        "emerging": "2026-06"
      },
      {
        "key": "aisci",
        "label": "AI scientists",
        "icon": "microscope",
        "emerging": "2026-09"
      },
      {
        "key": "drugs",
        "label": "AI-discovered drugs approved"
      },
      {
        "key": "factories",
        "label": "Fully automated factories",
        "icon": "factory"
      },
      {
        "key": "bci",
        "label": "Brain-computer interfaces for healthy people",
        "icon": "brain"
      },
      {
        "key": "superint",
        "label": "Superintelligence",
        "icon": "sparkles"
      },
      {
        "key": "fusion",
        "label": "Fusion power on the grid",
        "icon": "zap"
      },
      {
        "key": "nano",
        "label": "Nanobots",
        "icon": "atom"
      },
      {
        "key": "upload",
        "label": "Mind uploading"
      },
      {
        "key": "space",
        "label": "Space colonies",
        "icon": "rocket"
      }
    ]
  }
};

export function newTopicMeta(slug: string, fields: { title: string; span: string; summary: string; author: string; today: string }): TopicMeta {
  return {
    slug,
    title: fields.title,
    subtitle: "",
    span: fields.span,
    summary: fields.summary,
    author: fields.author,
    started: fields.today,
    updated: fields.today,
    questions: [],
    dashboard: structuredClone(AI_2027_DASHBOARD),
    sources: [],
  };
}

/** A new chapter starts from the previous chapter's numbers so you only change what moved */
export function newChapter(dash: DashboardDef, prev: Chapter | undefined, id: string): Chapter {
  const zero = (keys: string[], v = 0) => Object.fromEntries(keys.map((k) => [k, v]));
  const nextMonth = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    const t = y * 12 + (m - 1) + 3;
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
  };
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return {
    id,
    title: "",
    kind: "forecast",
    date: prev ? nextMonth(prev.date) : thisMonth,
    label: prev?.label ?? "",
    lines: prev ? { ...prev.lines } : zero(dash.lines.series.map((s) => s.key), 1),
    capabilities: prev ? { ...prev.capabilities } : zero(dash.capabilities?.items.map((i) => i.key) ?? []),
    share: prev
      ? { ...prev.share }
      : zero(dash.share?.parts.map((p) => p.key) ?? [], Math.round(100 / Math.max(1, dash.share?.parts.length ?? 1))),
    metrics: prev ? { ...prev.metrics } : zero(dash.metrics.map((m) => m.key)),
    body: "",
  };
}
