import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { spawn } from "node:child_process";
import type { StageResult } from "../schema.js";

function runMmdc(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(cmd, ["mmdc", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mmdc exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

interface MermaidBlock {
  source: string;       // mermaid code (without ```mermaid fences)
  blockText: string;    // full block including fences
  startIdx: number;     // char index in the markdown
  endIdx: number;       // exclusive end char index
  name: string;         // resolved name slug
  altFromHeading: string; // descriptive alt text from nearest preceding heading
}

/**
 * Diagrams stage: scan a module markdown for mermaid code blocks that
 * have NOT already been rendered (i.e. are not inside a <details> block),
 * render each to SVG via mmdc, write the .mmd source next to the .svg,
 * and rewrite the markdown to embed the image plus a collapsible <details>
 * block preserving the mermaid source.
 *
 * Naming:
 *   - First-line comment "%% name: my-slug" wins
 *   - Otherwise falls back to "diagram-NN" where NN is per-module sequence
 *
 * Idempotent: re-running on the same file is a no-op once all blocks are
 * already inside <details>.
 */
export async function runDiagramsStage(markdownPath: string): Promise<StageResult> {
  const warnings: string[] = [];
  try {
    const md = await readFile(markdownPath, "utf-8");
    const moduleDir = inferModuleDir(markdownPath);
    const diagramsDir = join(dirname(markdownPath), "diagrams", moduleDir);

    const blocks = extractUnprocessedMermaidBlocks(md);
    if (blocks.length === 0) {
      return {
        stage: "diagrams",
        ok: true,
        outputs: [],
        warnings: ["No new mermaid blocks to render"],
      };
    }

    await mkdir(diagramsDir, { recursive: true });

    // Resolve names with disambiguation
    const usedNames = new Set<string>();
    const resolvedBlocks = blocks.map((b, i) => {
      let name = b.name || `diagram-${String(i + 1).padStart(2, "0")}`;
      let suffix = 0;
      let candidate = name;
      while (usedNames.has(candidate)) {
        suffix += 1;
        candidate = `${name}-${suffix}`;
      }
      usedNames.add(candidate);
      return { ...b, name: candidate };
    });

    // Render each (sequential to keep mmdc usage simple)
    const outputs: string[] = [];
    for (const b of resolvedBlocks) {
      const mmdPath = join(diagramsDir, `${b.name}.mmd`);
      const svgPath = join(diagramsDir, `${b.name}.svg`);

      // Strip the %% name: comment before writing (it's not needed for rendering)
      const cleanSource = b.source.replace(/^\s*%%\s*name:\s*\S+\s*$\n?/m, "");
      await writeFile(mmdPath, cleanSource, "utf-8");

      try {
        await runMmdc(["-i", mmdPath, "-o", svgPath, "-b", "transparent"]);
        outputs.push(svgPath);
      } catch (err) {
        warnings.push(`Failed to render ${b.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Rewrite markdown in reverse (preserves earlier indices)
    let newMd = md;
    for (let i = resolvedBlocks.length - 1; i >= 0; i--) {
      const b = resolvedBlocks[i];
      const svgRel = `diagrams/${moduleDir}/${b.name}.svg`;
      const alt = b.altFromHeading || titleCaseFromSlug(b.name);
      const cleanBlock = b.blockText.replace(/^(```mermaid\n)\s*%%\s*name:\s*\S+\s*$\n?/m, "$1");
      const replacement =
        `![${alt}](${svgRel})\n\n` +
        `<details><summary>Mermaid source</summary>\n\n${cleanBlock}\n\n</details>`;
      newMd = newMd.slice(0, b.startIdx) + replacement + newMd.slice(b.endIdx);
    }

    await writeFile(markdownPath, newMd, "utf-8");

    return { stage: "diagrams", ok: true, outputs, warnings };
  } catch (err) {
    return {
      stage: "diagrams",
      ok: false,
      outputs: [],
      warnings,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function inferModuleDir(markdownPath: string): string {
  const fname = basename(markdownPath);
  const match = fname.match(/module-(\d+)/i);
  if (match) return `m${match[1].padStart(2, "0")}`;
  return "shared";
}

function titleCaseFromSlug(slug: string): string {
  return slug
    .replace(/^\d+-?/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract every ```mermaid block that is NOT inside an open <details> element.
 * Returns blocks with absolute character offsets so we can splice the markdown.
 *
 * Also extracts the nearest preceding heading (## or ### text) to use as alt
 * text fallback.
 */
function extractUnprocessedMermaidBlocks(md: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  const mermaidRe = /^```mermaid\n([\s\S]*?)\n```/gm;
  const detailsOpenRe = /<details(?:\s[^>]*)?>/g;
  const detailsCloseRe = /<\/details>/g;
  const headingRe = /^(#{1,6})\s+(.+?)\s*$/gm;

  // Precompute open/close positions for <details> nesting
  const opens: number[] = [];
  const closes: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = detailsOpenRe.exec(md)) !== null) opens.push(m.index);
  while ((m = detailsCloseRe.exec(md)) !== null) closes.push(m.index);

  const isInsideDetails = (idx: number): boolean => {
    const openCount = opens.filter((p) => p < idx).length;
    const closeCount = closes.filter((p) => p < idx).length;
    return openCount > closeCount;
  };

  // Precompute headings with positions
  const headings: { idx: number; text: string }[] = [];
  let h: RegExpExecArray | null;
  while ((h = headingRe.exec(md)) !== null) {
    headings.push({ idx: h.index, text: h[2].trim() });
  }

  while ((m = mermaidRe.exec(md)) !== null) {
    const startIdx = m.index;
    const endIdx = m.index + m[0].length;
    if (isInsideDetails(startIdx)) continue;

    const source = m[1];
    const blockText = m[0];

    const nameMatch = source.match(/^\s*%%\s*name:\s*(\S+)/m);
    const name = nameMatch ? sanitizeSlug(nameMatch[1]) : "";

    // Nearest preceding heading (strip the §N · prefix if present)
    const precedingHeading = [...headings].reverse().find((x) => x.idx < startIdx);
    const altFromHeading = precedingHeading
      ? precedingHeading.text.replace(/^§\d+\s*·\s*/, "").trim()
      : "";

    blocks.push({ source, blockText, startIdx, endIdx, name, altFromHeading });
  }

  return blocks;
}

function sanitizeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
