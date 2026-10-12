---
title: "Early October 2026: The Clones Arrive"
kind: reported
date: "2026-10"
label: "Alpha clones"
lines: { solo: 8, oss: 4, corp: 2.2 }
capabilities: { photo: 0.7, games: 0.3, video: 0.4, audio: 0.4, design: 0.6, cad: 0.1 }
share: { code: 40, distribution: 25, trust: 15, data: 12, hardware: 8 }
metrics: { twins: 7, rebuild: 8, ps5: 2, takedowns: 0, price: 60, switched: 1 }
---

In the same fortnight, two projects showed how cheap copying has become.

On October 7, Brandon Thomas of the ArtCraft project released seven open-source apps built to replace Adobe's best sellers: PhotoCraft, VectorCraft, FilmCraft, LightCraft, EffectCraft, DesignCraft and PrintCraft. They're written in Rust, licensed MIT and Apache 2.0, and he says he built them with Claude as a "clean-room reimplementation."[^artcraft] They're alpha. Reviewers say they're far from replacing Photoshop, and most can't open Adobe's own files yet.[^vice]

Meanwhile AnyPS5, a hobby project, skips emulation entirely. It translates PS5 games into native Windows and Linux programs. Its coverage of PS5 graphics instructions reportedly jumped from about 50% to 96% in a single week, and Dead Cells now runs as a plain `.exe`.[^anyps5]

```chart
type: bar
title: AnyPS5 coverage of PS5 graphics instructions
unit: %, approximate
A week earlier: 50
Early October: 96
```

:::expand[Why "clean-room" matters]
In the 1980s, Phoenix Technologies legally copied IBM's BIOS by splitting the work: one team wrote down what the BIOS *did*, and a second team, who never saw IBM's code, wrote new code from that description. Courts accepted it, and the PC clone industry was born.

ArtCraft claims the same defence, with an AI doing the second team's job. Nobody knows yet whether that holds up. The trade-dress question (how closely the apps *look* like Adobe's) is a separate risk.
:::

Neither project is finished. What's new is the speed: work that used to take a company years took one person weeks.

[^artcraft]: [PetaPixel](https://petapixel.com/2026/10/07/someone-rebuilt-free-open-source-versions-of-photoshop-premiere-and-lightroom-using-ai/), [Notebookcheck](https://www.notebookcheck.net/Photoshop-Premiere-more-Experienced-Rust-developer-recreates-Adobe-suite-with-AI-assistance-as-open-source.1419230.0.html)
[^vice]: [Vice: Do they actually work?](https://www.vice.com/en/article/everything-we-know-about-the-free-adobe-clones-built-with-ai-do-they-actually-work/)
[^anyps5]: [TechPowerUp](https://www.techpowerup.com/353098/anyps5-project-skips-emulation-entirely-aims-to-port-playstation-5-games-to-pc-directly), [Elite Gamers](https://elitegamers.net/news/anyps5-ps5-games-native-pc-without-emulator/)
