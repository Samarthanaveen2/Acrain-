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

## Writing a topic

Each topic is a folder in `content/topics/<slug>/`:

- `topic.json`: title, subtitle, intro questions, the dashboard (chart bands, share bar parts, metrics) and sources
- `chapters/01-name.md`, `02-name.md`, ...: one file per chapter, in order

A chapter's frontmatter sets what the dashboard shows while you read it:

```markdown
---
title: "Early 2027: The Legal Answer"
kind: forecast          # or "reported"
date: "2027-03"         # quoted YYYY-MM
label: "Clones under fire"
level: 1.5              # height on the level chart (0 to number of bands)
share: { code: 33, distribution: 27, trust: 18, data: 13, hardware: 9 }
metrics: { twins: 35, ps5: 25, rebuild: 5, takedowns: 9 }
---

Markdown text. Footnotes work like this.[^1]

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
