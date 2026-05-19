#!/usr/bin/env node
/**
 * Tiny HTTP server that exposes the three capstone agents over
 * newline-delimited JSON (NDJSON) streaming, plus serves a single
 * static HTML page as the UI.
 *
 * No external HTTP framework — only Node's built-in `http`.
 *
 *   GET  /                  → public/index.html
 *   GET  /health            → { ok: true }
 *   POST /api/research      → ndjson stream { progress } ... { result } | { error }
 *   POST /api/knowledge     → ndjson stream (body: { mode, input })
 *   POST /api/brainstorm    → ndjson stream
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runResearchAgent } from "../research-agent/agent.js";
import { ResearchQuerySchema } from "../research-agent/schema.js";
import { queryKB, organizeKB, addToKB } from "../knowledge-agent/agent.js";
import { runBrainstormAgent } from "../brainstorm-agent/agent.js";
import { BrainstormQuerySchema } from "../brainstorm-agent/schema.js";
import { env } from "../shared/env.js";
import { setMockHandler } from "../shared/llm.js";
import { researchMockHandler } from "../research-agent/mock.js";
import { knowledgeMockHandler } from "../knowledge-agent/mock.js";
import { brainstormMockHandler } from "../brainstorm-agent/mock.js";
import type { Trace, TraceStep } from "../shared/trace.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const PORT = Number(process.env.CAPSTONE_UI_PORT ?? 3005);

// Each agent endpoint installs its own mock handler before running.
// In mock mode, the global handler is the last one installed; that's fine
// for the UI because requests are sequential.

interface Event {
  type: "progress" | "result" | "error" | "info";
  [key: string]: unknown;
}

function writeEvent(res: ServerResponse, event: Event): void {
  res.write(JSON.stringify(event) + "\n");
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function startNdjsonResponse(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
}

function streamProgress(res: ServerResponse, trace: Trace, sentCount: { n: number }): void {
  for (let i = sentCount.n; i < trace.steps.length; i++) {
    writeEvent(res, { type: "progress", step: trace.steps[i] as TraceStep });
  }
  sentCount.n = trace.steps.length;
}

function infoModeMessage(): string {
  return env.isMockMode
    ? "MOCK MODE (set ANTHROPIC_API_KEY for real LLM)"
    : `Using model ${env.model}`;
}

async function handleResearch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  startNdjsonResponse(res);
  writeEvent(res, { type: "info", message: infoModeMessage() });
  try {
    const body = await readJsonBody(req);
    if (env.isMockMode) setMockHandler(researchMockHandler);

    const query = ResearchQuerySchema.parse({
      question: String(body.question ?? ""),
      minSources: Number(body.minSources ?? 3),
      maxSources: Number(body.maxSources ?? 8),
    });

    const sent = { n: 0 };
    const result = await runResearchAgent(query, (trace) => streamProgress(res, trace, sent));

    writeEvent(res, {
      type: "result",
      data: {
        synthesis: result.synthesis,
        faithfulness: result.faithfulness,
        traceSummary: {
          llmCalls: result.trace.totalLLMCalls,
          toolCalls: result.trace.totalToolCalls,
          cost: result.trace.totalCost,
        },
      },
    });
  } catch (err) {
    writeEvent(res, { type: "error", message: err instanceof Error ? err.message : String(err) });
  }
  res.end();
}

async function handleKnowledge(req: IncomingMessage, res: ServerResponse): Promise<void> {
  startNdjsonResponse(res);
  writeEvent(res, { type: "info", message: infoModeMessage() });
  try {
    const body = await readJsonBody(req);
    const mode = String(body.mode ?? "query");
    const input = String(body.input ?? "");

    if (env.isMockMode) setMockHandler(knowledgeMockHandler);

    const sent = { n: 0 };
    if (mode === "query") {
      const r = await queryKB(input, (trace) => streamProgress(res, trace, sent));
      writeEvent(res, {
        type: "result",
        data: {
          mode: "query",
          answer: r.answer,
          traceSummary: { llmCalls: r.trace.totalLLMCalls, toolCalls: r.trace.totalToolCalls, cost: r.trace.totalCost },
        },
      });
    } else if (mode === "organize") {
      const r = await organizeKB((trace) => streamProgress(res, trace, sent));
      writeEvent(res, {
        type: "result",
        data: {
          mode: "organize",
          report: r.report,
          traceSummary: { llmCalls: r.trace.totalLLMCalls, toolCalls: r.trace.totalToolCalls, cost: r.trace.totalCost },
        },
      });
    } else if (mode === "add") {
      const r = await addToKB(input, (trace) => streamProgress(res, trace, sent));
      writeEvent(res, {
        type: "result",
        data: {
          mode: "add",
          summary: r.summary,
          notesCreated: r.notesCreated,
          linksAdded: r.linksAdded,
          traceSummary: { llmCalls: r.trace.totalLLMCalls, toolCalls: r.trace.totalToolCalls, cost: r.trace.totalCost },
        },
      });
    } else {
      writeEvent(res, { type: "error", message: `Unknown mode: ${mode}` });
    }
  } catch (err) {
    writeEvent(res, { type: "error", message: err instanceof Error ? err.message : String(err) });
  }
  res.end();
}

async function handleBrainstorm(req: IncomingMessage, res: ServerResponse): Promise<void> {
  startNdjsonResponse(res);
  writeEvent(res, { type: "info", message: infoModeMessage() });
  try {
    const body = await readJsonBody(req);
    if (env.isMockMode) setMockHandler(brainstormMockHandler);

    const query = BrainstormQuerySchema.parse({
      topic: String(body.topic ?? ""),
      context: body.context ? String(body.context) : undefined,
      constraints: Array.isArray(body.constraints) ? (body.constraints as string[]) : [],
      num_techniques: Number(body.num_techniques ?? 4),
      ideas_per_technique: Number(body.ideas_per_technique ?? 4),
    });

    const sent = { n: 0 };
    const result = await runBrainstormAgent(query, (trace) => streamProgress(res, trace, sent));

    writeEvent(res, {
      type: "result",
      data: {
        report: result.report,
        techniquesUsed: result.techniquesUsed,
        traceSummary: { llmCalls: result.trace.totalLLMCalls, toolCalls: result.trace.totalToolCalls, cost: result.trace.totalCost },
      },
    });
  } catch (err) {
    writeEvent(res, { type: "error", message: err instanceof Error ? err.message : String(err) });
  }
  res.end();
}

async function serveStatic(res: ServerResponse, path: string, contentType: string): Promise<void> {
  try {
    const data = await readFile(join(PUBLIC_DIR, path));
    res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-cache" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  if (method === "GET" && (url === "/" || url === "/index.html")) {
    void serveStatic(res, "index.html", "text/html; charset=utf-8");
    return;
  }
  if (method === "GET" && url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, mockMode: env.isMockMode, model: env.model }));
    return;
  }
  if (method === "POST" && url === "/api/research") {
    void handleResearch(req, res);
    return;
  }
  if (method === "POST" && url === "/api/knowledge") {
    void handleKnowledge(req, res);
    return;
  }
  if (method === "POST" && url === "/api/brainstorm") {
    void handleBrainstorm(req, res);
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n🌐 Capstone UI ready at http://localhost:${PORT}`);
  console.log(`   ${infoModeMessage()}`);
  console.log(`   Press Ctrl+C to stop\n`);
});
