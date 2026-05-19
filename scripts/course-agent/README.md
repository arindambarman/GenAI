# `@adaptlearn/course-agent`

Authoring pipeline for the Agentic Systems course. Produces lesson markdown, rendered diagrams, and self-contained web lesson pages from a lesson spec.

> **Note on agency dial.** This pipeline currently runs at *dial 2* — deterministic stages with LLM sub-tasks. A *dial 3* variant (an LLM-driven orchestrator that decides stage order, retries, and revisions) will land alongside Module 4 of the course as a teaching artifact.

## Stages

| Stage      | Status | Output                                              |
| ---------- | ------ | --------------------------------------------------- |
| `content`  | stub   | `course/module-<N>-<slug>.md` (lesson markdown)     |
| `diagrams` | stub   | `course/diagrams/m<N>/*.svg` + rewritten markdown   |
| `web`      | ✓      | `course/web/m<N>/lesson-<id>.html` (lesson page)    |

## Quick start

From the repo root:

```sh
# Generate web lesson page for Lesson 1.1
npx tsx scripts/course-agent/src/index.ts web course/module-01-foundations.md --lesson 1.1

# Custom output path
npx tsx scripts/course-agent/src/index.ts web course/module-01-foundations.md \
  --lesson 1.1 --out path/to/custom.html

# Help
npx tsx scripts/course-agent/src/index.ts help
```

Open the generated HTML in any browser. The page loads KaTeX and highlight.js from CDN; everything else is inlined, so the file is fully self-contained and works offline once CDN assets are cached.

## Source layout

```
src/
├── index.ts           # CLI entry point
├── orchestrator.ts    # Dial-2 stage runner with gates
├── schema.ts          # Zod schemas for lesson spec, sections, stage results
├── markdown-parser.ts # Extract a single lesson from a module markdown file
└── stages/
    ├── content.ts     # [stub] Claude → lesson markdown
    ├── diagrams.ts    # [stub] Extract mermaid → render SVG → rewrite md
    └── web.ts         # ✓     Parse md → polished HTML lesson page
```

## Web page design

The web stage maps the 10-section lesson template onto a scrollable lesson page with:

- **Sticky page header** with breadcrumb + scroll-progress bar.
- **Sticky sidebar TOC** with scroll-spy (current section highlighted as you scroll).
- **Color-themed sections** — each of §0–§9 gets a left-border accent indicating its role (scenario/problem/solution/math/tech/etc).
- **KaTeX** for inline (`$...$`) and display (`$$...$$`) math, auto-rendered client-side.
- **highlight.js** for code blocks.
- **`<details>` blocks** for collapsible mermaid source (preserved from the markdown).
- **Keyboard navigation** — Shift+↑ / Shift+↓ to jump between sections.
- **Responsive layout** — sidebar collapses to a horizontal nav on narrow viewports.

Image paths in the source markdown are rewritten to be relative to the *web* output directory (not the markdown file's directory), so the HTML stays portable.

## Verification gates (between stages)

When `content` and `diagrams` land, the orchestrator will enforce:

- **Content gate:** lesson markdown parses cleanly via `ParsedLessonSchema` (round-trip through `extractLesson`).
- **Diagrams gate:** every `mermaid` block has a corresponding `.svg`; every `<img>` reference resolves on disk.
- **Web gate:** every declared section in the spec has a corresponding `<section>` in the rendered HTML.

Failures abort the pipeline rather than producing partial artifacts.
