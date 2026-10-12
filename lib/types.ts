// Shared shapes for topics. Safe to import from client components.
// The dashboard mirrors ai-2027.com's: a zooming multi-line chart with milestones,
// capability bars, a share donut, a "copies" waffle, key stats and tech buckets.

/** Name of an icon from lib/icons.tsx, e.g. "code", "gamepad" */
export type IconName = string;

export type MetricFormat = "number" | "currency" | "percent" | "year";

export type MetricDef = {
  key: string;
  label: string;
  format?: MetricFormat;
  /** Text after the number, e.g. "/mo" */
  suffix?: string;
};

export type SeriesDef = { key: string; label: string; icon?: IconName };

export type LinesDef = {
  /** What the lines measure, shown on hover and in the editor */
  label: string;
  series: SeriesDef[];
  /** Plot on a log scale (good for multipliers that grow fast) */
  log?: boolean;
  /** Points before the story starts, so the chart has history */
  history?: { date: string; label?: string; values: Record<string, number> }[];
};

export type CapabilitiesDef = {
  /** Vertical label, e.g. "Clone quality" */
  label: string;
  items: { key: string; label: string; icon: IconName }[];
};

export type ShareDef = {
  /** Shown in the middle of the donut */
  label: string;
  parts: { key: string; label: string; icon?: IconName }[];
};

export type WaffleDef = {
  /** Sentence with {metricKey} placeholders (shown bold) and {label} for the current milestone name */
  text: string;
  /** Metric that sets how many squares to draw */
  metric: string;
  /** One square per this many */
  per: number;
};

export type StatGroup = { icon?: IconName; label?: string; metrics: string[] };

export type TechItem = {
  key: string;
  label: string;
  icon?: IconName;
  /** "YYYY-MM" it becomes emerging tech (before that: science fiction) */
  emerging?: string;
  /** "YYYY-MM" it becomes something that exists */
  exists?: string;
};

export type DashboardDef = {
  lines: LinesDef;
  capabilities?: CapabilitiesDef;
  share?: ShareDef;
  waffle?: WaffleDef;
  metrics: MetricDef[];
  statGroups?: StatGroup[];
  tech?: { buckets: [string, string, string]; items: TechItem[] };
  /** Small print, e.g. "Numbers after Oct 2026 are my guesses." */
  note?: string;
};

export type Source = {
  id: string;
  title: string;
  publisher: string;
  date: string;
  url: string;
};

export type TopicMeta = {
  slug: string;
  title: string;
  /** Opening paragraph(s) under the title */
  subtitle: string;
  span: string;
  summary: string;
  author: string;
  started: string;
  updated: string;
  questions: { q: string; a: string }[];
  dashboard: DashboardDef;
  sources: Source[];
};

/** What the dashboard shows while a chapter is on screen. */
export type ChapterState = {
  /** "YYYY-MM" */
  date: string;
  /** Milestone name shown on the chart, e.g. "Alpha clones" */
  label: string;
  lines: Record<string, number>;
  capabilities: Record<string, number>;
  share: Record<string, number>;
  metrics: Record<string, number>;
};

export type ChapterKind = "reported" | "forecast";

export type Chapter = ChapterState & {
  id: string;
  title: string;
  kind: ChapterKind;
  body: string;
};

export type Topic = TopicMeta & { chapters: Chapter[] };
