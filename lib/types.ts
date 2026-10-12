// Shared shapes for topics. Safe to import from client components.

export type MetricFormat = "number" | "currency" | "percent";

export type MetricDef = {
  key: string;
  label: string;
  /** Shorter label for the phone dashboard strip */
  short?: string;
  format?: MetricFormat;
  /** Text after the number, e.g. " wk" */
  suffix?: string;
};

export type ShareDef = {
  label: string;
  parts: { key: string; label: string }[];
};

export type DashboardDef = {
  /** Title over the level chart, e.g. "How easy is it to copy software?" */
  levelLabel: string;
  /** Band names from bottom to top; the chart's y axis runs 0..bands.length */
  bands: string[];
  share: ShareDef;
  metrics: MetricDef[];
  /** Small print under the dashboard, e.g. "Numbers after Oct 2026 are my guesses." */
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
  /** Short status under the date, e.g. "Alpha clones" */
  label: string;
  /** Position on the level chart, 0..bands.length */
  level: number;
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
