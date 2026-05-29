#!/usr/bin/env node
import { runWebStage } from "./stages/web.js";
import { runContentStage } from "./stages/content.js";
import { runDiagramsStage } from "./stages/diagrams.js";
import { buildIndices } from "./stages/indices.js";
import { runConceptsStage, runBookCoverStage } from "./stages/concepts.js";
import { runScenariosStage } from "./stages/scenarios.js";
import type { StageResult } from "./schema.js";

const HELP = `course-agent — AdaptLearn course-authoring pipeline

Usage:
  course-agent web      <markdown-path> --lesson <id> [--out <out-path>]
  course-agent diagrams <markdown-path>
  course-agent indices  [--course-dir <dir>] [--web-dir <dir>]
  course-agent concepts [--course-dir <dir>] [--web-dir <dir>]
  course-agent book     [--course-dir <dir>] [--web-dir <dir>]
  course-agent scenarios [--web-dir <dir>]
  course-agent content  <lesson-spec.yaml>                   [stub]
  course-agent help

Examples:
  course-agent web course/module-01-foundations.md --lesson 1.1
  course-agent concepts            # generate per-concept reference pages
  course-agent book                # generate book cover/TOC page
`;

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [, , command = "help", ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

function defaultWebPath(lessonId: string): string {
  const moduleNum = lessonId.split(".")[0];
  const padded = moduleNum.padStart(2, "0");
  return `course/web/m${padded}/lesson-${lessonId}.html`;
}

function reportStage(r: StageResult): void {
  const status = r.ok ? "OK " : r.error === "STAGE_NOT_IMPLEMENTED" ? "SKIP" : "FAIL";
  console.log(`[${status}] ${r.stage}${r.outputs.length > 0 ? ` -> ${r.outputs.join(", ")}` : ""}`);
  for (const w of r.warnings) console.log(`       warning: ${w}`);
  if (r.error && r.error !== "STAGE_NOT_IMPLEMENTED") {
    console.log(`       error:   ${r.error}`);
  }
}

async function main(): Promise<number> {
  const { command, positional, flags } = parseArgs(process.argv);

  switch (command) {
    case "web": {
      const markdownPath = positional[0];
      const lessonId = flags.lesson;
      if (!markdownPath || !lessonId) {
        console.error("Usage: course-agent web <markdown-path> --lesson <id> [--out <path>]");
        return 2;
      }
      const outPath = flags.out ?? defaultWebPath(lessonId);
      const result = await runWebStage({ markdownPath, lessonId, outPath });
      reportStage(result);
      return result.ok ? 0 : 1;
    }
    case "diagrams": {
      const markdownPath = positional[0];
      if (!markdownPath) {
        console.error("Usage: course-agent diagrams <markdown-path>");
        return 2;
      }
      const result = await runDiagramsStage(markdownPath);
      reportStage(result);
      return result.ok ? 0 : 1;
    }
    case "content": {
      const specPath = positional[0];
      if (!specPath) {
        console.error("Usage: course-agent content <lesson-spec.yaml>");
        return 2;
      }
      // Stub: spec parsing lands with the content stage implementation.
      const result = await runContentStage({
        module: 0,
        lesson: "0.0",
        title: `(stub for ${specPath})`,
        prereqs: [],
        forwardRefs: [],
      });
      reportStage(result);
      return result.ok ? 0 : 1;
    }
    case "indices": {
      const courseDir = flags["course-dir"] ?? "course";
      const webDir = flags["web-dir"] ?? "course/web";
      await buildIndices({ courseDir, webDir });
      console.log(`[OK ] indices -> ${webDir}/index.html + per-module + capstones`);
      return 0;
    }
    case "concepts": {
      const courseDir = flags["course-dir"] ?? "course";
      const webDir = flags["web-dir"] ?? "course/web";
      const result = await runConceptsStage({ courseDir, webDir });
      reportStage(result);
      return result.ok ? 0 : 1;
    }
    case "book": {
      const courseDir = flags["course-dir"] ?? "course";
      const webDir = flags["web-dir"] ?? "course/web";
      const result = await runBookCoverStage({ courseDir, webDir });
      reportStage(result);
      return result.ok ? 0 : 1;
    }
    case "scenarios": {
      const webDir = flags["web-dir"] ?? "course/web";
      const result = await runScenariosStage({ webDir });
      reportStage(result);
      return result.ok ? 0 : 1;
    }
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return 0;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      return 2;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
