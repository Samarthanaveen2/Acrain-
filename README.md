# Acrain

A personal ai-2027: scroll-story scenarios about the future, written for one reader, with a sticky dashboard that
moves as you scroll and branches for the paths I'm keeping open.

Built with Next.js + Tailwind. Typeset in ET Book (MIT, from Edward Tufte's et-book project).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Writing

1. On the home page, click **New topic** and give it a title.
2. In the editor, write the intro and questions, then **Add chapter** for each step of your story.
3. For each chapter set the month, a milestone name for the chart, write the text, and set the dashboard numbers
   (sliders for capabilities; number boxes accept shorthand like `47B`, `1.2T`, `20K`).
4. The right side shows the live dashboard. Press **Save** or Ctrl/⌘+S.

The writing box has buttons for a **deep-dive box**, a **footnote**, a **chart** and a **link**.
Saving writes files into `content/topics/`, so it works when Acrain runs on your own computer.

## Writing a topic

Each topic is a folder in `content/topics/<slug>/`:

- `topic.json`: title, intro, questions, sources and the **dashboard** definition, which mirrors ai-2027.com's:
  - `lines`: the top chart (e.g. the AI R&D multiplier for three labs), with optional `history` points and `log` scale
  - `capabilities`: the icon tiles (1 = top human expert; the tile turns green at 1 and a bar grows up to 3)
  - `share`: the donut (e.g. compute share)
  - `waffle`: the "copies thinking at Nx human speed" sentence and squares
  - `metrics` + `statGroups`: the Approval / Revenue / Valuation style stats
  - `tech`: Currently Exists / Emerging Tech / Science Fiction items with the month each one moves
- `chapters/01-name.md`, `02-name.md`, ...: one file per chapter, in order

A chapter's frontmatter sets what the dashboard shows while you read it:

```markdown
---
title: "Late 2027: Coding Is Automated"
kind: forecast          # or "reported"
date: "2027-10"         # quoted YYYY-MM
label: "Superhuman coder"   # milestone name on the chart
lines: { lead: 3.2, us: 2.4, china: 2.0 }
capabilities: { hacking: 1.2, bio: 1.0, coding: 1.9, robotics: 0.2, politics: 0.7, forecasting: 0.95 }
share: { lead: 17, us: 52, china: 16, row: 15 }
metrics: { copies: 200000, speed: 30, approval: -22, revenue: 140000000000 }
---

Markdown text. Footnotes are numbered across the whole topic.[^1]

:::expand[A collapsible deep-dive]
Hidden until clicked.
:::

[^1]: [Source title](https://example.com)
```

### Charts

Put a chart anywhere in a chapter with a `chart` code block. Each line is `label: number`;
month labels (`2027-03`) on a line chart are spaced by time.

````markdown
```chart
type: line          # line or bar
title: PS5 games running natively on PC
unit: games
2026-10: 2
2027-03: 25
2027-10: 120
```
````

Every topic page also gets a **Trends** section: one line chart per dashboard metric, drawn
from the chapters' numbers.

## Roadmap

1. Shell and typography
2. Topic page: chapters, sticky dashboard, expandables, footnotes
3. Branches and the optionality map
4. In-app authoring + Supabase storage
5. Deploy, phone install, AI helper
